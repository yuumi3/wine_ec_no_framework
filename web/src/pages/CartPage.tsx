// ショッピングカート画面。要ログイン。数量変更・削除に対応。
import { cartApi } from "../api/cart.ts";
import { session } from "../store/session.ts";
import { navigate, refresh } from "../router.ts";
import { QuantityInput } from "../components/QuantityInput.tsx";
import { formatPrice } from "../format.ts";
import type { Cart, CartItem } from "../api/types.ts";

function cartRow(item: CartItem): Node {
  async function onQuantityChange(quantity: number): Promise<void> {
    await cartApi.update(item.id, quantity);
    await session.refreshCart();
    refresh(); // 合計・バッジを更新するため再描画
  }

  async function onRemove(): Promise<void> {
    await cartApi.remove(item.id);
    await session.refreshCart();
    refresh();
  }

  return (
    <li class="flex items-center gap-4 py-4">
      <a href={`/wines/${item.wineId}`} class="shrink-0">
        <img src={item.imageUrl} alt={item.name} class="h-20 w-16 rounded object-cover" />
      </a>
      <div class="min-w-0 flex-1">
        <a href={`/wines/${item.wineId}`} class="line-clamp-2 text-sm font-medium text-stone-800 hover:text-rose-800">
          {item.name}
        </a>
        <p class="mt-1 text-sm text-stone-500">{formatPrice(item.price, item.currency)}</p>
      </div>
      <QuantityInput value={item.quantity} min={1} onChange={(q) => void onQuantityChange(q)} />
      <div class="w-24 text-right text-sm font-semibold text-stone-800">
        {formatPrice(item.subtotal, item.currency)}
      </div>
      <button
        type="button"
        class="text-sm text-stone-400 hover:text-rose-700"
        onClick={() => void onRemove()}
        aria-label="削除"
      >
        削除
      </button>
    </li>
  );
}

export async function CartPage(): Promise<Node> {
  if (!session.isLoggedIn) {
    // 現在の描画が終わってから遷移する（描画中に navigate すると再描画と競合するため）。
    setTimeout(() => navigate("/login"), 0);
    return <div class="p-8 text-center text-stone-500">ログインページへ移動します…</div>;
  }

  let cart: Cart;
  try {
    cart = await cartApi.get();
  } catch {
    return <div class="mx-auto max-w-md p-8 text-center text-rose-700">カートの取得に失敗しました</div>;
  }

  if (cart.items.length === 0) {
    return (
      <section class="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 class="mb-4 text-2xl font-semibold text-stone-800">ショッピングカート</h1>
        <p class="text-stone-500">カートは空です。</p>
        <a href="/" class="mt-6 inline-block text-rose-800 hover:underline">ワインを探す →</a>
      </section>
    );
  }

  return (
    <section class="mx-auto max-w-3xl px-4 py-6">
      <h1 class="mb-6 text-2xl font-semibold text-stone-800">ショッピングカート</h1>
      <ul class="divide-y divide-stone-200 border-y border-stone-200">
        {cart.items.map((item) => cartRow(item))}
      </ul>
      <div class="mt-6 flex items-center justify-between">
        <span class="text-sm text-stone-500">{cart.count} 点</span>
        <div class="text-right">
          <span class="text-sm text-stone-500">合計</span>
          <span class="ml-3 text-2xl font-bold text-rose-900">{formatPrice(cart.total)}</span>
        </div>
      </div>
    </section>
  );
}
