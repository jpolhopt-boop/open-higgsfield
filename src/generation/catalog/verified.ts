import type { ModelEntry } from "./types";
import { SOUL_ASPECT } from "./tokens";

/* Entries whose parameters, value lists and media limits were read from the
   official API reference. Where the reference is silent on a limit (reference
   counts), the cap is the one the studio shipped with and is noted below.
   catalog/verification.ts records what is documented, tested or unverified. */

const KLING4_ASPECT = ["16:9", "9:16", "1:1", "21:9", "adaptive"] as const;
const IMAGE_ASPECT_FULL = ["auto", "1:1", "1:2", "2:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16"] as const;
const QWEN_ASPECT = ["1:1", "2:3", "3:2", "3:4", "4:3", "7:9", "9:7", "9:16", "16:9", "21:9"] as const;

/* ---------- Video ---------- */

const kling4Settings = {
  aspectRatio: { type: "enum", values: KLING4_ASPECT, default: "16:9" },
  resolution: { type: "enum", values: ["720p", "1080p"], default: "720p" },
  duration: { type: "range", min: 3, max: 30, default: 5 },
} as const satisfies ModelEntry["settings"];

export const kling4: ModelEntry = {
  id: "kling-4",
  surface: "video",
  label: "Kling 4.0",
  /* Documented: up to 10 reference images and 5 reference videos. */
  roles: { start: 1, end: 1, reference: 10, video: 5 },
  settings: kling4Settings,
};

export const kling4Edit: ModelEntry = {
  id: "kling-4-edit",
  surface: "video",
  label: "Kling 4.0 Edit",
  /* The first video is the one edited; up to 5 more are references. */
  roles: { video: 6, reference: 10 },
  settings: {
    ...kling4Settings,
    aspectRatio: { type: "enum", values: KLING4_ASPECT, default: "adaptive" },
  },
};

export const genjutsu: ModelEntry = {
  id: "genjutsu",
  surface: "video",
  label: "Genjutsu (motion transfer)",
  roles: { video: 1, reference: 8 },
  settings: { resolution: { type: "enum", values: ["480p", "720p", "1080p"], default: "720p" } },
};

export const minimaxH3: ModelEntry = {
  id: "minimax-h3",
  surface: "video",
  label: "MiniMax H3",
  roles: { start: 1, end: 1, reference: 8, video: 3, audio: 3 },
  settings: {
    aspectRatio: {
      type: "enum",
      values: ["auto", "adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "auto",
    },
    resolution: { type: "enum", values: ["2K"], default: "2K" },
    duration: { type: "range", min: 5, max: 15, default: 5 },
  },
};

const wan3Settings = {
  aspectRatio: { type: "enum", values: ["16:9", "4:3", "1:1", "3:4", "9:16", "adaptive"], default: "16:9" },
  resolution: { type: "enum", values: ["480p", "720p", "1080p"], default: "720p" },
  duration: { type: "range", min: 2, max: 30, default: 5 },
  generateAudio: { type: "boolean", default: true },
} as const satisfies ModelEntry["settings"];

/* Documented: up to 5 audio files and 5 reference videos; image count is not stated. */
const wan3Roles = { start: 1, end: 1, reference: 8, video: 5, audio: 5 } as const;

export const wan3: ModelEntry = {
  id: "wan-3",
  surface: "video",
  label: "Wan 3.0",
  roles: wan3Roles,
  settings: wan3Settings,
};

export const wan3Prime: ModelEntry = {
  id: "wan-3-prime",
  surface: "video",
  label: "Wan 3.0 Prime",
  roles: wan3Roles,
  settings: wan3Settings,
};

export const wan27: ModelEntry = {
  id: "wan-2.7",
  surface: "video",
  label: "Wan 2.7",
  /* One audio file for text/image-to-video; reference-to-video takes none. */
  roles: { start: 1, end: 1, reference: 8, video: 5, audio: 1 },
  settings: {
    aspectRatio: { type: "enum", values: ["16:9", "9:16", "1:1", "4:3", "3:4"], default: "16:9" },
    resolution: { type: "enum", values: ["720p", "1080p"], default: "720p" },
    duration: { type: "range", min: 2, max: 15, default: 5 },
  },
};

const ltxCommon = {
  duration: { type: "enum", values: ["6", "8", "10"], default: "6" },
  aspectRatio: { type: "enum", values: ["16:9", "9:16"], default: "16:9" },
  generateAudio: { type: "boolean", default: true },
  cameraMovement: {
    type: "enum",
    values: ["none", "dolly_in", "dolly_out", "dolly_left", "dolly_right", "jib_up", "jib_down", "static", "focus_shift"],
    default: "none",
  },
} as const satisfies ModelEntry["settings"];

export const ltx25Fast: ModelEntry = {
  id: "ltx-2.5-fast",
  surface: "video",
  label: "LTX 2.5 Fast",
  roles: { start: 1, end: 1 },
  settings: {
    ...ltxCommon,
    resolution: { type: "enum", values: ["720p", "1080p", "2k", "4k"], default: "720p" },
    fps: { type: "enum", values: ["24", "25", "48", "50"], default: "24" },
  },
};

export const ltx25Pro: ModelEntry = {
  id: "ltx-2.5-pro",
  surface: "video",
  label: "LTX 2.5 Pro",
  roles: { start: 1, end: 1 },
  settings: {
    ...ltxCommon,
    resolution: { type: "enum", values: ["720p", "1080p"], default: "720p" },
    fps: { type: "enum", values: ["24", "25", "50"], default: "24" },
  },
};

export const grokImagineVideo15: ModelEntry = {
  id: "grok-imagine-video-1.5",
  surface: "video",
  label: "Grok Imagine Video 1.5",
  /* No reference video is documented; the earlier "video: 3" role was removed. */
  roles: { start: 1, reference: 8, audio: 1 },
  settings: {
    aspectRatio: {
      type: "enum",
      values: ["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
      default: "auto",
    },
    resolution: { type: "enum", values: ["480p", "720p", "1080p"], default: "480p" },
    duration: { type: "range", min: 1, max: 15, default: 5 },
  },
};

/* ---------- Image ---------- */

const soulSettings = {
  aspectRatio: { type: "enum", values: SOUL_ASPECT, default: "4:3" },
  resolution: { type: "enum", values: ["720p", "1080p"], default: "720p" },
  batchSize: { type: "enum", values: ["1", "4"], default: "1" },
  enhancePrompt: { type: "boolean", default: false },
} as const satisfies ModelEntry["settings"];

export const soulStandard: ModelEntry = {
  id: "soul-standard",
  surface: "image",
  label: "Soul Standard",
  roles: {},
  settings: soulSettings,
};

export const grokImagine2: ModelEntry = {
  id: "grok-imagine-2",
  surface: "image",
  label: "Grok Imagine 2.0",
  /* The reference states no limit. Tested here: 3 images worked, 8 failed. */
  roles: { reference: 3 },
  settings: {
    aspectRatio: { type: "enum", values: IMAGE_ASPECT_FULL, default: "auto" },
    resolution: { type: "enum", values: ["1k", "2k"], default: "1k" },
    quality: { type: "enum", values: ["low", "medium"], default: "medium" },
  },
};

export const ideogram4: ModelEntry = {
  id: "ideogram-4",
  surface: "image",
  label: "Ideogram 4.0",
  roles: { reference: 1 },
  settings: {
    aspectRatio: {
      type: "enum",
      values: [
        "1:1", "1:2", "2:1", "2:3", "3:2", "4:5", "5:4", "9:16", "16:9", "5:8", "8:5", "3:4", "4:3",
        "9:22", "22:9", "9:23", "23:9", "3:8", "8:3", "5:12", "12:5", "1:3", "3:1",
      ],
      default: "1:1",
    },
    renderingSpeed: { type: "enum", values: ["TURBO", "DEFAULT", "QUALITY"], default: "DEFAULT" },
    /* Sent only with a reference image: how much the result keeps of it. */
    imageWeight: { type: "range", min: 1, max: 100, default: 50 },
  },
};

const recraftSettings = {
  aspectRatio: {
    type: "enum",
    values: ["1:1", "2:1", "1:2", "3:2", "2:3", "4:3", "3:4", "5:4", "4:5", "6:10", "14:10", "10:14", "16:9", "9:16"],
    default: "1:1",
  },
  outputFormat: { type: "enum", values: ["jpg", "png", "webp"], default: "jpg" },
} as const satisfies ModelEntry["settings"];

export const recraft41: ModelEntry = {
  id: "recraft-4.1",
  surface: "image",
  label: "Recraft 4.1",
  roles: {},
  settings: { ...recraftSettings, resolution: { type: "enum", values: ["1k"], default: "1k" } },
};

export const recraft41Pro: ModelEntry = {
  id: "recraft-4.1-pro",
  surface: "image",
  label: "Recraft 4.1 Pro",
  roles: {},
  settings: { ...recraftSettings, resolution: { type: "enum", values: ["2k"], default: "2k" } },
};

export const qwenImage3: ModelEntry = {
  id: "qwen-image-3",
  surface: "image",
  label: "Qwen Image 3",
  /* 1-3 references switch the request to the edit endpoint. */
  roles: { reference: 3 },
  settings: {
    aspectRatio: { type: "enum", values: QWEN_ASPECT, default: "1:1" },
    resolution: { type: "enum", values: ["1k", "2k"], default: "1k" },
    promptExtend: { type: "boolean", default: false },
  },
};

export const zImageTurbo: ModelEntry = {
  id: "z-image-turbo",
  surface: "image",
  label: "Z-Image Turbo",
  roles: {},
  settings: {
    aspectRatio: { type: "enum", values: QWEN_ASPECT, default: "1:1" },
    resolution: { type: "enum", values: ["1k", "2k"], default: "1k" },
    promptExtend: { type: "boolean", default: false },
  },
};

const marketingBase = {
  aspectRatio: {
    type: "enum",
    values: ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"],
    default: "1:1",
  },
} as const satisfies ModelEntry["settings"];

export const marketingStudioAlpha: ModelEntry = {
  id: "marketing-studio-alpha",
  surface: "image",
  label: "Marketing Studio Image (Alpha)",
  /* The reference states no limit for Alpha. */
  roles: { reference: 8 },
  settings: { ...marketingBase, resolution: { type: "enum", values: ["1k", "2k", "4k"], default: "1k" } },
};

const marketingGpt = {
  ...marketingBase,
  resolution: { type: "enum", values: ["1k", "2k", "4k"], default: "2k" },
  quality: { type: "enum", values: ["low", "medium", "high", "xhigh", "max"], default: "medium" },
} as const satisfies ModelEntry["settings"];

export const marketingStudioFlare: ModelEntry = {
  id: "marketing-studio-flare",
  surface: "image",
  label: "Marketing Studio Image (2.5 Flare)",
  roles: { reference: 16 },
  settings: marketingGpt,
};

export const marketingStudioSunburst: ModelEntry = {
  id: "marketing-studio-sunburst",
  surface: "image",
  label: "Marketing Studio Image (2.5 Sunburst)",
  roles: { reference: 16 },
  settings: marketingGpt,
};

export const aiInfluencer: ModelEntry = {
  id: "ai-influencer",
  surface: "image",
  label: "AI Influencer (character sheet)",
  /* First reference = identity photo; up to 3 more = clothes, shoes, objects. */
  roles: { reference: 4 },
  settings: {
    tier: {
      type: "enum",
      values: ["normal", "freak", "total", "insects", "frogs", "cats", "dogs", "capybaras", "birds"],
      default: "normal",
    },
  },
};
