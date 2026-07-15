// History API ベースの簡易クライアントルーター。
// 各ページは params を受け取り DOM ノード（同期/非同期）を返す関数。

export type PageFn = (params: Record<string, string>) => Node | Promise<Node>;
export type RouteDef = { path: string; page: PageFn };
type Shell = (content: Node) => Node;

type CompiledRoute = { regex: RegExp; keys: string[]; page: PageFn };

function compile(path: string): CompiledRoute {
  const keys: string[] = [];
  const pattern = path
    .split("/")
    .filter((s) => s.length > 0)
    .map((seg) => {
      if (seg.startsWith(":")) {
        keys.push(seg.slice(1));
        return "([^/]+)";
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
  const regex = new RegExp("^/" + pattern.join("/") + "/?$");
  return { regex, keys, page: /* filled later */ (() => document.createTextNode("")) };
}

let active: ClientRouter | null = null;

export function navigate(path: string): void {
  active?.navigate(path);
}

export function refresh(): void {
  active?.refresh();
}

export class ClientRouter {
  #root: HTMLElement;
  #routes: CompiledRoute[];
  #shell: Shell;
  #notFound: PageFn;

  constructor(root: HTMLElement, routes: RouteDef[], shell: Shell, notFound: PageFn) {
    this.#root = root;
    this.#shell = shell;
    this.#notFound = notFound;
    this.#routes = routes.map(({ path, page }) => {
      const c = compile(path);
      c.page = page;
      return c;
    });
    active = this;
  }

  start(): void {
    window.addEventListener("popstate", () => void this.#render());
    document.addEventListener("click", (e) => this.#onClick(e));
    void this.#render();
  }

  navigate(path: string): void {
    if (path !== location.pathname + location.search) {
      history.pushState({}, "", path);
    }
    void this.#render();
  }

  refresh(): void {
    void this.#render();
  }

  #onClick(e: MouseEvent): void {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("/") || anchor.target === "_blank" || anchor.hasAttribute("data-external")) return;
    e.preventDefault();
    this.navigate(href);
  }

  async #render(): Promise<void> {
    const pathname = location.pathname;
    let content: Node;
    try {
      const match = this.#match(pathname);
      content = match
        ? await match.page(match.params)
        : await this.#notFound({});
    } catch (err) {
      content = errorView(err);
    }
    this.#root.replaceChildren(this.#shell(content));
    window.scrollTo(0, 0);
  }

  #match(pathname: string): { page: PageFn; params: Record<string, string> } | null {
    for (const route of this.#routes) {
      const m = route.regex.exec(pathname);
      if (!m) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(m[i + 1] ?? "");
      });
      return { page: route.page, params };
    }
    return null;
  }
}

function errorView(err: unknown): Node {
  const div = document.createElement("div");
  div.className = "mx-auto max-w-md p-8 text-center text-stone-600";
  div.textContent = err instanceof Error ? err.message : "エラーが発生しました";
  return div;
}
