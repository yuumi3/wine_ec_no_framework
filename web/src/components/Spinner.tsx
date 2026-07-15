// ローディング表示。

export function Spinner(props: { label?: string }): Node {
  return (
    <div class="flex items-center justify-center gap-2 py-6 text-stone-500">
      <span class="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-rose-800"></span>
      {props.label ? <span class="text-sm">{props.label}</span> : null}
    </div>
  );
}
