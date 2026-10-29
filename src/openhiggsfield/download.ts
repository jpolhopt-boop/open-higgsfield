import { useDownloadFormat } from "@/generation/stores/download-format";

import { cutOut } from "./cutout";
import type { RunRecord } from "./history";
import { ensureFolderAccess, saveToFolder } from "./save-folder";

let failure: "cdn" | "cutout" | "folder" = "cdn";

/** Why the last saveFile returned false, in words for the error strip. */
export function saveFailureNote(): string {
  if (failure === "folder") {
    return "Could not write to the chosen save folder (access refused or the folder is gone). Choose the folder again in the save-location button at the top, or switch back to Downloads.";
  }
  return failure === "cutout"
    ? "The background could not be removed (the cut-out tool or its model did not load). Check the connection and retry, or turn off PNG transparent."
    : "The platform’s CDN refused the read, so this run could not be saved. Open it to save it from the browser instead.";
}

/* Result media is served from the platform's own CDN, so an <a download>
   pointed at it is ignored — the attribute only names a file when the href is
   same-origin. The bytes have to be read first, which means the CDN's CORS
   policy decides whether a run can be saved at all. A refusal is reported
   rather than papered over with a new tab the popup blocker would eat. */
export async function saveFile(url: string, name: string): Promise<boolean> {
  failure = "folder";
  /* First, while the click is fresh: a chosen folder needs its write access
     confirmed again after a reload. Refused means stop, not "download elsewhere". */
  if (!(await ensureFolderAccess())) return false;
  failure = "cdn";
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return false;
    let blob = await response.blob();
    /* With "PNG transparent" on, an image is cut out before it is saved. A
       failed cut-out is a failure, never a quiet save of the original: the
       file would still carry the painted background. */
    if (useDownloadFormat.getState().cutout && blob.type.startsWith("image/")) {
      failure = "cutout";
      blob = await cutOut(blob);
      name = name.replace(/\.\w+$/, "") + ".png";
    }
    failure = "folder";
    const inFolder = await saveToFolder(blob, name);
    if (inFolder !== null) return inFolder;
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = name;
    link.click();
    /* Revoking on the next tick races Safari, which reads the blob after the
       click returns. The handle costs nothing until then. */
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
    return true;
  } catch {
    return false;
  }
}

/** A saved run has to be findable in a downloads folder six months later, so
    the name carries the prompt rather than the platform's request id. */
export function fileNameFor(record: RunRecord, index: number): string {
  const url = record.urls[0] ?? "";
  const ext = /\.([a-z0-9]{2,4})(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase();
  /* A result made from a photo is named after it: "case.jpg" -> "case_(Generated)". */
  const source = record.sourceName
    ?.replace(/\.\w{2,5}$/, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim();
  if (source) return `${source}_(Generated).${ext ?? (record.kind === "video" ? "mp4" : "png")}`;
  const slug =
    record.prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 44)
      .replace(/-+$/, "") || "run";
  return `openhiggsfield-${slug}-${index + 1}.${ext ?? (record.kind === "video" ? "mp4" : "png")}`;
}
