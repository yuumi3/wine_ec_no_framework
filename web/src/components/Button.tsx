// 汎用ボタン。variant で見た目を切り替える。

type Variant = "primary" | "secondary" | "ghost";

type ButtonProps = {
  children?: unknown;
  onClick?: (e: MouseEvent) => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: Variant;
  class?: string;
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-rose-800 text-white hover:bg-rose-900 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed",
  secondary:
    "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost: "text-stone-600 hover:text-rose-800 disabled:opacity-50",
};

export function Button(props: ButtonProps): Node {
  const variant = props.variant ?? "primary";
  const base = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors";
  return (
    <button
      type={props.type ?? "button"}
      disabled={props.disabled ?? false}
      onClick={props.onClick as never}
      class={`${base} ${VARIANTS[variant]} ${props.class ?? ""}`}
    >
      {props.children}
    </button>
  );
}
