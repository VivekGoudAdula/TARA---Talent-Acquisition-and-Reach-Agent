import React, { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/Button";
import DashboardMetrics from "../components/dashboard/DashboardMetrics";
import RecentActivity from "../components/dashboard/RecentActivity";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await api.get("/workspace/dashboard");
      setData(res);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load workspace dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-hairline">
        <div>
          <h1 className="t-h1 text-ink flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-muted" />
            Workspace Dashboard
          </h1>
          <p className="t-body text-muted mt-1">
            Welcome back, {user?.name || "User"}. High-level health, audience readiness, and outreach progress.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl t-caption">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="p-12 text-center text-muted t-body bg-surface-card rounded-2xl border border-hairline">
          Loading workspace metrics...
        </div>
      )}

      {data && (
        <>
          {/* Real Data Summary Cards */}
          <DashboardMetrics summary={data.summary || data.summary_cards} />

          {/* Recent Activity (last 10 from audit_log) */}
          <RecentActivity activities={data.recent_activity} />
        </>
      )}
    </div>
  );
}
