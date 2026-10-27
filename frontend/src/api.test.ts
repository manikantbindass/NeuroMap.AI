import { afterEach, describe, it, expect, vi } from "vitest";
import { api, getApiOrigin, percent, setApiOrigin, setToken } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
  setToken("");
  localStorage.clear();
});
describe("API boundary", () => {
  it("accepts secure server origins and rejects credentials and remote cleartext", () => {
    setApiOrigin("https://research.example/");
    expect(getApiOrigin()).toBe("https://research.example");
    for (const value of [
      "http://research.example",
      "https://user:pass@research.example",
      "https://research.example/api",
      "javascript:alert(1)",
    ]) {
      expect(() => setApiOrigin(value)).toThrow();
    }
    setApiOrigin("");
    expect(getApiOrigin()).toBe("");
  });
  it("routes requests to the explicitly configured server", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    setApiOrigin("https://research.example");
    await api("/health");
    expect(fetch.mock.calls[0][0]).toBe("https://research.example/api/health");
  });
  it("formats missing and finite results honestly", () => {
    expect(percent(null)).toBe("—");
    expect(percent(0.123)).toBe("12.3%");
  });
  it("passes authorization without persisting it", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    setToken("test-session");
    await api("/datasets");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer test-session",
    );
    expect(localStorage.getItem("token")).toBeNull();
  });
  it("surfaces server validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Invalid image" }), {
          status: 422,
        }),
      ),
    );
    await expect(api("/datasets")).rejects.toThrow("Invalid image");
  });
});
