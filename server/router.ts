// メソッド + パスパターン(:param 対応) を handler に対応づける最小ルーター。
import type { IncomingMessage, ServerResponse } from "node:http";

export type RouteContext = {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: URLSearchParams;
  url: URL;
};

export type RouteHandler = (ctx: RouteContext) => void | Promise<void>;

type Route = {
  method: string;
  segments: string[];
  handler: RouteHandler;
};

function splitPath(path: string): string[] {
  return path.split("/").filter((s) => s.length > 0);
}

export class Router {
  #routes: Route[] = [];

  add(method: string, pattern: string, handler: RouteHandler): this {
    this.#routes.push({ method: method.toUpperCase(), segments: splitPath(pattern), handler });
    return this;
  }

  get(pattern: string, handler: RouteHandler): this {
    return this.add("GET", pattern, handler);
  }
  post(pattern: string, handler: RouteHandler): this {
    return this.add("POST", pattern, handler);
  }
  put(pattern: string, handler: RouteHandler): this {
    return this.add("PUT", pattern, handler);
  }
  delete(pattern: string, handler: RouteHandler): this {
    return this.add("DELETE", pattern, handler);
  }

  /** メソッドとパスにマッチする handler と path params を返す。無ければ null。 */
  match(method: string, pathname: string): { handler: RouteHandler; params: Record<string, string> } | null {
    const parts = splitPath(pathname);
    for (const route of this.#routes) {
      if (route.method !== method.toUpperCase()) continue;
      if (route.segments.length !== parts.length) continue;

      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i]!;
        const value = parts[i]!;
        if (seg.startsWith(":")) {
          params[seg.slice(1)] = decodeURIComponent(value);
        } else if (seg !== value) {
          ok = false;
          break;
        }
      }
      if (ok) return { handler: route.handler, params };
    }
    return null;
  }
}
