import { put } from "@vercel/blob/client";

/** Vercel Blob when it is configured; otherwise the platform's own upload
    (presigned URL), signed server-side by /api/hf-upload. */
export async function uploadMedia(file: File): Promise<{ url: string }> {
  try {
    return await uploadToBlob(file);
  } catch {
    return uploadToPlatform(file);
  }
}

/* Vercel functions refuse request bodies over 4.5 MB, so a large photo is
   re-encoded smaller first. WebP keeps transparency, which a cut-out product
   shot needs. */
const PLATFORM_LIMIT = 4 * 1024 * 1024;

async function shrinkImage(file: File): Promise<File> {
  if (file.size <= PLATFORM_LIMIT || !file.type.startsWith("image/") || file.type === "image/gif") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  let scale = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.92));
    if (blob && blob.type === "image/webp" && blob.size <= PLATFORM_LIMIT) {
      bitmap.close();
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
    }
    scale *= 0.8;
  }
  bitmap.close();
  return file;
}

async function uploadToPlatform(original: File): Promise<{ url: string }> {
  const file = await shrinkImage(original);
  if (file.size > PLATFORM_LIMIT + 512 * 1024) {
    throw new Error("File is larger than 4 MB and could not be reduced");
  }
  const res = await fetch("/api/hf-upload", { method: "POST", headers: { "content-type": file.type }, body: file });
  const body = (await res.json().catch(() => null)) as { url?: unknown; error?: unknown } | null;
  if (!res.ok || typeof body?.url !== "string") {
    if (typeof body?.error === "string") throw new Error(body.error);
    if (res.status === 401) throw new Error("Session expired — sign in again");
    if (res.status === 413) throw new Error("File too large for the server");
    throw new Error(`Upload failed (HTTP ${res.status})`);
  }
  return { url: body.url };
}

async function uploadToBlob(file: File): Promise<{ url: string }> {
  const res = await fetch("/api/blob", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: { pathname: file.name, clientPayload: null, multipart: false },
    }),
  });
  if (!res.ok) throw new Error("Failed to retrieve the client token");
  const { clientToken, pathname } = (await res.json()) as {
    clientToken?: unknown;
    pathname?: unknown;
  };
  if (typeof clientToken !== "string" || typeof pathname !== "string") {
    throw new Error("Failed to retrieve the client token");
  }
  const blob = await put(pathname, file, { access: "public", token: clientToken });
  return { url: blob.url };
}
