import { test } from "@playwright/test";
import { TEST_CREDENTIALS } from "./helpers/auth";

test("Debug Env", async ({ page }) => {
  console.log("Base URL:", test.info().project.use.baseURL);
  console.log("Admin Email:", TEST_CREDENTIALS.admin.email);
  await page.goto("/");
  await page.waitForTimeout(1000);
});
