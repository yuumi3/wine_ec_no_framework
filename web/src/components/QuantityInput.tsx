// 数量の増減入力。−／＋ボタンで値を変更し、onChange で通知する。

export function QuantityInput(props: {
  value: number;
  min?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}): Node {
  const min = props.min ?? 1;
  let value = props.value;

  const valueEl = <span class="w-8 text-center text-sm tabular-nums">{String(value)}</span> as HTMLElement;

  function set(next: number): void {
    if (props.disabled) return;
    const clamped = Math.max(min, next);
    if (clamped === value) return;
    value = clamped;
    valueEl.textContent = String(value);
    props.onChange(value);
  }

  const btnClass =
    "flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div class="inline-flex items-center gap-1">
      <button type="button" class={btnClass} disabled={props.disabled ?? false} onClick={() => set(value - 1)} aria-label="減らす">
        −
      </button>
      {valueEl}
      <button type="button" class={btnClass} disabled={props.disabled ?? false} onClick={() => set(value + 1)} aria-label="増やす">
        ＋
      </button>
    </div>
  );
}
