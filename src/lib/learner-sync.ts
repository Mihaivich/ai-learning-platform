import type { SupabaseClient } from "@supabase/supabase-js";
import { isDatabaseCourseId } from "./learning/ids";
import type { BlockResult } from "./types";

export interface LessonProgress {
  completedAt?: string;
  blocks: Record<string, BlockResult>;
}
export type ProgressMap = Record<string, LessonProgress>;
export type ProgressSyncStatus = {
  pending: number;
  syncing: boolean;
  error: string;
  localSaved: boolean;
};
export type ProgressSnapshot = { progress: ProgressMap; status: ProgressSyncStatus };
type Cache = { version: 1; progress: ProgressMap; pending: string[]; legacyPending: string[] };
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
type ProgressRow = {
  course_id: string;
  lesson_id: string;
  completed_at: string | null;
  block_results: Record<string, BlockResult>;
};

const staticLesson = (key: string) => !isDatabaseCourseId(key.split("/")[0]);

function readProgress(value: unknown): ProgressMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, lesson]) =>
    key.includes("/") && lesson && typeof lesson === "object" &&
    lesson.blocks && typeof lesson.blocks === "object" && !Array.isArray(lesson.blocks),
  ));
}

/** Account-scoped progress and a durable queue of static lesson snapshots. */
export class LearnerProgressSync {
  readonly cacheKey: string;
  private progress: ProgressMap = {};
  private pending = new Set<string>();
  private legacyPending = new Set<string>();
  private localSaved = true;
  private error = "";
  private remoteLoaded = false;
  private initialized: boolean;
  private disposed = false;
  private controller = new AbortController();
  private running: Promise<void> | null = null;
  private loading: Promise<void> | null = null;

  constructor(private options: {
    db: SupabaseClient | null;
    userId: string | null;
    storage: Storage;
    onChange: (snapshot: ProgressSnapshot) => void;
  }) {
    this.cacheKey = options.userId ? `learner-progress:${options.userId}` : "learner-progress";
    this.initialized = !options.userId;
    try {
      const raw = options.storage.getItem(this.cacheKey);
      const cache = raw ? JSON.parse(raw) : null;
      if (cache?.version === 1) {
        this.progress = readProgress(cache.progress);
        const keys: unknown[] = Array.isArray(cache.pending) ? cache.pending : [];
        this.pending = new Set(keys.filter((key): key is string =>
          typeof key === "string" && Object.hasOwn(this.progress, key) && staticLesson(key),
        ));
        this.legacyPending = new Set((Array.isArray(cache.legacyPending) ? cache.legacyPending : [])
          .filter((key: unknown): key is string => typeof key === "string" && this.pending.has(key)));
      } else {
        this.progress = readProgress(cache);
        // Old versions never sent the writes. Preserve recoverable static work.
        if (options.userId) this.pending = new Set(Object.keys(this.progress).filter(staticLesson));
        this.legacyPending = new Set(this.pending);
      }
    } catch {
      this.localSaved = false;
    }
  }

  get snapshot(): ProgressSnapshot {
    return {
      progress: this.progress,
      status: {
        pending: this.pending.size,
        syncing: this.running !== null || this.loading !== null,
        error: this.error,
        localSaved: this.localSaved,
      },
    };
  }

  private emit() {
    if (!this.disposed) this.options.onChange(this.snapshot);
  }

  private persist() {
    try {
      const cache: Cache = {
        version: 1, progress: this.progress, pending: [...this.pending], legacyPending: [...this.legacyPending],
      };
      // Snapshot and pending markers are atomic within a single storage entry.
      this.options.storage.setItem(this.cacheKey, JSON.stringify(cache));
      this.localSaved = true;
    } catch {
      this.localSaved = false;
    }
  }

  initialize(): Promise<void> {
    if (this.loading) return this.loading;
    if (this.disposed || !this.options.db || !this.options.userId) return Promise.resolve();
    this.loading = Promise.resolve().then(() => this.loadRemote()).finally(() => {
      this.loading = null;
      this.emit();
    });
    this.emit();
    return this.loading;
  }

  private async loadRemote() {
    const { db, userId } = this.options;
    if (this.disposed || !db || !userId) return;
    try {
      const { data, error } = await db.from("lesson_progress").select("*")
        .eq("user_id", userId).abortSignal(this.controller.signal);
      if (this.disposed) return;
      if (error) throw error;
      const remote: ProgressMap = {};
      for (const row of (data ?? []) as ProgressRow[]) {
        remote[`${row.course_id}/${row.lesson_id}`] = {
          completedAt: row.completed_at ?? undefined,
          blocks: row.block_results ?? {},
        };
      }
      for (const key of this.pending) {
        const local = this.progress[key];
        const saved = remote[key];
        remote[key] = {
          completedAt: saved?.completedAt ?? local.completedAt,
          blocks: this.legacyPending.has(key)
            ? { ...local.blocks, ...saved?.blocks }
            : { ...saved?.blocks, ...local.blocks },
        };
      }
      this.progress = remote;
      this.remoteLoaded = true;
      this.legacyPending.clear();
      this.error = "";
      this.persist();
    } catch {
      if (this.disposed) return;
      this.error = "Could not load saved progress. Retry before syncing your local changes.";
    }
    this.initialized = true;
    this.emit();
    // The provider can render cached progress without waiting for uploads.
    if (this.remoteLoaded) void this.flush();
  }

  update(courseId: string, lessonId: string, change: (previous: LessonProgress) => LessonProgress) {
    if (this.disposed || !this.initialized) return;
    const key = `${courseId}/${lessonId}`;
    this.progress = { ...this.progress, [key]: change(this.progress[key] ?? { blocks: {} }) };
    this.legacyPending.delete(key);
    if (this.options.userId && staticLesson(key)) this.pending.add(key);
    this.persist();
    this.emit();
    if (this.remoteLoaded && !this.error) void this.flush();
  }

  async retry() {
    if (this.disposed) return;
    this.persist();
    this.emit();
    if (!this.remoteLoaded) return this.initialize();
    this.error = "";
    this.emit();
    await this.flush();
  }

  flush(): Promise<void> {
    if (this.running) return this.running;
    if (this.disposed || !this.remoteLoaded || !this.pending.size || !this.options.db || !this.options.userId) {
      return Promise.resolve();
    }
    // Defer execution until the running promise is installed.
    this.running = Promise.resolve().then(async () => {
      const { db, userId } = this.options;
      while (!this.disposed && this.pending.size) {
        const key = this.pending.values().next().value!;
        const lesson = this.progress[key];
        const separator = key.indexOf("/");
        try {
          const { error } = await db!.from("lesson_progress").upsert({
            user_id: userId,
            course_id: key.slice(0, separator),
            lesson_id: key.slice(separator + 1),
            completed_at: lesson.completedAt ?? null,
            block_results: lesson.blocks,
            updated_at: new Date().toISOString(),
          }).abortSignal(this.controller.signal);
          if (this.disposed) return;
          if (error) throw error;
          // Edits made during this request remain queued for a newer write.
          if (this.progress[key] === lesson) this.pending.delete(key);
          this.persist();
        } catch {
          if (!this.disposed) this.error = "Progress could not be synced. Please retry.";
          return;
        }
      }
    }).finally(() => {
      this.running = null;
      this.emit();
    });
    this.emit();
    return this.running;
  }

  async logEvent(courseId: string, lessonId: string | null, eventType: string, payload: object = {}) {
    const { db, userId } = this.options;
    if (this.disposed || !this.initialized || !db || !userId) return;
    try {
      const { error } = await db.from("activity_events").insert({
        user_id: userId, course_id: courseId, lesson_id: lessonId, event_type: eventType, payload,
      }).abortSignal(this.controller.signal);
      if (error && !this.disposed) console.warn("Activity event could not be saved.");
    } catch {
      if (!this.disposed) console.warn("Activity event could not be saved.");
    }
  }

  dispose() {
    this.disposed = true;
    this.controller.abort();
  }
}
