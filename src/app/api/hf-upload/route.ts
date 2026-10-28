import { NextResponse } from "next/server";

import { toAuthorizationHeader } from "@/generation/credentials";
import { readCredentials } from "@/generation/server-credentials";

/* Official upload path: ask the API for a presigned URL, PUT the file to it,
   hand back the public URL a generate request can carry. The browser never
   sees the key; the storage PUT carries no Higgsfield authorization. Used when
   Vercel Blob is not configured. Anyone who can reach this route can upload
   with the server's key; gate it when the studio is exposed. */

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/wav",
  "audio/x-wav",
  "video/mp4",
]);

export async function POST(request: Request): Promise<NextResponse> {
  const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json(
      { error: `Unsupported file type "${contentType || "unknown"}". Accepted: JPEG, PNG, WebP, GIF, WAV, MP4.` },
      { status: 415 },
    );
  }

  let credentials;
  try {
    credentials = await readCredentials();
  } catch {
    return NextResponse.json({ error: "Missing platform key" }, { status: 401 });
  }

  const slot = await fetch(`${credentials.baseUrl.replace(/\/$/, "")}/files/generate-upload-url`, {
    method: "POST",
    headers: {
      Authorization: toAuthorizationHeader(credentials.apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content_type: contentType }),
  });
  if (!slot.ok) {
    return NextResponse.json({ error: `Upload slot refused (${slot.status})` }, { status: 502 });
  }
  const slotBody = (await slot.json()) as {
    public_url?: unknown;
    upload_url?: unknown;
    upload_headers?: unknown;
  };
  if (typeof slotBody.public_url !== "string" || typeof slotBody.upload_url !== "string") {
    return NextResponse.json({ error: "Upload slot response was incomplete" }, { status: 502 });
  }
  const headers: Record<string, string> = {};
  if (slotBody.upload_headers && typeof slotBody.upload_headers === "object") {
    for (const [name, value] of Object.entries(slotBody.upload_headers)) {
      if (typeof value === "string") headers[name] = value;
    }
  }
  if (!Object.keys(headers).some((name) => name.toLowerCase() === "content-type")) {
    headers["Content-Type"] = contentType;
  }

  const put = await fetch(slotBody.upload_url, {
    method: "PUT",
    headers,
    body: await request.arrayBuffer(),
  });
  if (!put.ok) {
    return NextResponse.json({ error: `Storage refused the file (${put.status})` }, { status: 502 });
  }
  return NextResponse.json({ url: slotBody.public_url });
}
