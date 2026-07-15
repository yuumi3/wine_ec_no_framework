// ワイン一覧画面。10件ずつ取得し、IntersectionObserver でインフィニティスクロール。
import { winesApi } from "../api/wines.ts";
import { WineCard } from "../components/WineCard.tsx";
import { Spinner } from "../components/Spinner.tsx";

export async function WineListPage(): Promise<Node> {
  const grid = (
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"></div>
  ) as HTMLElement;
  const status = <div class="py-4"></div> as HTMLElement;
  const sentinel = <div class="h-6"></div> as HTMLElement;

  let cursor: number | null = null;
  let loading = false;
  let done = false;

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) void loadMore();
  });

  async function loadMore(): Promise<void> {
    if (loading || done) return;
    loading = true;
    status.replaceChildren(Spinner({ label: "読み込み中…" }));
    try {
      const res = await winesApi.list(cursor, 10);
      for (const wine of res.items) grid.appendChild(WineCard({ wine }));
      cursor = res.nextCursor;
      if (cursor === null) {
        done = true;
        observer.disconnect();
        status.replaceChildren(
          (<p class="py-4 text-center text-sm text-stone-400">以上ですべてのワインです</p>) as Node,
        );
      } else {
        status.replaceChildren();
      }
    } catch {
      status.replaceChildren(
        (<p class="py-4 text-center text-sm text-rose-700">読み込みに失敗しました</p>) as Node,
      );
    } finally {
      loading = false;
    }
  }

  // 初回10件を読み込んでから監視を開始する。
  await loadMore();
  observer.observe(sentinel);

  return (
    <section class="mx-auto max-w-5xl px-4 py-6">
      <h1 class="mb-6 text-2xl font-semibold tracking-tight text-stone-800">ワイン一覧</h1>
      {grid}
      {sentinel}
      {status}
    </section>
  );
}
