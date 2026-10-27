export function getApiOrigin() {
  return (
    localStorage.getItem("neuromap-api-origin") ||
    import.meta.env.VITE_API_URL ||
    ""
  );
}
export function setApiOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    localStorage.removeItem("neuromap-api-origin");
    return;
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid HTTPS API server address");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "Use an HTTPS server origin without credentials, path, or query; HTTP is allowed only on loopback",
    );
  }
  localStorage.setItem("neuromap-api-origin", url.origin);
}
let token = "";
export function setToken(value: string) {
  token = value;
}
export async function api(path: string, options: RequestInit = {}) {
  const base = getApiOrigin();
  if (
    !base &&
    (location.protocol === "capacitor:" ||
      location.origin === "https://localhost")
  ) {
    throw new Error(
      "Set your HTTPS API server under Server connection before signing in",
    );
  }
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
