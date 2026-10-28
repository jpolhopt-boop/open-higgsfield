/* What is actually known about each catalog entry, kept apart from the entry so
   a new model never has to be redesigned around it.

   documented  parameters, value lists and limits read from the official API
               reference (read 2026-10-28)
   tested      a real request completed through this studio (a subset of the
               documented models: only what the owner has run)
   unverified  entry predates the audit and its schema has not been checked

   Nothing here is "tested" for a mode merely because the model is. */

export type Verification = "documented" | "tested" | "unverified";

export const VERIFICATION: Record<string, { level: Verification; note?: string }> = {
  "kling-4": { level: "documented" },
  "kling-4-edit": { level: "documented" },
  genjutsu: { level: "documented", note: "Source video 4 s or longer; trimmed to 30 s." },
  "minimax-h3": { level: "documented", note: "Per-array reference limits are not documented." },
  "wan-3": { level: "documented", note: "Image and reference mode paths follow the naming pattern of text-to-video." },
  "wan-3-prime": { level: "documented", note: "Same as Wan 3.0." },
  "wan-2.7": { level: "documented", note: "Mode paths follow the naming pattern of text-to-video." },
  "ltx-2.5-fast": { level: "documented" },
  "ltx-2.5-pro": { level: "documented" },
  "grok-imagine-video-1.5": { level: "documented" },
  "soul-standard": { level: "documented", note: "Style IDs are not exposed (list not documented)." },
  "soul-2": { level: "tested", note: "Text-to-image tested; the image-to-image mode is documented only." },
  "grok-imagine-2": { level: "tested", note: "Edit with 3 reference images worked; 8 failed." },
  "ideogram-4": { level: "documented", note: "One input image, no mask." },
  "recraft-4.1": { level: "documented", note: "Text-to-image only." },
  "recraft-4.1-pro": { level: "documented", note: "Text-to-image only." },
  "qwen-image-3": { level: "documented" },
  "z-image-turbo": { level: "documented" },
  "marketing-studio-alpha": { level: "documented", note: "Direct mode only; presets are not wired." },
  "marketing-studio-flare": { level: "documented", note: "Direct mode only; presets are not wired." },
  "marketing-studio-sunburst": { level: "documented", note: "Direct mode only; presets are not wired." },
  "ai-influencer": { level: "documented", note: "Tier only; option selection, seed and trait variants are not wired." },
  "seedance-2.5": { level: "tested", note: "Text-to-video run completed (720p, 5 s). Other modes documented." },
  "seedance-2.5-edit": { level: "documented" },
  "seedance-2.5-extend": { level: "documented" },
};

export function verificationOf(id: string) {
  return VERIFICATION[id] ?? { level: "unverified" as const };
}

/** Listed by the official API but not selectable: the reference does not
    publish an input schema, and one is never guessed. */
export const UNVERIFIED_MODELS: ReadonlyArray<{ path: string; label: string; reason: string }> = [
  {
    path: "higgsfield/genjutsu-light/motion-transfer/v1.0",
    label: "Genjutsu Light",
    reason: "API reference is a placeholder; parameter names are not documented.",
  },
  {
    path: "higgsfield/cinema-studio/4.0",
    label: "Cinema Studio 4.0",
    reason: "API reference is a placeholder; parameter names are not documented.",
  },
  {
    path: "higgsfield/ads-studio/v1.0",
    label: "Ads Studio",
    reason: "API reference is a placeholder; parameter names are not documented.",
  },
  {
    path: "workflows/product-shots | graphic-ads | marketplace-design",
    label: "Product shots / Graphic ads / Marketplace design",
    reason: "Documented as presets of Marketing Studio Image; which presets belong to which workflow is not.",
  },
];
