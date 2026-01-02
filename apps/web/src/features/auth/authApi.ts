import { api } from "../../lib/api";

export type AuthResponse = { token: string };

export async function login(email: string, password: string) {
  return api<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
