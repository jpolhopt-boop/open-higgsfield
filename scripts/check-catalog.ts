/* Non-billable catalog check: builds the request every model would send, with
   its default settings, with and without media. Nothing is sent anywhere.
   Run: tsx scripts/check-catalog.ts */
import { MODELS, parseSettings, verificationOf } from "../src/generation/catalog";
import type { GenerationPlane, MediaRole } from "../src/generation/catalog";
import { toPlatform } from "../src/generation/to-platform";

const ROLES: MediaRole[] = ["start", "end", "reference", "video", "audio"];
let failures = 0;

function plane(model: (typeof MODELS)[number], roles: MediaRole[]): GenerationPlane {
  return {
    model: model.id,
    prompt: { text: "A cinematic scene at sunset" },
    media: Object.fromEntries(
      roles.map((role) => [role, [{ id: role, role, url: `https://example.test/${role}.bin` }]]),
    ),
    settings: parseSettings(model, {}),
  };
}

function attempt(model: (typeof MODELS)[number], roles: MediaRole[]) {
  try {
    const { path, body } = toPlatform(plane(model, roles));
    return { ok: true as const, path, keys: Object.keys(body).join(",") };
  } catch (caught) {
    return { ok: false as const, error: caught instanceof Error ? caught.message : String(caught) };
  }
}

const ids = new Set<string>();
for (const model of MODELS) {
  if (ids.has(model.id)) {
    console.log(`FAIL duplicate id ${model.id}`);
    failures++;
  }
  ids.add(model.id);

  const bare = attempt(model, []);
  const supported = ROLES.filter((role) => (model.roles[role] ?? 0) > 0);
  const each = supported.map((role) => ({ role, result: attempt(model, [role]) }));
  const level = verificationOf(model.id).level;
  console.log(`\n${model.label} [${model.id}] (${model.surface}, ${level})`);
  console.log(`  text only: ${bare.ok ? `${bare.path} {${bare.keys}}` : `refused: ${bare.error}`}`);
  for (const { role, result } of each) {
    console.log(`  + ${role}: ${result.ok ? `${result.path} {${result.keys}}` : `refused: ${result.error}`}`);
  }
  const all = supported.length > 1 ? attempt(model, supported) : bare;
  if (supported.length > 1) console.log(`  + all: ${all.ok ? `${all.path} {${all.keys}}` : `refused: ${all.error}`}`);
  /* A model must be reachable by at least one input combination. */
  if (!bare.ok && !all.ok && !each.some(({ result }) => result.ok)) {
    console.log("  FAIL no single-input request can be built");
    failures++;
  }
}

console.log(`\n${MODELS.length} models, ${failures} failures`);
process.exit(failures ? 1 : 0);
