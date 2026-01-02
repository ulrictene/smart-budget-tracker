import { api } from "../lib/api";

export type MeResponse = {
  id: string;
  email: string;
  createdAt: string;
};

export function getMe() {
  return api<MeResponse>("/me");
}
