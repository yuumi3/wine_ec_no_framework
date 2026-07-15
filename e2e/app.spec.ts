// E2E（全体の動作確認）テスト。実ブラウザでユーザー操作を通しでなぞる。
// 厳密な網羅ではなく、主要フローが結合状態で動くことをスモークテストする。
import { test, expect, type Page } from "@playwright/test";

// セッション（ログイン状態・カート）を跨いで確認するため、1つの page を共有する。
test.describe.configure({ mode: "serial" });

let page: Page;
let wineName: string;

// 実行ごとに一意なメールにして、サーバ再利用時の重複登録を避ける。
const email = `e2e-${Date.now()}@example.com`;
const password = "password123";

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page.close();
});

test("ワイン一覧が表示される", async () => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "ワイン一覧" })).toBeVisible();

  const firstWine = page.locator('a[href^="/wines/"]').first();
  await expect(firstWine).toBeVisible();
  await expect(firstWine.locator("img")).toBeVisible(); // 画像
  await expect(firstWine).toContainText("¥"); // 価格
});

test("ワイン詳細が表示される", async () => {
  const firstWine = page.locator('a[href^="/wines/"]').first();
  wineName = (await firstWine.locator("h3").textContent())?.trim() ?? "";

  await firstWine.click();
  await expect(page).toHaveURL(/\/wines\/\d+$/);

  await expect(page.getByRole("heading", { name: wineName })).toBeVisible();
  await expect(page.getByText("産地", { exact: true })).toBeVisible(); // スペック表
  await expect(page.getByRole("button", { name: "カートに入れる" })).toBeVisible();
});

test("未ログインでは購入ボタンが押せない", async () => {
  await expect(page.getByRole("button", { name: "カートに入れる" })).toBeDisabled();
});

test("ユーザー登録し、ログインできる", async () => {
  // 新規登録（成功で自動ログイン）
  await page.goto("/register");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(password);
  await page.getByLabel("パスワード（確認）").fill(password);
  await page.getByLabel("氏名").fill("試験 太郎");
  await page.getByLabel("住所").fill("東京都渋谷区1-2-3");
  await page.getByRole("button", { name: "登録する" }).click();

  // 登録後は自動ログイン状態
  await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();

  // 一度ログアウト
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();

  // 改めてログイン
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();
});

test("ショッピングカートにワインが追加できる", async () => {
  // ログイン状態で詳細を開き、カートに入れる
  await page.goto("/");
  const firstWine = page.locator('a[href^="/wines/"]').first();
  wineName = (await firstWine.locator("h3").textContent())?.trim() ?? wineName;
  await firstWine.click();

  await page.getByRole("button", { name: "カートに入れる" }).click();

  // ヘッダーのカートバッジが 1 になる
  await expect(page.locator('a[href="/cart"]')).toContainText("1");

  // カート画面に該当ワインが表示される
  await page.locator('a[href="/cart"]').click();
  await expect(page.getByRole("heading", { name: "ショッピングカート" })).toBeVisible();
  await expect(page.getByText(wineName)).toBeVisible();
});

test("カートのワインの数量変更・削除ができる", async () => {
  // 数量を +1 → 「2 点」に更新される
  await page.getByRole("button", { name: "増やす" }).click();
  await expect(page.getByText(/2\s*点/)).toBeVisible();
  await expect(page.locator('a[href="/cart"]')).toContainText("2");

  // 削除 → カートが空になる
  await page.getByRole("button", { name: "削除" }).click();
  await expect(page.getByText("カートは空です。")).toBeVisible();
});
