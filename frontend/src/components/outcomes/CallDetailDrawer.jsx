import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
  MessageSquare,
} from "lucide-react";
import Badge from "../Badge";
import Button from "../Button";
import { api } from "../../api/client";
import { formatDate } from "../../utils/format";

export default function CallDetailDrawer({ callId, onClose }) {
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTechnical, setShowTechnical] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      if (!callId) return;
      setLoading(true);
      try {
        const res = await api.get(`/outcomes/calls/${callId}`);
        setCall(res);
      } catch (err) {
        console.error("Failed to load call detail", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [callId]);

  if (!callId) return null;

  const renderTranscript = () => {
    const raw = call?.transcript;
    if (!raw) {
      return (
        <div className="p-6 text-center text-muted t-body-xs bg-surface-strong/20 rounded-lg border border-hairline">
          Transcript not received for this call.
        </div>
      );
    }

    if (Array.isArray(raw)) {
      return (
        <div className="space-y-3 max-h-72 overflow-y-auto p-3 rounded-lg bg-surface-strong/30 border border-hairline">
          {raw.map((msg, i) => {
            const isBot = msg.role === "assistant" || msg.speaker === "assistant" || msg.role === "agent";
            return (
              <div key={i} className={`flex flex-col ${isBot ? "items-start" : "items-end"}`}>
                <span className="text-[10px] font-mono text-muted mb-0.5 uppercase">
                  {isBot ? "TARA Voice Assistant" : "Customer"}
                </span>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    isBot ? "bg-white border border-hairline text-ink shadow-xs" : "bg-primary text-on-primary"
                  }`}
                >
                  {msg.content || msg.text || JSON.stringify(msg)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // String transcript
    const lines = String(raw).split("\n").filter((l) => l.trim().length > 0);
    return (
      <div className="space-y-2 max-h-72 overflow-y-auto p-3 rounded-lg bg-surface-strong/30 border border-hairline text-xs font-mono text-ink">
        {lines.map((l, i) => (
          <div key={i} className="py-0.5 border-b border-hairline/40 last:border-none">
            {l}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-surface-card h-full shadow-2xl flex flex-col justify-between border-l border-hairline">
        {/* Header */}
        <div className="p-5 border-b border-hairline flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-primary" />
              <h2 className="t-heading-sm text-ink">{call?.recipient_name || "Call Record"}</h2>
              <Badge variant={call?.status === "COMPLETED" ? "success" : call?.status === "BLOCKED" ? "warning" : "default"}>
                {call?.status || "LOADING"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted font-mono">
              <span>{call?.phone_masked}</span>
              <span>•</span>
              <span>#{callId.slice(-6)}</span>
              {call?.test_run_label && (
                <>
                  <span>•</span>
                  <span className="bg-surface-strong px-2 py-0.5 rounded text-[11px] text-body">
                    {call.test_run_label}
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-strong text-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="p-12 text-center text-muted t-body-sm">Loading call details...</div>
          ) : (
            <>
              {/* Campaign Link & Timing */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-surface-strong/40 border border-hairline t-body-xs">
                <div>
                  <span className="text-muted block text-[11px]">Campaign:</span>
                  {call.campaign_id ? (
                    <Link to={`/app/campaigns/${call.campaign_id}`} className="font-semibold text-primary hover:underline">
                      {call.campaign_name || "View Campaign"}
                    </Link>
                  ) : (
                    <span className="text-muted">Ad-hoc dispatch</span>
                  )}
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Duration:</span>
                  <span className="font-semibold font-mono text-ink">
                    {call.outcome?.duration_seconds ? `${call.outcome.duration_seconds}s` : "—"}
                  </span>
                </div>
              </div>

              {/* Status Timeline */}
              <div>
                <h4 className="t-label text-xs text-muted mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Event Lifecycle Timeline
                </h4>
                <div className="space-y-2 border-l-2 border-hairline-strong ml-2 pl-3">
                  {(call.timeline || []).map((t, i) => (
                    <div key={i} className="relative pb-2">
                      <div className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink uppercase tracking-wider">{t.event}</span>
                        <span className="text-[11px] text-muted font-mono">{formatDate(t.timestamp)}</span>
                      </div>
                      <span className="text-[11px] text-muted">source: {t.source}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outcome & Extracted Fields */}
              <div>
                <h4 className="t-label text-xs text-muted mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Structured Extraction & Outcome
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-surface-strong/30 border border-hairline">
                    <span className="text-muted block text-[11px]">Interest Level:</span>
                    <strong className="text-ink text-sm">{call.outcome?.interest_level || "Not detected"}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-strong/30 border border-hairline">
                    <span className="text-muted block text-[11px]">Preferred Amount:</span>
                    <strong className="text-ink text-sm">{call.outcome?.preferred_amount || "—"}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-strong/30 border border-hairline">
                    <span className="text-muted block text-[11px]">Callback Time:</span>
                    <strong className="text-ink text-sm">{call.outcome?.preferred_callback_time || "—"}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-strong/30 border border-hairline">
                    <span className="text-muted block text-[11px]">Language Detected:</span>
                    <strong className="text-ink text-sm uppercase">{call.outcome?.language_used || "—"}</strong>
                  </div>
                </div>
              </div>

              {/* Transcript */}
              <div>
                <h4 className="t-label text-xs text-muted mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Call Transcript
                </h4>
                {renderTranscript()}
              </div>

              {/* Telephony Metadata */}
              {(call.hangup_reason || call.blocked_reason || call.error) && (
                <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 text-xs text-amber-950 space-y-1">
                  {call.hangup_reason && <div><strong>Hangup Reason:</strong> {call.hangup_reason}</div>}
                  {call.blocked_reason && <div><strong>Blocked Reason:</strong> {call.blocked_reason}</div>}
                  {call.error && <div><strong>Error Detail:</strong> {call.error}</div>}
                </div>
              )}

              {/* Collapsed Technical Details (SUPER_ADMIN only) */}
              {call.technical_details && (
                <div className="pt-2 border-t border-hairline">
                  <button
                    onClick={() => setShowTechnical(!showTechnical)}
                    className="flex items-center justify-between w-full py-2 text-xs font-mono text-muted hover:text-ink"
                  >
                    <span>Technical Details (SUPER_ADMIN)</span>
                    {showTechnical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showTechnical && (
                    <pre className="p-3 mt-2 rounded-lg bg-surface-dark text-on-dark text-[11px] font-mono overflow-x-auto max-h-60">
                      {JSON.stringify(call.technical_details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-hairline bg-surface-strong/20 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
