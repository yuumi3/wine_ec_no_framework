// ワイン一覧のカード。画像・名前・価格を表示し、詳細へのリンクにする。
import type { WineListItem } from "../api/types.ts";
import { formatPrice } from "../format.ts";

export function WineCard(props: { wine: WineListItem }): Node {
  const { wine } = props;
  return (
    <a
      href={`/wines/${wine.id}`}
      class="group flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white transition hover:shadow-md"
    >
      <div class="aspect-[3/4] overflow-hidden bg-stone-100">
        <img
          src={wine.imageUrl}
          alt={wine.name}
          loading="lazy"
          class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div class="flex flex-1 flex-col gap-1 p-3">
        <h3 class="line-clamp-2 text-sm font-medium text-stone-800">{wine.name}</h3>
        <p class="mt-auto text-base font-semibold text-rose-900">{formatPrice(wine.price, wine.currency)}</p>
      </div>
    </a>
  );
}
