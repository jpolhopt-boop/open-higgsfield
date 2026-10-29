"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { MediaItem, MediaRole, ModelEntry } from "@/generation/catalog";
import { useImageMedia, useVideoMedia } from "@/generation/stores/media";
import { MAX_PER_PHOTO, usePerPhoto } from "@/generation/stores/per-photo";
import { uploadMedia } from "@/generation/upload";

import { ROLE_ACCEPT, ROLE_LABELS, ROLE_TAGS, rolesOf } from "./data";
import { AudioIcon, CloseIcon, VideoIcon } from "./icons";
import { kindOfFile, loadUploads, mergeUploads, rememberUpload, saveUploads, type UploadRecord } from "./uploads";

const IMAGE_ROLES: MediaRole[] = ["start", "reference", "end"];
/** Most images one folder puts on the shelf — each is a real upload. */
const SHELF_LIMIT = 40;

/** Every file under a dropped file or folder, depth first. */
async function filesOf(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) =>
      (entry as FileSystemFileEntry).file(
        (file) => resolve([file]),
        () => resolve([]),
      ),
    );
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children: FileSystemEntry[] = [];
  /* readEntries hands back a page at a time; an empty page ends the folder. */
  for (;;) {
    const page = await new Promise<FileSystemEntry[]>((resolve) =>
      reader.readEntries(resolve, () => resolve([])),
    );
    if (page.length === 0) break;
    children.push(...page);
  }
  return (await Promise.all(children.map(filesOf))).flat();
}

/** Sorted by path so a folder of numbered frames keeps its order. */
function imageFiles(list: FileList | null): File[] {
  return Array.from(list ?? [])
    .filter((file) => file.type.startsWith("image/"))
    .sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true }));
}

function useMedia(model: ModelEntry) {
  const imageMedia = useImageMedia();
  const videoMedia = useVideoMedia();
  return model.surface === "image" ? imageMedia : videoMedia;
}

export interface MediaTray {
  roles: MediaRole[];
  /** The current surface's attachments, so the picker can derive its own caps
      from the same list the strip below renders. */
  items: MediaItem[];
  /** Every file this browser has sent to Blob, newest first. */
  uploads: UploadRecord[];
  /** The URL of the last file uploaded from the picker. It goes onto the shelf
      and into the panel's selection, not onto the plane — the panel stages the
      whole set and one press applies it. */
  staged: string | null;
  uploading: boolean;
  allFull: boolean;
  /** Hidden file input; render it once inside the composer. */
  input: ReactNode;
  /** Hidden folder input, rendered beside `input`. */
  folderInput: ReactNode;
  /** Open the OS folder picker: every image inside is uploaded to the shelf and
      as many as fit the model's slots are attached. */
  beginFolder: () => void;
  /** Set the role the next file takes, then open the OS picker. */
  begin: (role: MediaRole) => void;
  /** Make the role's inputs exactly these URLs — the picker hands back the set
      it edited, so one press both attaches and detaches. */
  apply: (role: MediaRole, urls: string[]) => void;
}

export function useMediaTray(
  model: ModelEntry,
  onError: (message: string | null) => void,
): MediaTray {
  const media = useMedia(model);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [staged, setStaged] = useState<string | null>(null);
  const [uploadsLoaded, setUploadsLoaded] = useState(false);
  const roleRef = useRef<MediaRole>("reference");
  const inputRef = useRef<HTMLInputElement>(null);

  /* Read once, then write back on every change — the same order history takes,
     and for the same reason: writing before the read has landed would persist
     the empty initial value over the stored shelf. */
  useEffect(() => {
    let live = true;
    void loadUploads()
      .then((rows) => {
        if (!live) return;
        setUploads((current) => mergeUploads(rows, current));
        setUploadsLoaded(true);
      })
      .catch(() => {
        if (live) setUploadsLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (uploadsLoaded) void saveUploads(uploads);
  }, [uploadsLoaded, uploads]);

  const roles = rolesOf(model);
  const counts: Record<string, number> = {};
  for (const role of roles) {
    counts[role] = media.items.filter((item) => item.role === role).length;
  }
  const allFull = roles.length > 0 && roles.every((role) => counts[role]! >= (model.roles[role] ?? 0));

  async function onFile(file: File | undefined, stage = true): Promise<string | null> {
    if (!file) return null;
    onError(null);
    setUploading(true);
    try {
      const uploaded = await uploadMedia(file);
      /* The file outlives this run: it joins the shelf the picker offers, so a
         reference used once can be reached again without a second upload. */
      if (stage) setStaged(uploaded.url);
      setUploads((prev) =>
        rememberUpload(prev, {
          id: crypto.randomUUID(),
          url: uploaded.url,
          kind: kindOfFile(file),
          name: file.name,
          createdAt: Date.now(),
        }),
      );
      return uploaded.url;
    } catch (caught) {
      onError(
        caught instanceof Error
          ? `Upload failed — ${caught.message}. Retry, or use a smaller file.`
          : "Upload failed. Retry, or drop the file and generate from the prompt alone.",
      );
    } finally {
      setUploading(false);
    }
    return null;
  }

  /* A screenshot pasted anywhere on the page becomes an input: it uploads like
     a picked file and attaches to the first image slot with room. The ref keeps
     the listener on the latest model and attachments without re-binding it. */
  const pasteRef = useRef<(files: File[], whole?: boolean) => void>(() => {});
  useEffect(() => {
    pasteRef.current = (files, whole = false) => {
      /* Hand each image the next free image slot, counting the ones this same
         batch has already claimed. Files past the last slot are left out. */
      /* One image can be a first frame; several are references. A start frame
         switches most models to image-to-video, where the references are
         dropped, so a batch never takes start/end while references exist. */
      const multi = files.length > 1 && (model.roles.reference ?? 0) > 0;
      const free: MediaRole[] = [];
      for (const role of multi ? (["reference"] as MediaRole[]) : IMAGE_ROLES) {
        const room = (model.roles[role] ?? 0) - (counts[role] ?? 0);
        for (let i = 0; i < room; i++) free.push(role);
      }
      if (free.length === 0) {
        onError(
          roles.some((role) => IMAGE_ROLES.includes(role))
            ? "Image slots are full — remove one to add another."
            : "This model takes no image input.",
        );
        return;
      }
      /* A folder goes onto the shelf whole (up to SHELF_LIMIT); only what fits
         the slots is attached, the rest waits in the picker. */
      const take = whole ? Math.min(files.length, SHELF_LIMIT) : Math.min(files.length, free.length);
      void (async () => {
        for (const [index, file] of files.slice(0, take).entries()) {
          const url = await onFile(file, false);
          if (url && index < free.length) media.add({ id: crypto.randomUUID(), url, role: free[index]! });
        }
        if (whole && files.length > free.length) {
          onError(
            `${Math.min(files.length, free.length)} attached; ${take - free.length > 0 ? take - free.length : 0} more on your shelf — pick them from the + menu.`,
          );
        } else if (!whole && files.length > free.length) {
          onError(`Only ${free.length} of ${files.length} images fit this model's slots.`);
        }
      })();
    };
  });
  useEffect(() => {
    const imagesIn = (transfer: DataTransfer | null) =>
      Array.from(transfer?.files ?? []).filter((file) => file.type.startsWith("image/"));
    const carriesFiles = (transfer: DataTransfer | null) =>
      Array.from(transfer?.types ?? []).includes("Files");

    function onPaste(event: ClipboardEvent) {
      const files = imagesIn(event.clipboardData);
      if (files.length === 0) return;
      event.preventDefault();
      pasteRef.current(files);
    }
    /* Dropping anywhere on the page works; dragover must be cancelled or the
       browser opens the file instead of firing drop. */
    function onDragOver(event: DragEvent) {
      if (carriesFiles(event.dataTransfer)) event.preventDefault();
    }
    function onDrop(event: DragEvent) {
      const transfer = event.dataTransfer;
      if (!carriesFiles(transfer)) return;
      event.preventDefault();
      /* Entries must be read synchronously; the walk below finishes later. */
      const entries = Array.from(transfer?.items ?? [])
        .map((item) => item.webkitGetAsEntry?.())
        .filter((entry): entry is FileSystemEntry => !!entry);
      if (entries.some((entry) => entry.isDirectory)) {
        void Promise.all(entries.map(filesOf)).then((groups) => {
          const files = groups.flat().filter((file) => file.type.startsWith("image/"));
          if (files.length > 0) pasteRef.current(files, true);
        });
        return;
      }
      const files = imagesIn(transfer);
      if (files.length > 0) pasteRef.current(files);
    }
    document.addEventListener("paste", onPaste);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, []);

  /* accept is set on the element rather than through state: the picker opens in
     the same tick as the choice, before React could re-render it. */
  function begin(role: MediaRole) {
    const element = inputRef.current;
    if (!element) return;
    roleRef.current = role;
    element.accept = ROLE_ACCEPT[role];
    element.click();
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        void onFile(file);
      }}
    />
  );

  /* A replace, not an append: the panel edits one role's whole set, so what it
     hands back decides both what arrives and what leaves. Rows whose URL
     survives keep their id, and with it their place in the strip. */
  function apply(role: MediaRole, urls: string[]) {
    const keep = new Set(urls);
    const held = new Set<string>();
    for (const item of media.items) {
      if (item.role !== role) continue;
      if (keep.has(item.url)) held.add(item.url);
      else media.remove(item.id);
    }
    for (const url of urls) {
      if (!held.has(url)) media.add({ id: crypto.randomUUID(), url, role });
    }
  }

  const folderInputRef = useRef<HTMLInputElement>(null);
  const folderInput = (
    <input
      ref={folderInputRef}
      type="file"
      hidden
      multiple
      {...{ webkitdirectory: "" }}
      onChange={(event) => {
        const files = imageFiles(event.target.files);
        event.target.value = "";
        if (files.length === 0) onError("No images found in that folder.");
        else pasteRef.current(files, true);
      }}
    />
  );
  const beginFolder = () => folderInputRef.current?.click();

  return {
    roles,
    items: media.items,
    uploads,
    staged,
    uploading,
    allFull,
    input,
    folderInput,
    begin,
    beginFolder,
    apply,
  };
}

/** Attached inputs, above the prompt — the frames read before the words do. */
export function MediaStrip({ model }: { model: ModelEntry }) {
  const media = useMedia(model);
  const perPhoto = usePerPhoto();
  const items = media.items.filter((item) => model.roles[item.role]);
  if (items.length === 0) return null;
  const photos = items.filter((item) => item.role === "reference").length;

  return (
    <>
    {items.length > 1 && (
      <div className="ohf-strip-head">
        {photos > 1 ? (
          <label className="ohf-perphoto">
            <input type="checkbox" checked={perPhoto.on} onChange={(event) => perPhoto.setOn(event.target.checked)} />
            One run per photo — {Math.min(photos, MAX_PER_PHOTO)} separate requests, each billed
          </label>
        ) : (
          <span />
        )}
        <button type="button" className="ohf-strip-clear" onClick={() => media.clear()}>
          Clear all ({items.length})
        </button>
      </div>
    )}
    <ul className="ohf-strip">
      {items.map((item) => (
        <li key={item.id} className="ohf-strip-item">
          <span className="ohf-strip-tile">
            {item.role === "audio" || item.role === "video" ? (
              <span className="ohf-strip-glyph">
                {item.role === "audio" ? <AudioIcon size={20} /> : <VideoIcon size={20} />}
              </span>
            ) : (
              /* Blob-hosted user upload; next/image would proxy an arbitrary
                 remote host for a 56px thumb. */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className="ohf-strip-thumb"
                src={item.url}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.visibility = "hidden";
                }}
              />
            )}
            <span className="ohf-strip-tag">{ROLE_TAGS[item.role]}</span>
          </span>
          <button
            type="button"
            className="ohf-strip-remove"
            aria-label={`Remove ${ROLE_LABELS[item.role].toLowerCase()}`}
            onClick={() => media.remove(item.id)}
          >
            <CloseIcon size={10} />
          </button>
        </li>
      ))}
    </ul>
    </>
  );
}
