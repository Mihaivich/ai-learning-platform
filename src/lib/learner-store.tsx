"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { LearnerProgressSync, type ProgressMap, type ProgressSnapshot, type ProgressSyncStatus } from "./learner-sync";
import type { BlockResult, LearnerProfile } from "@/lib/types";

interface LearnerState {
  ready: boolean;
  user: User | null;
  profile: LearnerProfile | null;
  saveProfile: (profile: LearnerProfile) => Promise<void>;
  progress: ProgressMap;
  syncStatus: ProgressSyncStatus;
  retrySync: () => Promise<void>;
  recordBlock: (courseId: string, lessonId: string, blockId: string, result: BlockResult) => void;
  completeLesson: (courseId: string, lessonId: string) => void;
  noteServerLessonComplete: (courseId: string, lessonId: string) => void;
  logEvent: (courseId: string, lessonId: string | null, eventType: string, payload?: object) => void;
  signOut: () => Promise<void>;
}

const PROFILE_KEY = "learner-profile";
const LearnerContext = createContext<LearnerState | null>(null);
const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
};
const emptySnapshot: ProgressSnapshot = {
  progress: {},
  status: { pending: 0, syncing: false, error: "", localSaved: true },
};

function readProfile(key: string): LearnerProfile | null {
  try {
    const raw = browserStorage.getItem(key);
    return raw ? JSON.parse(raw) as LearnerProfile : null;
  } catch {
    return null;
  }
}

function writeProfile(key: string, value: LearnerProfile) {
  try {
    browserStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The current profile remains available in memory.
  }
}

export function LearnerProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [sync, setSync] = useState<LearnerProgressSync | null>(null);
  const [snapshot, setSnapshot] = useState(emptySnapshot);

  useEffect(() => {
    const db = getSupabase();
    let active = true;
    let epoch = 0;
    let authVersion = 0;
    let currentId: string | null | undefined;
    let currentSync: LearnerProgressSync | null = null;

    function beginSession(nextUser: User | null) {
      if (!active) return;
      const id = nextUser?.id ?? null;
      if (currentId === id) {
        setUser(nextUser);
        return;
      }
      currentId = id;
      const sessionEpoch = ++epoch;
      currentSync?.dispose();
      setReady(false);
      setUser(nextUser);
      setProfile(readProfile(id ? `${PROFILE_KEY}:${id}` : PROFILE_KEY));
      const nextSync = new LearnerProgressSync({
        db: id ? db : null,
        userId: id,
        storage: browserStorage,
        onChange: setSnapshot,
      });
      currentSync = nextSync;
      setSync(nextSync);
      setSnapshot(nextSync.snapshot);
      if (!id || !db) {
        setReady(true);
        return;
      }

      // Return from Supabase auth callbacks before starting database queries.
      setTimeout(() => {
        if (!active || epoch !== sessionEpoch) return;
        const loadProfile = async () => {
          try {
            const { data: row } = await db!.from("profiles").select("*").eq("id", id).maybeSingle();
            if (!active || epoch !== sessionEpoch || !row?.background) return;
            const remote: LearnerProfile = {
              displayName: row.display_name ?? "",
              background: row.background,
              experience: row.experience,
              goal: row.goal,
              language: row.language ?? "en",
            };
            setProfile(remote);
            writeProfile(`${PROFILE_KEY}:${id}`, remote);
          } catch {
            // Keep this account's cached profile while offline.
          }
        };
        void Promise.all([nextSync.initialize(), loadProfile()]).then(() => {
          if (active && epoch === sessionEpoch) setReady(true);
        });
      }, 0);
    }

    if (!db) {
      beginSession(null);
      return () => { active = false; currentSync?.dispose(); };
    }
    const initialVersion = authVersion;
    void db.auth.getUser().then(({ data }) => {
      if (authVersion === initialVersion) beginSession(data.user);
    }).catch(() => {
      if (authVersion === initialVersion) beginSession(null);
    });
    const { data: subscription } = db.auth.onAuthStateChange((_event, session) => {
      authVersion++;
      beginSession(session?.user ?? null);
    });
    return () => {
      active = false;
      epoch++;
      currentSync?.dispose();
      subscription.subscription.unsubscribe();
    };
  }, []);

  const saveProfile = useCallback(async (next: LearnerProfile) => {
    setProfile(next);
    writeProfile(user ? `${PROFILE_KEY}:${user.id}` : PROFILE_KEY, next);
    const db = getSupabase();
    if (db && user) {
      await db.from("profiles").upsert({
        id: user.id,
        display_name: next.displayName,
        background: next.background,
        experience: next.experience,
        goal: next.goal,
        language: next.language,
        updated_at: new Date().toISOString(),
      });
    }
  }, [user]);

  const logEvent = useCallback((courseId: string, lessonId: string | null, eventType: string, payload: object = {}) => {
    if (ready) void sync?.logEvent(courseId, lessonId, eventType, payload);
  }, [sync, ready]);

  const recordBlock = useCallback((courseId: string, lessonId: string, blockId: string, result: BlockResult) => {
    if (!ready) return;
    sync?.update(courseId, lessonId, previous => ({
      ...previous, blocks: { ...previous.blocks, [blockId]: result },
    }));
    logEvent(courseId, lessonId, "block_completed", { blockId, ...result });
  }, [sync, ready, logEvent]);

  const noteServerLessonComplete = useCallback((courseId: string, lessonId: string) => {
    if (!ready) return;
    sync?.update(courseId, lessonId, previous => ({
      ...previous, completedAt: previous.completedAt ?? new Date().toISOString(),
    }));
  }, [sync, ready]);

  const completeLesson = useCallback((courseId: string, lessonId: string) => {
    noteServerLessonComplete(courseId, lessonId);
    logEvent(courseId, lessonId, "lesson_completed");
  }, [noteServerLessonComplete, logEvent]);

  const retrySync = useCallback(async () => { await sync?.retry(); }, [sync]);
  const signOut = useCallback(async () => {
    // Auth state change owns cleanup; failed sign-out keeps the session usable.
    const db = getSupabase();
    if (!db) return;
    const { error } = await db.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<LearnerState>(() => ({
    ready, user, profile, saveProfile, progress: snapshot.progress,
    syncStatus: snapshot.status, retrySync, recordBlock, completeLesson,
    noteServerLessonComplete, logEvent, signOut,
  }), [ready, user, profile, saveProfile, snapshot, retrySync, recordBlock, completeLesson, noteServerLessonComplete, logEvent, signOut]);

  return <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>;
}

export function useLearner() {
  const context = useContext(LearnerContext);
  if (!context) throw new Error("useLearner must be used inside LearnerProvider");
  return context;
}
