import { create } from "zustand";

import { defaultKv } from "./idb";

/* Saving to a folder the visitor picked, instead of the browser's Downloads.
   Uses the File System Access API (Chrome and Edge on a computer): the folder
   handle is kept in IndexedDB, and the browser asks once per session to allow
   writing to it again. Elsewhere the control says so and downloads go as usual. */

type FileHandle = {
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
};
type DirHandle = {
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>;
  queryPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
};
type Picker = (options?: { id?: string; mode?: "readwrite" }) => Promise<DirHandle>;

const KEY = "saveFolder.v1";

export function folderPickerSupported(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as { showDirectoryPicker?: Picker }).showDirectoryPicker === "function";
}

type State = {
  /** Name of the chosen folder, or null while downloads go to the browser's own. */
  name: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  choose: () => Promise<void>;
  clear: () => Promise<void>;
};

async function stored(): Promise<DirHandle | undefined> {
  try {
    return await defaultKv().get<DirHandle>(KEY);
  } catch {
    return undefined;
  }
}

export const useSaveFolder = create<State>()((set) => ({
  name: null,
  loaded: false,
  load: async () => {
    const handle = await stored();
    set({ name: handle?.name ?? null, loaded: true });
  },
  choose: async () => {
    const picker = (window as unknown as { showDirectoryPicker: Picker }).showDirectoryPicker;
    try {
      const handle = await picker({ id: "openhiggsfield-save", mode: "readwrite" });
      await defaultKv().set(KEY, handle);
      set({ name: handle.name });
    } catch (caught) {
      // Closing the picker is not an error.
      if (!(caught instanceof DOMException && caught.name === "AbortError")) throw caught;
    }
  },
  clear: async () => {
    await defaultKv().set(KEY, undefined);
    set({ name: null });
  },
}));

/** Call first thing in a click handler: re-asking for write access needs the
    click that is still "fresh". Returns false when the folder is set but the
    visitor refused access, so the caller can say so instead of downloading
    somewhere else. */
export async function ensureFolderAccess(): Promise<boolean> {
  const handle = await stored();
  if (!handle) return true;
  try {
    if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") return true;
    return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
  } catch {
    return false;
  }
}

/** Writes into the chosen folder; null when none is chosen. Never overwrites:
    a name already taken gets " (2)", " (3)"… before the extension. */
export async function saveToFolder(blob: Blob, name: string): Promise<boolean | null> {
  const handle = await stored();
  if (!handle) return null;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let candidate = name;
  for (let n = 2; n < 500; n++) {
    try {
      await handle.getFileHandle(candidate); // exists -> try the next name
      candidate = `${stem} (${n})${ext}`;
    } catch {
      break;
    }
  }
  try {
    const file = await handle.getFileHandle(candidate, { create: true });
    const out = await file.createWritable();
    await out.write(blob);
    await out.close();
    return true;
  } catch {
    return false;
  }
}
