import { dop } from "./dop";
import { flux2 } from "./flux-2";
import { flux3 } from "./flux-3";
import { happyHorse1 } from "./happy-horse-1";
import { happyHorse11 } from "./happy-horse-1.1";
import { kling25 } from "./kling-2.5";
import { kling26 } from "./kling-2.6";
import {
  kling34k,
  kling3MotionPro,
  kling3MotionStd,
  kling3Pro,
  kling3Std,
  kling3Turbo,
} from "./kling-3";
import { klingO1 } from "./kling-o1";
import { klingO3 } from "./kling-o3";
import { minimaxHailuo23 } from "./minimax-hailuo-2.3";
import { parseSettings } from "./parse-settings";
import { pixverse6 } from "./pixverse-6";
import { seedance2, seedance2Fast, seedance2Mini } from "./seedance-2";
import { seedance25, seedance25Edit, seedance25Extend } from "./seedance-2.5";
import { soul2, soulCinema } from "./soul";
import type { ModelEntry } from "./types";
import {
  aiInfluencer,
  genjutsu,
  grokImagine2,
  grokImagineVideo15,
  ideogram4,
  kling4,
  kling4Edit,
  ltx25Fast,
  ltx25Pro,
  marketingStudioAlpha,
  marketingStudioFlare,
  marketingStudioSunburst,
  minimaxH3,
  qwenImage3,
  recraft41,
  recraft41Pro,
  soulStandard,
  wan27,
  wan3,
  wan3Prime,
  zImageTurbo,
} from "./verified";
import { wan26 } from "./wan-2.6";

export const MODELS: readonly ModelEntry[] = [
  soul2,
  soulCinema,
  soulStandard,
  aiInfluencer,
  marketingStudioAlpha,
  marketingStudioFlare,
  marketingStudioSunburst,
  seedance25,
  seedance25Edit,
  seedance25Extend,
  seedance2,
  seedance2Fast,
  seedance2Mini,
  kling4,
  kling4Edit,
  genjutsu,
  kling3Turbo,
  kling3Std,
  kling3Pro,
  kling34k,
  kling3MotionStd,
  kling3MotionPro,
  flux2,
  grokImagine2,
  ideogram4,
  recraft41,
  recraft41Pro,
  qwenImage3,
  zImageTurbo,
  wan3,
  wan3Prime,
  wan27,
  wan26,
  flux3,
  minimaxH3,
  minimaxHailuo23,
  happyHorse1,
  happyHorse11,
  kling26,
  kling25,
  klingO3,
  klingO1,
  ltx25Fast,
  ltx25Pro,
  grokImagineVideo15,
  pixverse6,
  dop,
];

export function getModel(id: string): ModelEntry {
  const model = MODELS.find((entry) => entry.id === id);
  if (!model) throw new Error(`Unknown model: ${id}`);
  return model;
}

export { UNVERIFIED_MODELS, VERIFICATION, verificationOf } from "./verification";
export type { GenerationPlane, MediaItem, MediaRole, ModelEntry, PlatformPaths, Surface } from "./types";
export { parseSettings };
