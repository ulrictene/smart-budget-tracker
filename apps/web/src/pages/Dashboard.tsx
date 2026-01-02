import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, type MeResponse } from "../features/meApi";
import { clearToken } from "../lib/auth";

export default function DashboardPage() {
  const navigate = useNavigate();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((data) => setMe(data))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Failed to load profile";
        setError(msg);

        if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("invalid token")) {
          clearToken();
          navigate("/login", { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  function onLogout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Dashboard</h1>
        <button onClick={onLogout}>Logout</button>
      </div>

      {loading && <p>Loading your profile...</p>}

      {error && (
        <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
          {error}
        </p>
      )}

      {me && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <p><strong>User ID:</strong> {me.id}</p>
          <p><strong>Email:</strong> {me.email}</p>
          <p><strong>Created:</strong> {new Date(me.createdAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
