// アプリ起動: セッション復元 → ルーターをマウント。
import { ClientRouter, type RouteDef } from "./router.ts";
import { session } from "./store/session.ts";
import { Header } from "./components/Header.tsx";
import { WineListPage } from "./pages/WineListPage.tsx";
import { WineDetailPage } from "./pages/WineDetailPage.tsx";
import { CartPage } from "./pages/CartPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";

const routes: RouteDef[] = [
  { path: "/", page: WineListPage },
  { path: "/wines/:id", page: WineDetailPage },
  { path: "/cart", page: CartPage },
  { path: "/login", page: LoginPage },
  { path: "/register", page: RegisterPage },
];

// 全画面共通のシェル（ヘッダー + 本文）。毎回生成し直すことでヘッダーが最新状態を反映する。
function shell(content: Node): Node {
  return (
    <div class="min-h-screen">
      <Header />
      <main>{content}</main>
    </div>
  );
}

function notFound(): Node {
  return (
    <div class="mx-auto max-w-md px-4 py-20 text-center">
      <p class="text-lg text-stone-600">ページが見つかりません</p>
      <a href="/" class="mt-4 inline-block text-rose-800 hover:underline">一覧へ戻る</a>
    </div>
  );
}

async function main(): Promise<void> {
  const root = document.getElementById("app");
  if (!root) throw new Error("#app not found");

  await session.load(); // ログイン状態・カート件数を復元

  const router = new ClientRouter(root, routes, shell, notFound);
  router.start();
}

void main();
