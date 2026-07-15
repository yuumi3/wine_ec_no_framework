// エディタ向けの JSX 型定義。
// h/Fragment は esbuild の inject で実体が注入されるため、ここでは型のみ宣言する。
import type { Child } from "./factory.ts";

declare global {
  // classic JSX 変換が参照するグローバル。
  const h: (tag: unknown, props: Record<string, unknown> | null, ...children: Child[]) => Node;
  const Fragment: unique symbol;

  namespace JSX {
    // 生成結果は常に DOM ノード。
    type Element = Node;

    interface ElementChildrenAttribute {
      children: unknown;
    }

    // 各HTMLタグの属性は最小限に緩く許可する（本格的な型付けはスコープ外）。
    interface IntrinsicElements {
      [tagName: string]: Record<string, unknown> & {
        children?: unknown;
        class?: string;
        className?: string;
        style?: Partial<CSSStyleDeclaration> | Record<string, string>;
      };
    }
  }
}

export {};
