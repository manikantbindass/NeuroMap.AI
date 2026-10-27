import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import { readFile } from "node:fs/promises";

test("real synthetic upload → analysis → evaluation → report; responsive navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByLabel("Workspace password")
    .fill(process.env.NEUROMAP_PASSWORD!);
  await page.getByText("Server connection", { exact: true }).click();
  await page.getByLabel("API server address").fill("http://remote.example");
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Use an HTTPS server origin",
  );
  await page.getByLabel("API server address").fill("");
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Research overview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New dataset" }).click();
  await expect(page.getByLabel("Choose research dataset")).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "New dataset" }).click();
  await page.getByRole("checkbox").check();
  const sample = await page.request.get("http://127.0.0.1:8000/api/health");
  expect(sample.ok()).toBeTruthy();
  // Download a genuine backend-generated fixture through the authenticated UI.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download sample CSV" }).click();
  const fixture = await downloadPromise;
  const fixturePath = await fixture.path();
  await page.getByLabel("Choose research dataset").setInputFiles({
    name: "synthetic.csv",
    mimeType: "text/csv",
    buffer: await readFile(fixturePath!),
  });
  await expect(page.getByText("Dataset validated and stored.")).toBeVisible();
  await page.getByRole("button", { name: "Run analysis" }).first().click();
  await expect(page.locator(".status-completed").first()).toBeVisible({
    timeout: 45000,
  });
  await page
    .getByRole("button", { name: "Evaluate", exact: true })
    .first()
    .click();
  await expect(page.getByText("ROC-AUC", { exact: true })).toBeVisible();
  await expect(page.getByText("feature_a", { exact: true })).toBeVisible();
  const reportPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report" }).click();
  expect((await reportPromise).suggestedFilename()).toMatch(/\.json$/);
  await page.screenshot({
    path: path.resolve("../assets/screenshots/model-evaluation.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create demo", exact: true }).click();
  await expect(
    page.getByText("Two synthetic datasets created.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Brain viewer", exact: true }).click();
  await expect(
    page.getByText("Image inspection", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Slice index").fill("10");
  await expect(page.getByText("Slice 10", { exact: true })).toBeVisible();
  await page.screenshot({
    path: path.resolve("../assets/screenshots/brain-viewer.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: path.resolve("../assets/screenshots/dashboard.png"),
    fullPage: true,
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.resolve("../assets/screenshots/mobile-view.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workspace preferences" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
