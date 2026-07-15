// API のレスポンス型定義。

export type PublicUser = {
  id: number;
  email: string;
  fullName: string;
};

export type WineListItem = {
  id: number;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
};

export type WineListResponse = {
  items: WineListItem[];
  nextCursor: number | null;
};

export type WineDetail = {
  id: number;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
  description: string;
  category: string;
  region: string;
  appellation: string | null;
  vintage: number | null;
  grape: string | null;
  alcohol: string | null;
  foodPairing: string | null;
};

export type CartItem = {
  id: number;
  wineId: number;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
  quantity: number;
  subtotal: number;
};

export type Cart = {
  items: CartItem[];
  total: number;
  count: number;
};
