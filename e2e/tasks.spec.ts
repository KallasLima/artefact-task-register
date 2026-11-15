import { expect, test } from "@playwright/test";

test("create, edit, protect a draft, and confirm deletion", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "New task", exact: true }).click();
  const title = page.getByLabel("Title Required", { exact: true });
  const description = page.getByLabel("Description Optional", { exact: true });
  await title.fill("Browser workflow");
  await expect(page.locator("#title-help")).toContainText("16/120");
  await description.fill("A fictional task for the browser test.");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("status")).toHaveText("Task created.");
  await expect(
    page.getByRole("heading", { name: "Browser workflow", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("status")).toHaveCount(0);

  await page
    .getByRole("link", { name: "Edit Browser workflow", exact: true })
    .click();
  const editURL = page.url();
  await title.fill("x".repeat(121));
  await expect(title).toHaveValue("x".repeat(121));
  await expect(page.locator("#title-help")).toContainText("121/120");
  await expect(page.locator("#title-error")).toHaveText(
    "Title must be at most 120 characters.",
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(title).toBeFocused();
  await expect(page).toHaveURL(editURL);

  await title.fill("  Updated browser workflow  ");
  await description.fill("");
  let warned = false;
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("beforeunload");
    warned = true;
    await dialog.dismiss();
  });
  await page.getByRole("link", { name: "Back to tasks", exact: true }).click();
  expect(warned).toBe(true);
  await expect(page).toHaveURL(editURL);
  await expect(title).toHaveValue("  Updated browser workflow  ");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("status")).toHaveText("Task updated.");
  await expect(
    page.getByRole("heading", {
      name: "Updated browser workflow",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".description")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("status")).toHaveCount(0);

  await page.goBack();
  await expect(
    page.getByRole("heading", {
      name: "Updated browser workflow",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);

  const deleteTrigger = page.getByRole("button", {
    name: "Delete Updated browser workflow",
    exact: true,
  });
  await deleteTrigger.click();
  const confirmation = page.getByRole("group", {
    name: "Delete Updated browser workflow?",
    exact: true,
  });
  await expect(confirmation).toBeVisible();
  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(confirmation).toHaveCount(0);
  await expect(deleteTrigger).toBeFocused();
  await deleteTrigger.click();
  await confirmation
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Task deleted.");
  await expect(
    page.getByRole("heading", { name: "No tasks yet", exact: true }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("an acknowledged save preserves an accepted slow reload", async ({
  page,
}) => {
  let reportSaved!: () => void;
  const saved = new Promise<void>((resolve) => {
    reportSaved = resolve;
  });
  await page.exposeFunction("reportSaved", reportSaved);
  let reportStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    reportStarted = resolve;
  });
  await page.exposeFunction("reportStarted", reportStarted);
  // Model an acknowledgement queued after the leave prompt. The zero-delay
  // task runs after beforeunload; no real task is written in this boundary test.
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    let acknowledge: (() => void) | undefined;
    window.fetch = (...args) => {
      if (String(args[0]).includes("/api/trpc/create")) {
        return new Promise<Response>((resolve) => {
          acknowledge = () =>
            resolve(
              new Response(
                JSON.stringify([
                  {
                    result: {
                      data: {
                        id: "00000000-0000-4000-8000-000000000001",
                        titulo: "Slow navigation check",
                        dataCriacao: "2026-01-01T00:00:00.000Z",
                      },
                    },
                  },
                ]),
                { headers: { "Content-Type": "application/json" } },
              ),
            );
          (window as unknown as { reportStarted: () => void }).reportStarted();
        });
      }
      return originalFetch(...args);
    };
    window.addEventListener("beforeunload", () =>
      setTimeout(() => acknowledge?.(), 0),
    );
    document.addEventListener("DOMContentLoaded", () => {
      const observer = new MutationObserver(() => {
        if (
          document
            .querySelector('[role="status"]')
            ?.textContent?.includes("Task created. Return to tasks to view it.")
        ) {
          observer.disconnect();
          (window as unknown as { reportSaved: () => void }).reportSaved();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  });
  await page.goto("/tasks/new");
  await page
    .getByLabel("Title Required", { exact: true })
    .fill("Slow navigation check");
  await expect(page.locator("#title-help")).toContainText("21/120");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saving...", exact: true }),
  ).toBeDisabled();
  await started;
  let releaseReload!: () => void;
  const reloadGate = new Promise<void>((resolve) => {
    releaseReload = resolve;
  });
  let sawReload!: () => void;
  const reloadStarted = new Promise<void>((resolve) => {
    sawReload = resolve;
  });
  await page.route("**/tasks/new", async (route) => {
    sawReload();
    await reloadGate;
    await route.continue();
  });
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("beforeunload");
    await dialog.accept();
  });
  const reload = page.reload().then(
    () => null,
    (error: Error) => error,
  );
  try {
    await reloadStarted;
    await saved;
    releaseReload();
    expect(await reload).toBeNull();
    await expect(page).toHaveURL("/tasks/new");
    await expect(
      page.getByLabel("Title Required", { exact: true }),
    ).toHaveValue("");
  } finally {
    releaseReload();
    await reload;
  }
});
