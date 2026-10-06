import { test, expect } from "@playwright/test";

test("admin can sign in, create, import and approve questions", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/login");
  await page.getByTestId("dev-admin-sign-in").click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

  // Create a question through the editor (validation + live preview)
  await page.goto("/questions/new");
  await page.getByRole("button", { name: /Create question/ }).click();
  await expect(page.getByText("Question is too short")).toBeVisible();
  const text = `Smoke test ${stamp}: which river meets the Benue at Lokoja?`;
  await page.getByLabel("Question").fill(text);
  for (const [i, o] of ["Niger", "Kaduna", "Ogun", "Cross River"].entries()) await page.getByLabel(`Option ${"ABCD"[i]}`, { exact: true }).fill(o);
  await page.getByLabel("Did you know? fact").fill("Lokoja is known as the Confluence Town.");
  await page.getByLabel("Source URL").fill("https://en.wikipedia.org/wiki/Lokoja");
  await expect(page.getByText(text).last()).toBeVisible(); // preview mirrors input
  await page.getByRole("button", { name: /Create question/ }).click();
  await expect(page.getByRole("heading", { name: "Edit question" })).toBeVisible();

  // It shows up in search
  await page.goto("/questions");
  await page.getByLabel("Search questions").fill(`Smoke test ${stamp}`);
  await expect(page.getByText(text)).toBeVisible();

  // CSV import with one valid and one invalid row
  await page.goto("/import");
  const good = `CSV smoke ${stamp}: what is the capital of Kwara State?`;
  await page.getByLabel("CSV content").fill(
    `category,text,option_a,option_b,option_c,option_d,correct,difficulty,fact,source_url\ngeography,${good},Ilorin,Offa,Lokoja,Omu-Aran,A,2,Kwara is the State of Harmony.,https://en.wikipedia.org/wiki/Kwara_State\nfood,Too short,a,b,c,d,A,9,x,notaurl`,
  );
  await expect(page.getByText("1 valid", { exact: true })).toBeVisible();
  await expect(page.getByText("1 with errors", { exact: true })).toBeVisible();
  await page.getByTestId("run-import").click();
  await expect(page.getByText(/Imported 1 question/)).toBeVisible();

  // Approve it from the review queue
  await page.goto("/review");
  const card = page.locator("div").filter({ hasText: good }).filter({ has: page.getByRole("button", { name: /Approve/ }) }).last();
  await card.getByRole("button", { name: /Approve/ }).click();
  await expect(page.getByText("Approved — now live")).toBeVisible();
});
