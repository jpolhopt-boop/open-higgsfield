import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "./browser-storage";

/** Most uploads whose file names are remembered; the oldest drop first. */
const KEEP = 400;

type SourceNamesState = {
  /** Upload URL -> the file name it was picked or pasted with. A generated
      picture is saved under its source's name, and the platform's request only
      carries the URL. */
  byUrl: Record<string, string>;
  remember: (url: string, name: string) => void;
};

export const useSourceNames = create<SourceNamesState>()(
  persist(
    (set) => ({
      byUrl: {},
      remember: (url, name) =>
        set((state) => {
          const entries = Object.entries({ ...state.byUrl, [url]: name });
          return { byUrl: Object.fromEntries(entries.slice(-KEEP)) };
        }),
    }),
    { name: "openhiggsfield.sourceNames.v1", storage: browserStorage() },
  ),
);
