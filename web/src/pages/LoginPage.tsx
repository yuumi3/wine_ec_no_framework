// ログイン画面。email・パスワードでログインし、成功で一覧へ。
import { authApi } from "../api/auth.ts";
import { session } from "../store/session.ts";
import { navigate } from "../router.ts";
import { Button } from "../components/Button.tsx";
import { ApiError } from "../api/client.ts";

export function LoginPage(): Node {
  const emailInput = (
    <input
      id="login-email"
      type="email"
      required
      autocomplete="email"
      class="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
    />
  ) as HTMLInputElement;

  const passwordInput = (
    <input
      id="login-password"
      type="password"
      required
      autocomplete="current-password"
      class="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
    />
  ) as HTMLInputElement;

  const error = <p class="text-sm text-rose-700"></p> as HTMLElement;
  const submitBtn = Button({ type: "submit", children: "ログイン" }) as HTMLButtonElement;

  async function onSubmit(e: Event): Promise<void> {
    e.preventDefault();
    error.textContent = "";
    submitBtn.disabled = true;
    try {
      const { user } = await authApi.login(emailInput.value.trim(), passwordInput.value);
      session.setUser(user);
      await session.refreshCart();
      navigate("/");
    } catch (err) {
      error.textContent = err instanceof ApiError ? err.message : "ログインに失敗しました";
      submitBtn.disabled = false;
    }
  }

  return (
    <section class="mx-auto max-w-sm px-4 py-12">
      <h1 class="mb-6 text-2xl font-semibold text-stone-800">ログイン</h1>
      <form class="space-y-4" onSubmit={(e: Event) => void onSubmit(e)}>
        <div>
          <label htmlFor="login-email" class="mb-1 block text-sm font-medium text-stone-700">メールアドレス</label>
          {emailInput}
        </div>
        <div>
          <label htmlFor="login-password" class="mb-1 block text-sm font-medium text-stone-700">パスワード</label>
          {passwordInput}
        </div>
        {error}
        <div class="pt-2">{submitBtn}</div>
      </form>
      <p class="mt-6 text-sm text-stone-500">
        アカウントをお持ちでない方は
        <a href="/register" class="mx-1 font-medium text-rose-800 hover:underline">新規登録</a>
      </p>
    </section>
  );
}
