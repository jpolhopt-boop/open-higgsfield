import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Surface } from "../catalog/types";
import { browserStorage } from "./browser-storage";

/** A prompt the visitor kept under a name of their own, to reuse later. */
export interface SavedPrompt {
  id: string;
  /** The identification: what the visitor calls it, shown in the library. */
  name: string;
  text: string;
  /** The surface it was written on, so the library offers image prompts to the
      image composer and video prompts to the video one. */
  surface: Surface;
  createdAt: number;
}

type SavedPromptsState = {
  prompts: SavedPrompt[];
  /** Saving under a name that already exists replaces that prompt's text. */
  save: (name: string, text: string, surface: Surface) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  /** Backup import: keeps what is here, adds what is new by id. */
  merge: (incoming: SavedPrompt[]) => void;
};

function isSavedPrompt(value: unknown): value is SavedPrompt {
  if (value === null || typeof value !== "object") return false;
  const row = value as Partial<SavedPrompt>;
  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    typeof row.text === "string" &&
    (row.surface === "image" || row.surface === "video") &&
    typeof row.createdAt === "number"
  );
}

export const useSavedPrompts = create<SavedPromptsState>()(
  persist(
    (set) => ({
      prompts: [],
      save: (name, text, surface) =>
        set((state) => {
          const label = name.trim();
          const body = text.trim();
          if (!label || !body) return state;
          const same = state.prompts.find(
            (row) => row.surface === surface && row.name.toLowerCase() === label.toLowerCase(),
          );
          if (same) {
            return {
              prompts: state.prompts.map((row) => (row.id === same.id ? { ...row, text: body } : row)),
            };
          }
          return {
            prompts: [
              { id: crypto.randomUUID(), name: label, text: body, surface, createdAt: Date.now() },
              ...state.prompts,
            ],
          };
        }),
      rename: (id, name) =>
        set((state) => {
          const label = name.trim();
          if (!label) return state;
          return { prompts: state.prompts.map((row) => (row.id === id ? { ...row, name: label } : row)) };
        }),
      remove: (id) => set((state) => ({ prompts: state.prompts.filter((row) => row.id !== id) })),
      merge: (incoming) =>
        set((state) => {
          const held = new Set(state.prompts.map((row) => row.id));
          const added = incoming.filter(isSavedPrompt).filter((row) => !held.has(row.id));
          return { prompts: [...state.prompts, ...added].sort((a, b) => b.createdAt - a.createdAt) };
        }),
    }),
    {
      name: "openhiggsfield.savedPrompts.v1",
      storage: browserStorage(),
      partialize: (state) => ({ prompts: state.prompts }),
    },
  ),
);
