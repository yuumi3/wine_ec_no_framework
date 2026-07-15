// ログイン状態とカート件数を保持するミニストア。サーバの状態が常に正。
import { authApi } from "../api/auth.ts";
import { cartApi } from "../api/cart.ts";
import type { PublicUser } from "../api/types.ts";

type State = {
  user: PublicUser | null;
  cartCount: number;
  loaded: boolean;
};

const state: State = { user: null, cartCount: 0, loaded: false };

export const session = {
  get user(): PublicUser | null {
    return state.user;
  },
  get cartCount(): number {
    return state.cartCount;
  },
  get isLoggedIn(): boolean {
    return state.user !== null;
  },

  /** 起動時にサーバからログイン状態とカート件数を復元する。 */
  async load(): Promise<void> {
    try {
      const { user } = await authApi.me();
      state.user = user;
      await this.refreshCart();
    } catch {
      state.user = null;
      state.cartCount = 0;
    } finally {
      state.loaded = true;
    }
  },

  async refreshCart(): Promise<void> {
    if (!state.user) {
      state.cartCount = 0;
      return;
    }
    try {
      const cart = await cartApi.get();
      state.cartCount = cart.count;
    } catch {
      state.cartCount = 0;
    }
  },

  setUser(user: PublicUser): void {
    state.user = user;
  },

  clear(): void {
    state.user = null;
    state.cartCount = 0;
  },
};
