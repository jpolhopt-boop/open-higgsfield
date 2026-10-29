import { useSavedPrompts } from "@/generation/stores/saved-prompts";
import type { SavedPrompt } from "@/generation/stores/saved-prompts";

import { loadHistory, mergeHistory, saveHistory } from "./history";
import type { RunRecord } from "./history";
import { loadUploads, mergeUploads, saveUploads } from "./uploads";
import type { UploadRecord } from "./uploads";

/* The run log and the upload shelf live in this browser only, so moving them to
   another browser or address (localhost to the published site, a phone) goes
   through a file. The file holds prompts, settings and public media links —
   never the platform key, which is not kept in the browser's history. */

interface Backup {
  app: "openhiggsfield";
  version: 1;
  exportedAt: number;
  history: RunRecord[];
  uploads: UploadRecord[];
  /** Absent in backups made before saved prompts existed. */
  prompts?: SavedPrompt[];
}

export async function downloadBackup(): Promise<{ runs: number; uploads: number }> {
  const [history, uploads] = await Promise.all([loadHistory(), loadUploads()]);
  const backup: Backup = {
    app: "openhiggsfield",
    version: 1,
    exportedAt: Date.now(),
    history,
    uploads,
    prompts: useSavedPrompts.getState().prompts,
  };
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `openhiggsfield-history-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  return { runs: history.length, uploads: uploads.length };
}

/** Merges a backup into what this browser already holds (nothing is replaced),
    then the caller reloads so the studio reads the merged log. A run that was
    still in flight is imported as failed: its poll belonged to the old browser. */
export async function importBackup(file: File): Promise<{ runs: number; uploads: number }> {
  let parsed: Partial<Backup>;
  try {
    parsed = JSON.parse(await file.text()) as Partial<Backup>;
  } catch {
    throw new Error("That file is not a valid backup.");
  }
  if (parsed.app !== "openhiggsfield" || !Array.isArray(parsed.history) || !Array.isArray(parsed.uploads)) {
    throw new Error("That file is not an OpenHiggsfield backup.");
  }
  const incoming = (parsed.history as RunRecord[]).map((record) =>
    record.status === "running"
      ? { ...record, status: "failed" as const, error: "Interrupted before it was exported." }
      : record,
  );
  const [history, uploads] = await Promise.all([loadHistory(), loadUploads()]);
  const mergedHistory = mergeHistory(history, incoming);
  const mergedUploads = mergeUploads(uploads, parsed.uploads as UploadRecord[]);
  await saveHistory(mergedHistory);
  await saveUploads(mergedUploads);
  if (Array.isArray(parsed.prompts)) useSavedPrompts.getState().merge(parsed.prompts);
  return { runs: mergedHistory.length, uploads: mergedUploads.length };
}
