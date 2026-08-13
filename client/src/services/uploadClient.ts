import { useAuthStore } from "../store/authStore";
import { ApiClientError } from "./apiClient";

// Same VITE_API_URL convention as apiClient.ts — see the comment there for why it's needed.
const BASE = `${import.meta.env.VITE_API_URL ?? ""}/api/v1`;

// apiClient.ts always JSON.stringifies the body and sets Content-Type: application/json, which
// breaks multipart uploads — this is a small parallel client that sends FormData instead, while
// reusing the same auth-header injection the rest of the app relies on. (401-refresh-retry is
// intentionally not duplicated here: uploads are short-lived, user-triggered actions where a
// stale token can simply be surfaced as an error and retried by re-opening the modal.)
export async function uploadFile(path: string, file: File): Promise<{ data: unknown }> {
  const { accessToken } = useAuthStore.getState();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.error || {};
    throw new ApiClientError(res.status, err.code || "UNKNOWN", err.message || res.statusText, err.field);
  }
  return body;
}

// The download route requires a Bearer header, which a plain <a href> can't send — fetch the
// file as a blob instead and trigger the save via a throwaway object URL.
export async function downloadAttachment(attachmentId: number, fileName: string): Promise<void> {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(`${BASE}/attachments/${attachmentId}/download`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (!res.ok) throw new ApiClientError(res.status, "DOWNLOAD_FAILED", "Could not download the file");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
