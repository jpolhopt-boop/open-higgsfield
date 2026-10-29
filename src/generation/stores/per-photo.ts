import { create } from "zustand";

/** Most separate requests one press may send in per-photo mode — each is a real,
    billable platform request. */
export const MAX_PER_PHOTO = 50;

type PerPhotoState = {
  /** Send one request per attached reference photo instead of one request that
      carries them all. On by default, so several photos mean several runs; the
      checkbox turns it off. Not persisted. Generate still asks before sending. */
  on: boolean;
  setOn: (on: boolean) => void;
};

export const usePerPhoto = create<PerPhotoState>()((set) => ({
  on: true,
  setOn: (on) => set({ on }),
}));
