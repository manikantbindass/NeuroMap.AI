import { afterEach, describe, it, expect, vi } from "vitest";
import { api, percent, setToken } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
  setToken("");
});
describe("API boundary", () => {
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
