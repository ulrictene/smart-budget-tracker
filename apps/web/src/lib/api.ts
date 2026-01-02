// const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// export async function api<T>(
//   path: string,
//   options: RequestInit = {}
// ): Promise<T> {
//   const res = await fetch(`${API_URL}${path}`, {
//     ...options,
//     headers: {
//       "Content-Type": "application/json",
//       ...(options.headers || {}),
//     },
//   });

//   if (!res.ok) {
//     const message = await res.text();
//     throw new Error(message || `Request failed: ${res.status}`);
//   }

//   return res.json() as Promise<T>;
// }
import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

