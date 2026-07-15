import { api } from "./client.ts";
import type { PublicUser } from "./types.ts";

export type RegisterInput = {
  email: string;
  password: string;
  passwordConfirm: string;
  fullName: string;
  address: string;
};

export const authApi = {
  register: (input: RegisterInput) => api.post<{ user: PublicUser }>("/auth/register", input),
  login: (email: string, password: string) =>
    api.post<{ user: PublicUser }>("/auth/login", { email, password }),
  logout: () => api.post<null>("/auth/logout"),
  me: () => api.get<{ user: PublicUser }>("/auth/me"),
};
