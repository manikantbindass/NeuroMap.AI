const base = import.meta.env.VITE_API_URL || "";
let token = "";
export function setToken(value: string) {
  token = value;
}
export async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${base}/api${path}`, {
    signal: AbortSignal.timeout(30000),
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: `Server returned ${response.status}` }));
    throw new Error(
      typeof error.detail === "string"
        ? error.detail
        : `Validation failed (${response.status})`,
    );
  }
  return response;
}
export async function json(path: string, options?: RequestInit) {
  return (await api(path, options)).json();
}
export async function download(path: string, filename: string) {
  const blob = await (await api(path)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export function percent(value?: number | null) {
  return value == null ? "—" : `${(100 * value).toFixed(1)}%`;
}
