
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth";
import { getMe, type MeResponse } from "../features/meApi";
import { getSummary, type Summary } from "../features/summary/summaryApi";
import {poundsFromPennies} from "../lib/money";
import { getAiSummary } from "../features/ai/aiApi";
import {COLORS} from "../lib/colors";

import { Doughnut, Line } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
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
  const [aiText, setAiText] = useState<string>("");
  const [aiMessage, setAiMessage] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCooldownUntil, setAiCooldownUntil] = useState<number | null>(null);
const [now, setNow] = useState(Date.now());
useEffect(() => {
  const t = setInterval(() => setNow(Date.now()), 500);
  return () => clearInterval(t);
}, []);

const secondsLeft = aiCooldownUntil ? Math.max(0, Math.ceil((aiCooldownUntil - now) / 1000)) : 0;

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
  if (!summary) return { labels: [], datasets: [] };

  return {
    labels: summary.spendByCategory.map((x) => x.categoryName),
    datasets: [
      {
        data: summary.spendByCategory.map((x) => x.amount / 100),
        backgroundColor: COLORS.chart.slice(
          0,
          summary.spendByCategory.length
        ),
        borderWidth: 1,
        borderColor: "#ffffff",
      },
    ],
  };
}, [summary]);

const doughnutOptions = {
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        padding: 16,
        boxWidth: 14,
        font: { size: 12 },
      },
    },
  },
};

  function isCoolingDown(until: number | null) {
  return until !== null && Date.now() < until;
}
const lineData = useMemo(() => {
  if (!summary) return { labels: [], datasets: [] };

  return {
    labels: summary.dailyExpense.map((x) => x.date),
    datasets: [
      {
        label: "Daily spend (£)",
        data: summary.dailyExpense.map((x) => x.amount / 100),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.15)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };
}, [summary]);

const lineOptions: ChartOptions<"line"> = {
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      grid: { color: "#f1f5f9" },
      ticks: {
        callback: (value) => `£${value}`,
      },
    },
    x: {
      grid: { display: false },
    },
  },
};



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
            <div style={{border: "1px solid #eee",borderRadius: 12,padding: 16}}>
           <div style={{ opacity: 0.7 }}>Income</div>
           <div style={{ fontSize: 26, fontWeight: 700 }}>
            {poundsFromPennies(summary.totalIncome)}
          </div>
          </div>

            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16}}>
              <div style={{ opacity: 0.7 }}>Expenses</div>
              <div style={{ fontSize: 26, fontWeight: 700}}>{poundsFromPennies(summary.totalExpense)}</div>
            </div>
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16}}>
              <div style={{ opacity: 0.7 }}>Net</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{poundsFromPennies(summary.net)}</div>
            </div>
          </div>
          <div style={{ marginTop: 16, marginBottom:16, display: "flex", gap: 10, alignItems: "center" }}>
  <button
  type="button"
  disabled={aiLoading || isCoolingDown(aiCooldownUntil)}
  onClick={async () => {
    try {
      setAiLoading(true);
      setAiMessage("");
      setAiText("");

      const data = await getAiSummary(month);

      if ("fallback" in data && data.fallback) {
        setAiMessage(data.message || "AI summary is unavailable right now.");
        setAiCooldownUntil(Date.now() + 30_000);
        return;
      }

      setAiText(data.ai);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI summary failed";

      if (msg.includes("429") || msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("quota")) {
        setAiMessage("AI is busy right now. Try again in a minute.");
        setAiCooldownUntil(Date.now() + 60_000);
      } else if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("permission")) {
        setAiMessage("AI summary isn’t enabled for this environment yet.");
      } else {
        setAiMessage("Couldn’t generate the AI summary. Please try again.");
      }
    } finally {
      setAiLoading(false);
    }
  }}
>
  {aiLoading
    ? "Generating…"
    : isCoolingDown(aiCooldownUntil)
      ? `Try again in ${secondsLeft}s`
      : "Generate AI summary"}
</button>

</div>

{(aiMessage || aiText) && (
  <div
    style={{
      marginTop: 12,
      border: "1px solid #eee",
      borderRadius: 10,
      padding: 14,
     
    }}
  >
    <h3 style={{ marginTop: 0 }}>AI Summary</h3>

    {aiMessage && (
      <p style={{ margin: 0, opacity: 0.9 }}>
        {aiMessage}
      </p>
    )}

    {aiText && (
      <pre style={{ whiteSpace: "pre-wrap", margin: "10px 0 0 0" }}>
        {aiText}
      </pre>
    )}

    {aiMessage && (
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            setAiMessage("");
            setAiText("");
            setAiCooldownUntil(null);
          }}
        >
          Dismiss
        </button>
      </div>
    )}
  </div>
)}

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Spend by category</h3>
              {summary.spendByCategory.length ? 
              <Doughnut data={doughnutData} options={doughnutOptions} />
              : <p>No expense data yet.</p>}
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Daily spend trend</h3>
              {summary.dailyExpense.length ?  <Line data={lineData} options={lineOptions} />: <p>No expense data yet.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
