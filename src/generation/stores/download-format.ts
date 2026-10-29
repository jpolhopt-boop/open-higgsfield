import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "./browser-storage";

type DownloadFormatState = {
  /** Saved images come out as a PNG with the background removed, instead of the
      file the platform delivered. Applies when downloading, not when generating. */
  cutout: boolean;
  setCutout: (cutout: boolean) => void;
};

export const useDownloadFormat = create<DownloadFormatState>()(
  persist(
    (set) => ({
      cutout: false,
      setCutout: (cutout) => set({ cutout }),
    }),
    { name: "openhiggsfield.downloadFormat.v1", storage: browserStorage() },
  ),
);
