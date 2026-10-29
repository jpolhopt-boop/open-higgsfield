"use client";

import { useState } from "react";

import type { Surface } from "@/generation/catalog";
import { useSavedPrompts } from "@/generation/stores/saved-prompts";

import { CloseIcon, TrashIcon } from "./icons";

/** The visitor's named prompts. Saving takes the words currently in the
    composer; using one puts them back, ready to edit before Generate. */
export function PromptLibrary({
  surface,
  text,
  onUse,
  onClose,
}: {
  surface: Surface;
  /** What the composer holds now — the thing "Save" keeps. */
  text: string;
  onUse: (text: string) => void;
  onClose: () => void;
}) {
  const prompts = useSavedPrompts((state) => state.prompts);
  const save = useSavedPrompts((state) => state.save);
  const remove = useSavedPrompts((state) => state.remove);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");

  const mine = prompts.filter(
    (row) =>
      row.surface === surface &&
      `${row.name} ${row.text}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const canSave = name.trim().length > 0 && text.trim().length > 0;

  return (
    <div className="ohf-popover ohf-prompts" role="dialog" aria-label="Saved prompts">
      <div className="ohf-prompts-head">
        <strong>Saved prompts</strong>
        <button type="button" className="ohf-icon-btn ohf-icon-btn--ghost" aria-label="Close" onClick={onClose}>
          <CloseIcon size={12} />
        </button>
      </div>

      <form
        className="ohf-prompts-save"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          save(name, text, surface);
          setName("");
        }}
      >
        <input
          className="ohf-prompts-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name this prompt (e.g. Case, white background)"
          aria-label="Prompt name"
          maxLength={60}
        />
        <button type="submit" className="ohf-prompts-btn" disabled={!canSave}>
          Save current
        </button>
      </form>
      {text.trim().length === 0 && <p className="ohf-prompts-hint">Write a prompt in the composer first, then name and save it.</p>}

      {prompts.some((row) => row.surface === surface) && (
        <input
          className="ohf-prompts-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or words"
          aria-label="Search saved prompts"
        />
      )}

      <ul className="ohf-prompts-list">
        {mine.map((row) => (
          <li key={row.id} className="ohf-prompts-row">
            <button
              type="button"
              className="ohf-prompts-use"
              onClick={() => {
                onUse(row.text);
                onClose();
              }}
              title="Use this prompt"
            >
              <span className="ohf-prompts-name">{row.name}</span>
              <span className="ohf-prompts-text">{row.text}</span>
            </button>
            <button
              type="button"
              className="ohf-icon-btn ohf-icon-btn--ghost"
              aria-label={`Delete ${row.name}`}
              title="Delete"
              onClick={() => remove(row.id)}
            >
              <TrashIcon size={13} />
            </button>
          </li>
        ))}
        {mine.length === 0 && (
          <li className="ohf-prompts-empty">
            {prompts.some((row) => row.surface === surface) ? "No match." : `No saved ${surface} prompts yet.`}
          </li>
        )}
      </ul>
    </div>
  );
}
