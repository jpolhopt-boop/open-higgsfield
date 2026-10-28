import type { GenerationPlane, MediaRole } from "./catalog/types";

/* Request maps for models whose input schema was read from the official API
   reference (see catalog/verification.ts). A map throws, with a reason the
   composer can show, when attached media cannot be used by the mode the media
   selects: a file is never dropped quietly. */

export type Mapped = { path: string; body: Record<string, unknown> };

function urls(plane: GenerationPlane, role: MediaRole): string[] {
  return (plane.media[role] ?? []).map((item) => item.url);
}

function text(plane: GenerationPlane): string {
  return plane.prompt.text;
}

function setting<T>(plane: GenerationPlane, key: string): T {
  return plane.settings[key] as T;
}

function unsupported(label: string, what: string, why: string): never {
  throw new Error(`${label}: ${what} cannot be used ${why}. Remove it or pick another model.`);
}

function only(plane: GenerationPlane, label: string, allowed: MediaRole[], why: string) {
  for (const role of ["start", "end", "reference", "video", "audio"] as const) {
    if (!allowed.includes(role) && urls(plane, role).length) unsupported(label, `the ${role} media`, why);
  }
}

/* ---------- Kling 4.0 ---------- */

export function mapKling4(plane: GenerationPlane): Mapped {
  const start = urls(plane, "start")[0];
  const end = urls(plane, "end")[0];
  const refs = urls(plane, "reference");
  const videos = urls(plane, "video");
  const common = {
    prompt: text(plane),
    duration: setting<number>(plane, "duration"),
    resolution: setting<string>(plane, "resolution"),
  };
  const aspect = setting<string>(plane, "aspectRatio");

  if (start || end) {
    if (!start) throw new Error("Kling 4.0: an end frame needs a start frame");
    only(plane, "Kling 4.0", ["start", "end"], "in image-to-video; use references without a start frame");
    return {
      path: "kling-video/v4.0/image-to-video",
      body: { ...common, image_url: start, ...(end ? { end_image_url: end } : {}) },
    };
  }
  if (refs.length || videos.length) {
    return {
      path: "kling-video/v4.0/reference-to-video",
      body: {
        ...common,
        aspect_ratio: aspect,
        ...(refs.length ? { image_urls: refs } : {}),
        ...(videos.length ? { video_urls: videos } : {}),
      },
    };
  }
  if (aspect === "adaptive") throw new Error("Kling 4.0 text-to-video does not support adaptive aspect ratio");
  return { path: "kling-video/v4.0/text-to-video", body: { ...common, aspect_ratio: aspect } };
}

export function mapKling4Edit(plane: GenerationPlane): Mapped {
  const [source, ...extraVideos] = urls(plane, "video");
  if (!source) throw new Error("Kling 4.0 Edit needs the video to edit");
  const refs = urls(plane, "reference");
  return {
    path: "kling-video/v4.0/video-edit",
    body: {
      prompt: text(plane),
      video_url: source,
      duration: setting<number>(plane, "duration"),
      resolution: setting<string>(plane, "resolution"),
      aspect_ratio: setting<string>(plane, "aspectRatio"),
      ...(refs.length ? { image_urls: refs } : {}),
      ...(extraVideos.length ? { video_urls: extraVideos } : {}),
    },
  };
}

/* ---------- Genjutsu ---------- */

export function mapGenjutsu(plane: GenerationPlane): Mapped {
  const video = urls(plane, "video")[0];
  const refs = urls(plane, "reference");
  if (!video) throw new Error("Genjutsu needs the source video (at least 4 s)");
  if (!refs.length) throw new Error("Genjutsu needs 1-8 reference images");
  return {
    path: "higgsfield/genjutsu/motion-transfer/v1.0",
    body: {
      prompt: text(plane),
      video_url: video,
      image_urls: refs,
      resolution: setting<string>(plane, "resolution"),
    },
  };
}

/* ---------- Marketing Studio Image (direct mode: no preset) ---------- */

export function mapMarketing(plane: GenerationPlane, path: string, withQuality: boolean): Mapped {
  const refs = urls(plane, "reference");
  return {
    path,
    body: {
      prompt: text(plane),
      resolution: setting<string>(plane, "resolution"),
      aspect_ratio: setting<string>(plane, "aspectRatio"),
      enhance_prompt: false,
      ...(withQuality ? { quality: setting<string>(plane, "quality") } : {}),
      ...(refs.length ? { image_urls: refs } : {}),
    },
  };
}

/* ---------- AI Influencer: first reference is the identity photo, the rest are items ---------- */

export function mapAiInfluencer(plane: GenerationPlane): Mapped {
  const [identity, ...items] = urls(plane, "reference");
  if (items.length > 3) throw new Error("AI Influencer takes one identity photo and up to 3 items");
  return {
    path: "higgsfield/ai-influencer",
    body: {
      tier: setting<string>(plane, "tier"),
      ...(text(plane) ? { brief: text(plane) } : {}),
      ...(identity ? { image_url: identity } : {}),
      ...(items.length ? { item_image_urls: items } : {}),
    },
  };
}

/* ---------- Image models ---------- */

export function mapSoulImage(plane: GenerationPlane, base: string, allowImage: boolean): Mapped {
  const ref = urls(plane, "reference")[0];
  const body: Record<string, unknown> = {
    prompt: text(plane),
    batch_size: Number(plane.settings.batchSize),
    resolution: plane.settings.resolution,
    aspect_ratio: plane.settings.aspectRatio,
    enhance_prompt: plane.settings.enhancePrompt,
  };
  if (allowImage && ref) return { path: `${base}/image-to-image`, body: { ...body, image_url: ref } };
  return { path: `${base}/standard`, body };
}

export function mapGrokImage(plane: GenerationPlane): Mapped {
  const refs = urls(plane, "reference");
  return {
    path: "xai/grok-imagine-image-2.0",
    body: {
      prompt: text(plane),
      quality: setting<string>(plane, "quality"),
      resolution: setting<string>(plane, "resolution"),
      aspect_ratio: setting<string>(plane, "aspectRatio"),
      ...(refs.length ? { image_urls: refs } : {}),
    },
  };
}

export function mapIdeogram(plane: GenerationPlane): Mapped {
  const ref = urls(plane, "reference")[0];
  return {
    path: "ideogram/v4.0",
    body: {
      prompt: text(plane),
      aspect_ratio: setting<string>(plane, "aspectRatio"),
      rendering_speed: setting<string>(plane, "renderingSpeed"),
      ...(ref ? { image_url: ref, image_weight: setting<number>(plane, "imageWeight") } : {}),
    },
  };
}

export function mapQwenImage(plane: GenerationPlane): Mapped {
  const refs = urls(plane, "reference");
  return {
    path: refs.length ? "alibaba/qwen-image-3/edit" : "alibaba/qwen-image-3/text-to-image",
    body: {
      prompt: text(plane),
      resolution: setting<string>(plane, "resolution"),
      aspect_ratio: setting<string>(plane, "aspectRatio"),
      /* The API defaults both to true and would rewrite the prompt. */
      prompt_extend: setting<boolean>(plane, "promptExtend"),
      enable_thinking: false,
      ...(refs.length ? { image_urls: refs } : {}),
    },
  };
}

export function mapZImage(plane: GenerationPlane): Mapped {
  return {
    path: "z-image/turbo",
    body: {
      prompt: text(plane),
      resolution: setting<string>(plane, "resolution"),
      aspect_ratio: setting<string>(plane, "aspectRatio"),
      prompt_extend: setting<boolean>(plane, "promptExtend"),
    },
  };
}

export function mapRecraft(plane: GenerationPlane, path: string): Mapped {
  return {
    path,
    body: {
      prompt: text(plane),
      resolution: setting<string>(plane, "resolution"),
      aspect_ratio: setting<string>(plane, "aspectRatio"),
      output_format: setting<string>(plane, "outputFormat"),
    },
  };
}

/* ---------- Video models ---------- */

export function mapMinimaxH3(plane: GenerationPlane): Mapped {
  const start = urls(plane, "start")[0];
  const end = urls(plane, "end")[0];
  const refs = urls(plane, "reference");
  const videos = urls(plane, "video");
  const audios = urls(plane, "audio");
  const common = {
    prompt: text(plane),
    duration: setting<number>(plane, "duration"),
    resolution: setting<string>(plane, "resolution"),
    aspect_ratio: setting<string>(plane, "aspectRatio"),
  };
  if (refs.length || videos.length || audios.length) {
    if (start || end) unsupported("MiniMax H3", "a start/end frame", "together with references");
    return {
      path: "minimax/h3/reference-to-video",
      body: {
        ...common,
        ...(refs.length ? { image_urls: refs } : {}),
        ...(videos.length ? { video_urls: videos } : {}),
        ...(audios.length ? { audio_urls: audios } : {}),
      },
    };
  }
  if (start || end) {
    if (!start) throw new Error("MiniMax H3: an end frame needs a start frame");
    return {
      path: "minimax/h3/image-to-video",
      body: { ...common, image_url: start, ...(end ? { end_image_url: end } : {}) },
    };
  }
  return { path: "minimax/h3/text-to-video", body: common };
}

/** Wan 3.0, Wan 3.0 Prime and Wan 2.7 share a shape; `v27` flips the differences. */
export function mapWan(plane: GenerationPlane, prefix: string, v27: boolean): Mapped {
  const label = v27 ? "Wan 2.7" : "Wan 3.0";
  const start = urls(plane, "start")[0];
  const end = urls(plane, "end")[0];
  const refs = urls(plane, "reference");
  const videos = urls(plane, "video");
  const audios = urls(plane, "audio");
  const duration = setting<number>(plane, "duration");
  const aspect = setting<string>(plane, "aspectRatio");
  const resolution = setting<string>(plane, "resolution");
  const audioFlag = v27 ? {} : { generate_audio: setting<boolean>(plane, "generateAudio") };
  const base = { prompt: text(plane), duration, resolution, ...audioFlag };

  if (refs.length || videos.length) {
    if (start || end) unsupported(label, "a start/end frame", "together with references");
    if (v27) {
      if (duration > 10) throw new Error("Wan 2.7 reference-to-video supports up to 10 s");
      if (aspect !== "16:9" && aspect !== "9:16") {
        throw new Error("Wan 2.7 reference-to-video supports 16:9 and 9:16 only");
      }
      only(plane, label, ["reference", "video"], "in reference-to-video");
    }
    return {
      path: `${prefix}/reference-to-video`,
      body: {
        ...base,
        aspect_ratio: aspect,
        ...(refs.length ? { image_urls: refs } : {}),
        ...(videos.length ? { video_urls: videos } : {}),
        ...(audios.length && !v27 ? { audio_urls: audios } : {}),
      },
    };
  }
  if (v27 && audios.length > 1) throw new Error("Wan 2.7 takes one audio file");
  const audio = v27 ? (audios[0] ? { audio_url: audios[0] } : {}) : audios.length ? { audio_urls: audios } : {};
  if (start || end) {
    if (!start) throw new Error(`${label}: an end frame needs a start frame`);
    if (!v27 && audios.length) unsupported(label, "audio files", "in image-to-video (only reference-to-video takes audio)");
    return {
      path: `${prefix}/image-to-video`,
      body: { ...base, image_url: start, ...(end ? { end_image_url: end } : {}), ...(v27 ? audio : {}) },
    };
  }
  if (!v27 && audios.length) unsupported(label, "audio files", "in text-to-video (add a reference image or video)");
  return { path: `${prefix}/text-to-video`, body: { ...base, aspect_ratio: aspect, ...audio } };
}

export function mapLtx(plane: GenerationPlane, tier: "fast" | "pro"): Mapped {
  const start = urls(plane, "start")[0];
  const end = urls(plane, "end")[0];
  const camera = setting<string>(plane, "cameraMovement");
  const body: Record<string, unknown> = {
    prompt: text(plane),
    duration: Number(setting<string>(plane, "duration")),
    fps: Number(setting<string>(plane, "fps")),
    resolution: setting<string>(plane, "resolution"),
    aspect_ratio: setting<string>(plane, "aspectRatio"),
    generate_audio: setting<boolean>(plane, "generateAudio"),
    ...(camera !== "none" ? { camera_movement: camera } : {}),
  };
  if (end && !start) throw new Error("LTX 2.5: an end frame needs a start frame");
  if (start) {
    return {
      path: `lightricks/ltx-2.5/image-to-video/${tier}`,
      body: { ...body, image_url: start, ...(end ? { end_image_url: end } : {}) },
    };
  }
  return { path: `lightricks/ltx-2.5/text-to-video/${tier}`, body };
}

export function mapGrokVideo(plane: GenerationPlane): Mapped {
  const start = urls(plane, "start")[0];
  const refs = urls(plane, "reference");
  const audio = urls(plane, "audio")[0];
  return {
    path: "xai/grok-imagine-video/v1.5/reference-to-video",
    body: {
      prompt: text(plane),
      duration: setting<number>(plane, "duration"),
      resolution: setting<string>(plane, "resolution"),
      aspect_ratio: setting<string>(plane, "aspectRatio"),
      ...(start ? { image_url: start } : {}),
      ...(refs.length ? { image_urls: refs } : {}),
      ...(audio ? { audio_url: audio } : {}),
    },
  };
}
