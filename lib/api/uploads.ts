import { http } from "../http";

export async function uploadAsset(
  file: File | Blob,
  filename?: string,
): Promise<{ url: string; key?: string }> {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append("file", file);
  } else {
    formData.append("file", file, filename || "file");
  }

  const res = await http.post<unknown>("/api/v1/uploads", formData);
  const outer = isRecord(res.data) ? res.data : {};
  const envelope = isRecord(outer.data) ? outer.data : outer;
  const data = isRecord(envelope.data) ? envelope.data : envelope;
  const url = data.publicUrl ?? data.url ?? data.fileUrl ?? data.src;
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("The upload service did not return a file URL");
  }
  const key = typeof data.key === "string" ? data.key : undefined;
  return { url, ...(key ? { key } : {}) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Upload a file through the backend's authenticated multipart endpoint. */
export async function uploadMedia(file: File): Promise<string> {
  const uploaded = await uploadAsset(file);
  return uploaded.url;
}

export async function deleteUpload(input: {
  url: string;
}): Promise<{ ok: boolean }> {
  try {
    const res = await http.delete<unknown>("/api/v1/uploads", { data: input });
    const payload = isRecord(res.data) ? res.data : {};
    const result = isRecord(payload.data) ? payload.data : payload;
    return { ok: result.ok === true };
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 404) return { ok: false };
    throw err;
  }
}

// ----------------------------------------------------------------------------
// Active Season (Summer / Winter toggle)
// ----------------------------------------------------------------------------
