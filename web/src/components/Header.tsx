// 全画面共通ヘッダー。ロゴ・カート（件数バッジ）・ログイン状態を表示する。
import { session } from "../store/session.ts";
import { authApi } from "../api/auth.ts";
import { navigate } from "../router.ts";

export function Header(): Node {
  const count = session.cartCount;

  async function onLogout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      session.clear();
      navigate("/");
    }
  }

  return (
    <header class="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <a href="/" class="flex items-baseline gap-2">
          <span class="text-xl font-semibold tracking-tight text-rose-900">Wine Cellar</span>
          <span class="hidden text-xs text-stone-400 sm:inline">厳選ワインの店</span>
        </a>

        <nav class="flex items-center gap-4 text-sm">
          <a href="/cart" class="relative inline-flex items-center gap-1 text-stone-700 hover:text-rose-800">
            <span>カート</span>
            {count > 0 ? (
              <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-800 px-1 text-xs font-semibold text-white">
                {count}
              </span>
            ) : null}
          </a>

          {session.isLoggedIn ? (
            <div class="flex items-center gap-3">
              <span class="hidden text-stone-500 sm:inline">{session.user?.fullName} さん</span>
              <button
                type="button"
                class="text-stone-600 hover:text-rose-800"
                onClick={() => void onLogout()}
              >
                ログアウト
              </button>
            </div>
          ) : (
            <div class="flex items-center gap-3">
              <a href="/login" class="text-stone-700 hover:text-rose-800">ログイン</a>
              <a
                href="/register"
                class="rounded-md bg-rose-800 px-3 py-1.5 text-white hover:bg-rose-900"
              >
                新規登録
              </a>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
