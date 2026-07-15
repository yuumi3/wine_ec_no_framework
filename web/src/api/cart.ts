import { api } from "./client.ts";
import type { Cart } from "./types.ts";

export const cartApi = {
  get: () => api.get<Cart>("/cart"),
  add: (wineId: number, quantity = 1) => api.post<Cart>("/cart/items", { wineId, quantity }),
  update: (itemId: number, quantity: number) => api.put<Cart>(`/cart/items/${itemId}`, { quantity }),
  remove: (itemId: number) => api.del<null>(`/cart/items/${itemId}`),
};
