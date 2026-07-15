// 自作の軽量JSXランタイム。JSX を「本物のDOMノード」へ変換する（React非依存）。
// esbuild の inject により、JSX を含む全ファイルへ h / Fragment が自動注入される。

export const Fragment = Symbol("Fragment");

type Props = Record<string, unknown> | null;
export type Child = Node | string | number | boolean | null | undefined | Child[];
type Component = (props: Record<string, unknown>) => Node;

/** JSX ファクトリ。tag は文字列(HTMLタグ) / 関数(コンポーネント) / Fragment。 */
export function h(tag: string | Component | typeof Fragment, props: Props, ...children: Child[]): Node {
  if (tag === Fragment) {
    const frag = document.createDocumentFragment();
    appendChildren(frag, children);
    return frag;
  }

  if (typeof tag === "function") {
    return tag({ ...(props ?? {}), children });
  }

  const el = document.createElement(tag);
  applyProps(el, props ?? {});
  appendChildren(el, children);
  return el;
}

function applyProps(el: HTMLElement, props: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(props)) {
    if (key === "children") continue;

    if (key === "className" || key === "class") {
      el.className = value == null ? "" : String(value);
    } else if (key === "style" && value && typeof value === "object") {
      Object.assign(el.style, value as Record<string, string>);
    } else if (key === "ref" && typeof value === "function") {
      (value as (el: HTMLElement) => void)(el);
    } else if (key === "dangerouslySetInnerHTML" && value && typeof value === "object") {
      el.innerHTML = String((value as { __html: unknown }).__html ?? "");
    } else if (key.startsWith("on") && typeof value === "function") {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, value as EventListener);
    } else if (key === "value" || key === "checked" || key === "disabled" || key === "selected") {
      // フォーム系はプロパティとして設定する。
      (el as unknown as Record<string, unknown>)[key] = value;
    } else if (key === "htmlFor") {
      el.setAttribute("for", String(value));
    } else if (value === false || value == null) {
      // 属性を付けない。
    } else if (value === true) {
      el.setAttribute(key, "");
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

function appendChildren(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child == null || child === false || child === true) continue;
    if (Array.isArray(child)) {
      appendChildren(parent, child);
    } else if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  }
}
