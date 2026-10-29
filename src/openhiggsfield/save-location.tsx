"use client";

import { useEffect, useRef, useState } from "react";

import { FolderIcon } from "./icons";
import { folderPickerSupported, useSaveFolder } from "./save-folder";

/** Where downloads go: the browser's Downloads, or a folder picked here. */
export function SaveLocation() {
  const { name, load, choose, clear } = useSaveFolder();
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSupported(folderPickerSupported());
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  return (
    <div className="ohf-saveloc" ref={wrap}>
      <button
        type="button"
        className="ohf-key"
        data-ready={name ? true : undefined}
        aria-expanded={open}
        aria-label="Save location"
        title={name ? `Downloads go to: ${name}` : "Choose where downloads are saved"}
        onClick={() => setOpen((value) => !value)}
      >
        <FolderIcon />
        {name && <span className="ohf-key-text">{name}</span>}
      </button>
      {open && (
        <div className="ohf-popover ohf-saveloc-pop" role="dialog" aria-label="Save location">
          <p className="ohf-saveloc-now">
            Saving to: <strong>{name ?? "the browser’s Downloads folder"}</strong>
          </p>
          {supported ? (
            <>
              <button
                type="button"
                className="ohf-prompts-btn"
                onClick={() => {
                  setError(null);
                  void choose()
                    .then(() => setOpen(false))
                    .catch(() => setError("Could not use that folder. Pick another one."));
                }}
              >
                {name ? "Choose another folder…" : "Choose a folder…"}
              </button>
              {name && (
                <button
                  type="button"
                  className="ohf-prompts-btn"
                  onClick={() => {
                    void clear().then(() => setOpen(false));
                  }}
                >
                  Use Downloads again
                </button>
              )}
              {error && <p className="ohf-prompts-hint">{error}</p>}
              <p className="ohf-prompts-hint">
                Files are saved straight into the folder, named after the source photo. A name already taken gets (2), (3)…
              </p>
            </>
          ) : (
            <p className="ohf-prompts-hint">
              This browser cannot pick a folder (it works in Chrome or Edge on a computer). To be asked where each file
              goes, turn on “Ask where to save each file” in the browser’s download settings.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
