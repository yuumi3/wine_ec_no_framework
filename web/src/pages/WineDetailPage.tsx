// ワイン詳細画面。解説・拡張項目を表示し、購入（カート追加）ボタンを置く。
// 未ログイン時は購入ボタンを押せない。
import { winesApi } from "../api/wines.ts";
import { cartApi } from "../api/cart.ts";
import { session } from "../store/session.ts";
import { refresh } from "../router.ts";
import { Button } from "../components/Button.tsx";
import { Spinner } from "../components/Spinner.tsx";
import { formatPrice } from "../format.ts";
import type { WineDetail } from "../api/types.ts";

function specRow(label: string, value: string | number | null): Node | null {
  if (value === null || value === "") return null;
  return (
    <div class="flex gap-3 py-1.5">
      <dt class="w-24 shrink-0 text-sm text-stone-500">{label}</dt>
      <dd class="text-sm text-stone-800">{String(value)}</dd>
    </div>
  );
}

export async function WineDetailPage(params: Record<string, string>): Promise<Node> {
  const id = Number.parseInt(params.id ?? "", 10);
  if (!Number.isInteger(id)) {
    return <div class="mx-auto max-w-md p-8 text-center text-stone-500">ワインが見つかりません</div>;
  }

  let wine: WineDetail;
  try {
    wine = await winesApi.detail(id);
  } catch {
    return (
      <div class="mx-auto max-w-md p-8 text-center text-stone-500">
        ワインが見つかりません
        <div class="mt-4">
          <a href="/" class="text-rose-800 hover:underline">一覧へ戻る</a>
        </div>
      </div>
    );
  }

  const message = <p class="text-sm text-emerald-700"></p> as HTMLElement;

  async function onPurchase(): Promise<void> {
    try {
      await cartApi.add(wine.id, 1);
      await session.refreshCart();
      message.replaceChildren(
        document.createTextNode("カートに追加しました。"),
        Object.assign(document.createElement("a"), {
          href: "/cart",
          className: "ml-1 font-medium underline",
          textContent: "カートを見る",
        }),
      );
      refresh(); // ヘッダーのバッジを更新
    } catch {
      message.className = "text-sm text-rose-700";
      message.textContent = "カートへの追加に失敗しました";
    }
  }

  const purchaseArea = session.isLoggedIn ? (
    <div class="space-y-2">
      <Button variant="primary" onClick={() => void onPurchase()}>カートに入れる</Button>
      {message}
    </div>
  ) : (
    <div class="space-y-2">
      <Button variant="primary" disabled={true}>カートに入れる</Button>
      <p class="text-sm text-stone-500">
        購入には
        <a href="/login" class="mx-1 font-medium text-rose-800 hover:underline">ログイン</a>
        が必要です
      </p>
    </div>
  );

  return (
    <article class="mx-auto max-w-4xl px-4 py-6">
      <a href="/" class="mb-4 inline-block text-sm text-stone-500 hover:text-rose-800">← 一覧へ戻る</a>
      <div class="grid gap-8 md:grid-cols-2">
        <div class="overflow-hidden rounded-lg bg-stone-100">
          <img src={wine.imageUrl} alt={wine.name} class="h-full w-full object-cover" />
        </div>

        <div class="flex flex-col gap-4">
          <div>
            <span class="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-800">
              {wine.category}
            </span>
            <h1 class="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{wine.name}</h1>
            <p class="mt-2 text-2xl font-bold text-rose-900">{formatPrice(wine.price, wine.currency)}</p>
          </div>

          {purchaseArea}

          <p class="whitespace-pre-line text-sm leading-relaxed text-stone-700">{wine.description}</p>

          <dl class="divide-y divide-stone-100 border-t border-stone-100">
            {specRow("産地", wine.region)}
            {specRow("原産地呼称", wine.appellation)}
            {specRow("ヴィンテージ", wine.vintage)}
            {specRow("ブドウ品種", wine.grape)}
            {specRow("アルコール", wine.alcohol)}
            {specRow("料理との相性", wine.foodPairing)}
          </dl>
        </div>
      </div>
    </article>
  );
}
