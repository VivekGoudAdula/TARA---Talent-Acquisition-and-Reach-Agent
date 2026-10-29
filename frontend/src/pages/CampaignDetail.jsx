import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pause, Play, Ban, RotateCcw, Edit, RefreshCw, ShieldAlert, PhoneCall, ExternalLink, BarChart3 } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Badge from "../components/Badge";
import { api } from "../api/client";
import { formatDate } from "../utils/format";

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [progress, setProgress] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const camp = await api.get(`/campaigns/${id}`);
      setCampaign(camp);

      const prog = await api.get(`/campaigns/${id}/progress`);
      setProgress(prog);

      let q = `/campaigns/${id}/recipients?page=${page}&page_size=50`;
      if (statusFilter) q += `&status=${statusFilter}`;
      const rec = await api.get(q);
      setRecipients(rec.items || []);
      setPagination(rec.pagination || { total: 0, total_pages: 1 });
    } catch (err) {
      console.error("Failed to load campaign data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, page, statusFilter]);

  // Polling every 10s when active or launching, pausing when document is hidden
  useEffect(() => {
    if (!campaign || !["ACTIVE", "LAUNCHING"].includes(campaign.status)) return;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadData();
    }, 10000);

    return () => clearInterval(timer);
  }, [campaign?.status, page, statusFilter]);

  const handleAction = async (endpoint, method = "post") => {
    setActionLoading(true);
    try {
      await api[method](`/campaigns/${id}/${endpoint}`);
      await loadData();
    } catch (err) {
      alert(err.message || `Failed to execute ${endpoint}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !campaign) {
    return <div className="p-12 text-center text-muted t-body-sm">Loading campaign details...</div>;
  }

  const counts = progress?.counts_by_status || {};
  const total = progress?.total_recipients || 0;
  const contacted = (counts.CONTACTED || 0) + (counts.INTERESTED || 0) + (counts.CALLBACK || 0) + (counts.NOT_INTERESTED || 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/app/campaigns")}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Campaigns
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="t-heading-sm text-ink">{campaign.name}</h1>
              <Badge variant={campaign.status === "ACTIVE" || campaign.status === "LAUNCHING" ? "info" : campaign.status === "COMPLETED" ? "success" : "default"}>
                {campaign.status}
              </Badge>
              <span className="t-body-xs font-mono text-muted bg-surface-strong px-2 py-0.5 rounded">
                v{campaign.config_version}
              </span>
              {campaign.test_run_label && (
                <span className="t-body-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                  tag: {campaign.test_run_label}
                </span>
              )}
            </div>
            <p className="t-body-xs text-muted mt-0.5">
              {campaign.product_name} • {campaign.entity_type}s • Updated {formatDate(campaign.updated_at)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {["ACTIVE", "LAUNCHING"].includes(campaign.status) && (
            <Button variant="outline" size="sm" onClick={() => handleAction("pause")} disabled={actionLoading}>
              <Pause className="w-3.5 h-3.5 mr-1" /> Pause
            </Button>
          )}
          {campaign.status === "PAUSED" && (
            <Button variant="primary" size="sm" onClick={() => handleAction("resume")} disabled={actionLoading}>
              <Play className="w-3.5 h-3.5 mr-1" /> Resume
            </Button>
          )}
          {["DRAFT", "READY"].includes(campaign.status) && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/app/campaigns/${id}/edit`)}>
              <Edit className="w-3.5 h-3.5 mr-1" /> Edit Wizard
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleAction("retry")} disabled={actionLoading} title="Retry failed or unanswered recipients">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry Failed
          </Button>
          <Link to={`/app/outcomes?campaign_id=${id}`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-3.5 h-3.5 mr-1 text-primary" /> Outcomes & Evidence
            </Button>
          </Link>
          {!["COMPLETED", "CANCELLED"].includes(campaign.status) && (
            <Button variant="text" size="sm" onClick={() => handleAction("cancel")} disabled={actionLoading} className="text-semantic-error">
              <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Progress Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Audience", count: total, color: "text-ink" },
          { label: "Calling / In-Flight", count: counts.CALLING || 0, color: "text-sky-600" },
          { label: "Contacted", count: contacted, color: "text-emerald-700 font-bold" },
          { label: "Interested", count: counts.INTERESTED || 0, color: "text-emerald-600" },
          { label: "No Answer / Busy", count: counts.NO_ANSWER || 0, color: "text-amber-600" },
          { label: "Blocked Compliance", count: counts.BLOCKED || 0, color: "text-semantic-error font-medium" },
        ].map((m, i) => (
          <Card key={i} className="p-3 bg-surface-card">
            <span className="t-label text-muted text-[11px] truncate block">{m.label}</span>
            <span className={`text-2xl font-bold font-mono mt-0.5 block ${m.color}`}>{m.count}</span>
          </Card>
        ))}
      </div>

      {/* Blocked Reasons Breakdown Card (if any blocked) */}
      {Object.keys(progress?.blocked_reasons_breakdown || {}).length > 0 && (
        <Card className="p-4 bg-amber-50/50 border-amber-200">
          <div className="flex items-center gap-2 mb-2 t-label text-amber-900 font-semibold">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Compliance Gate Breakdown (Calls Safeguarded)
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(progress.blocked_reasons_breakdown).map(([reason, count]) => (
              <span key={reason} className="px-2.5 py-1 rounded-full text-xs font-mono bg-white border border-amber-200 text-amber-950 shadow-xs">
                {reason}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Recipients Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-hairline flex flex-wrap items-center justify-between gap-4">
          <h3 className="t-heading-sm text-ink flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-muted" /> Campaign Recipients ({total})
          </h3>
          <div className="flex items-center gap-2">
            <span className="t-label text-xs text-muted">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input-base text-xs py-1 px-2.5 h-8"
            >
              <option value="">All Statuses</option>
              {["PENDING", "CALLING", "CONTACTED", "INTERESTED", "CALLBACK", "NOT_INTERESTED", "NO_ANSWER", "BLOCKED", "FAILED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full overflow-hidden">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col style={{ width: "18%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "7%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-hairline bg-surface-strong/50 text-muted text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2 px-2.5">Recipient Name</th>
                <th className="py-2 px-2.5">Snapshot Fit</th>
                <th className="py-2 px-2.5">Policy Eligibility</th>
                <th className="py-2 px-2.5">Outreach Status</th>
                <th className="py-2 px-2.5">Tester Scenario</th>
                <th className="py-2 px-2.5">Attempts</th>
                <th className="py-2 px-2.5">Last Contact</th>
                <th className="py-2 px-2.5 text-right">Call Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted text-xs">
                    No recipients found matching current status filter.
                  </td>
                </tr>
              ) : (
                recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-strong/30">
                    <td className="py-2 px-2.5 font-semibold text-ink text-xs truncate" title={r.name}>{r.name}</td>
                    <td className="py-2 px-2.5">
                      <Badge variant={r.band === "HIGH" ? "success" : r.band === "MEDIUM" ? "info" : "warning"} className="text-[10px] px-1.5 py-0.5">
                        {r.band} ({Math.round(r.match_score)}%)
                      </Badge>
                    </td>
                    <td className="py-2 px-2.5">
                      <Badge variant={r.eligibility === "ELIGIBLE" ? "success" : "danger"} className="text-[10px] px-1.5 py-0.5">{r.eligibility}</Badge>
                    </td>
                    <td className="py-2 px-2.5">
                      <Badge variant={r.status === "INTERESTED" ? "success" : r.status === "BLOCKED" ? "warning" : r.status === "CALLING" ? "info" : "default"} className="text-[10px] px-1.5 py-0.5">
                        {r.status}
                      </Badge>
                      {r.blocked_reason && <span className="block text-[10px] font-mono text-muted mt-0.5 truncate" title={r.blocked_reason}>{r.blocked_reason}</span>}
                    </td>
                    <td className="py-2 px-2.5 text-xs truncate">
                      {["DRAFT", "READY"].includes(campaign.status) ? (
                        <input
                          type="text"
                          defaultValue={r.tester_scenario || ""}
                          placeholder="e.g. interested+amount"
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val !== (r.tester_scenario || "")) {
                              try {
                                await api.patch(`/campaigns/${id}/recipients/${r.entity_id}/scenario`, { tester_scenario: val || null });
                              } catch (err) {
                                console.error("Failed to update scenario", err);
                              }
                            }
                          }}
                          className="input-base text-[11px] py-1 px-1.5 h-6 w-full max-w-[130px] font-mono"
                        />
                      ) : (
                        <span className="font-mono text-muted text-[10px] truncate block">{r.tester_scenario || "—"}</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-xs font-mono text-muted">{r.attempts}</td>
                    <td className="py-2 px-2.5 text-[11px] text-muted truncate">{r.last_contact_at ? formatDate(r.last_contact_at) : "—"}</td>
                    <td className="py-2 px-2.5 text-right">
                      {r.last_communication_id ? (
                        <span className="text-[11px] font-mono text-muted flex items-center justify-end gap-1">
                          #{r.last_communication_id.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-muted-soft text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-hairline bg-surface-strong/30 t-body-xs">
            <span className="text-muted">
              Showing {recipients.length} of {pagination.total} recipients (Page {page} of {pagination.total_pages})
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
