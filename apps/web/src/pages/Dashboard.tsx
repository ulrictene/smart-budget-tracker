
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth";
import { getMe, type MeResponse } from "../features/meApi";
import { getSummary, type Summary } from "../features/summary/summaryApi";
import {poundsFromPennies} from "../lib/money";

import { Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(toYYYYMM(new Date()));

  const [me, setMe] = useState<MeResponse | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    setLoadingMe(true);
    getMe()
      .then(setMe)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load profile");
        clearToken();
        navigate("/login", { replace: true });
      })
      .finally(() => setLoadingMe(false));
  }, [navigate]);

  useEffect(() => {
    setLoadingSummary(true);
    setError(null);
    getSummary(month)
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load summary"))
      .finally(() => setLoadingSummary(false));
  }, [month]);

  function onLogout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  const doughnutData = useMemo(() => {
    const labels = summary?.spendByCategory.map((x) => x.categoryName) ?? [];
    const values = summary?.spendByCategory.map((x) => x.amount / 100) ?? [];
    return {
      labels,
      datasets: [{ label: "Spend (£)", data: values }],
    };
  }, [summary]);

  const lineData = useMemo(() => {
    const labels = summary?.dailyExpense.map((x) => x.date) ?? [];
    const values = summary?.dailyExpense.map((x) => x.amount / 100) ?? [];
    return {
      labels,
      datasets: [{ label: "Daily spend (£)", data: values }],
    };
  }, [summary]);

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1>Dashboard</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button onClick={() => navigate("/transactions")}>Transactions</button>
          <button onClick={() => navigate("/categories")}>Categories</button>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <div style={{ opacity: 0.75, marginBottom: 12 }}>
        {loadingMe ? "Loading user…" : me ? `Signed in as ${me.email}` : ""}
      </div>

      {loadingSummary || !summary ? (
        <p>Loading summary…</p>
      ) : (
        <>
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
            <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
              <div style={{ opacity: 0.7 }}>Income</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{poundsFromPennies(summary.totalIncome)}</div>
            </div>
            <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
              <div style={{ opacity: 0.7 }}>Expenses</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{poundsFromPennies(summary.totalExpense)}</div>
            </div>
            <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
              <div style={{ opacity: 0.7 }}>Net</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{poundsFromPennies(summary.net)}</div>
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Spend by category</h3>
              {summary.spendByCategory.length ? <Doughnut data={doughnutData} /> : <p>No expense data yet.</p>}
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Daily spend trend</h3>
              {summary.dailyExpense.length ? <Line data={lineData} /> : <p>No expense data yet.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
