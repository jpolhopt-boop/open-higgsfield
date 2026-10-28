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

async function uploadToPlatform(file: File): Promise<{ url: string }> {
  const res = await fetch("/api/hf-upload", { method: "POST", headers: { "content-type": file.type }, body: file });
  const body = (await res.json().catch(() => null)) as { url?: unknown; error?: unknown } | null;
  if (!res.ok || typeof body?.url !== "string") {
    throw new Error(typeof body?.error === "string" ? body.error : "Upload failed");
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
