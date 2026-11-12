import { z } from "zod";

export const MAX_ROSTER_ROWS = 500;
export const MAX_ROSTER_TEXT = 100_000;
export type RosterFormat = "emails" | "csv";
export type RosterPreview = {
  emails: string[];
  invalid: { row: number; value: string }[];
  duplicates: number;
};
export type RosterResult = { email: string; status: "added" | "already-member" | "pending" | "already-pending" };
export type PendingStudent = { email: string; created_at: string };

export function rosterEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && z.email().safeParse(email).success ? email : null;
}

/** RFC-style quoting, including escaped quotes and newlines inside a cell. */
function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === ",") {
      row.push(cell); cell = ""; closed = false;
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = ""; closed = false;
    } else if (char === '"') {
      if (cell.trim() || closed) throw new Error("CSV has an unexpected quote. Check the exported file.");
      cell = ""; quoted = true;
    } else {
      if (closed && char.trim()) throw new Error("CSV has text after a closing quote.");
      if (!closed) cell += char;
    }
  }
  if (quoted) throw new Error("CSV has an unclosed quoted cell.");
  row.push(cell); rows.push(row);
  return rows;
}

/** Shared by the preview and API: preview never determines database permissions. */
export function parseRoster(text: string, format: RosterFormat): RosterPreview {
  if (text.length > MAX_ROSTER_TEXT) throw new Error("The list is too large. Import at most 500 rows at a time.");
  text = text.replace(/^\uFEFF/, "");
  let entries: { row: number; value: string }[];
  if (format === "csv") {
    const rows = csvRows(text);
    const header = rows.shift() ?? [];
    const columns = header.map((cell) => cell.trim().toLowerCase());
    const index = columns.indexOf("email");
    if (index < 0 || columns.lastIndexOf("email") !== index) throw new Error('CSV must have exactly one column named "email". Other columns are ignored.');
    entries = rows.flatMap((row, i) => row.every((cell) => !cell.trim()) ? [] : [{ row: i + 2, value: row[index] ?? "" }]);
  } else {
    entries = text.split(/[\s,;]+/).filter(Boolean).map((value, i) => ({ row: i + 1, value }));
  }
  if (!entries.length) throw new Error("Add at least one email address.");
  if (entries.length > MAX_ROSTER_ROWS) throw new Error("Import at most 500 rows at a time. Split this list into smaller files.");
  const emails = new Set<string>();
  const invalid: RosterPreview["invalid"] = [];
  let duplicates = 0;
  for (const entry of entries) {
    const email = rosterEmail(entry.value);
    if (!email) invalid.push({ ...entry, value: entry.value.slice(0, 160) });
    else if (emails.has(email)) duplicates++;
    else emails.add(email);
  }
  return { emails: [...emails], invalid, duplicates };
}
