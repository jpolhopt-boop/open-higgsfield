import { create } from "zustand";

/** Most separate requests one press may send in per-photo mode — each is a real,
    billable platform request. */
export const MAX_PER_PHOTO = 50;

type PerPhotoState = {
  /** Send one request per attached reference photo instead of one request that
      carries them all. Never persisted: a fresh page is always a single run. */
  on: boolean;
  setOn: (on: boolean) => void;
};

export const usePerPhoto = create<PerPhotoState>()((set) => ({
  on: false,
  setOn: (on) => set({ on }),
}));
