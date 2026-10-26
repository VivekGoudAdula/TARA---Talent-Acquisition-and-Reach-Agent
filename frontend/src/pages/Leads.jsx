import React, { useState, useEffect, useCallback } from "react";
import { Search, X, RefreshCw, Sparkles } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Modal from "../components/Modal";
import ProductMatchesSection from "../components/ProductMatchesSection";
import {
  formatCurrency,
  formatLanguage,
  getLanguageVariant,
  formatSegment,
  formatSource,
} from "../utils/format";

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 15, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sampleLoading, setSampleLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [consent, setConsent] = useState("");
  const [dnd, setDnd] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);

  const fetchLeads = useCallback(
    async (pageToLoad = 1) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: pageToLoad.toString(),
          page_size: pagination.page_size.toString(),
        });
        if (search.trim()) params.append("search", search.trim());
        if (language) params.append("language", language);
        if (consent !== "") params.append("consent", consent);
        if (dnd !== "") params.append("dnd", dnd);

        const res = await api.get(`/leads?${params.toString()}`);
        setLeads(res.items);
        setPagination(res.pagination);
      } catch (err) {
        setError(err.message || "Failed to load leads");
      } finally {
        setLoading(false);
      }
    },
    [search, language, consent, dnd, pagination.page_size]
  );

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  const handleResetFilters = () => {
    setSearch("");
    setLanguage("");
    setConsent("");
    setDnd("");
  };

  const handleLoadSampleData = async () => {
    setSampleLoading(true);
    setError("");
    try {
      await api.post("/workspace/sample-data", {});
      await fetchLeads(1);
    } catch (err) {
      setError(err.message || "Could not load sample data.");
    } finally {
      setSampleLoading(false);
    }
  };

  const columns = [
    {
      header: "Lead Name",
      accessor: "name",
      className: "t-body-strong text-ink",
      render: (row) => (
        <div>
          <div className="t-body-strong text-ink">{row.name}</div>
          <div className="t-caption text-muted">{row.phone}</div>
        </div>
      ),
    },
    {
      header: "City & Age",
      className: "whitespace-nowrap",
      render: (row) => (
        <div>
          <span className="t-body-strong text-ink">{row.city}</span>
          <span className="t-caption text-muted ml-1.5">({row.age}y)</span>
        </div>
      ),
    },
    {
      header: "Language",
      className: "whitespace-nowrap",
      render: (row) => (
        <Badge variant={getLanguageVariant(row.language)}>
          {formatLanguage(row.language)}
        </Badge>
      ),
    },
    {
      header: "Monthly Income",
      className: "whitespace-nowrap",
      render: (row) => (
        <span className="t-table text-body-strong">
          {formatCurrency(row.income)}
        </span>
      ),
    },
    {
      header: "Segment",
      className: "whitespace-nowrap",
      render: (row) => (
        <span className="t-table text-body">{formatSegment(row.segment)}</span>
      ),
    },
    {
      header: "Consent",
      className: "whitespace-nowrap",
      render: (row) =>
        row.consent ? (
          <Badge variant="success">Consent Given</Badge>
        ) : (
          <Badge variant="danger">No Consent</Badge>
        ),
    },
    {
      header: "DND Status",
      className: "whitespace-nowrap",
      render: (row) =>
        row.dnd ? <Badge variant="danger">DND Active</Badge> : <Badge variant="default">DND Cleared</Badge>,
    },
    {
      header: "Source",
      className: "whitespace-nowrap",
      render: (row) => (
        <span className="t-caption text-muted">{formatSource(row.source)}</span>
      ),
    },
  ];

  const emptyActionBtn =
    user?.role === "SUPER_ADMIN" ? (
      <Button
        variant="primary"
        size="sm"
        onClick={handleLoadSampleData}
        disabled={sampleLoading}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>{sampleLoading ? "Loading..." : "Load sample data"}</span>
      </Button>
    ) : null;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="t-display-sm font-bold text-ink">Leads Registry</h1>
          <p className="t-body-sm text-muted mt-1">
            External borrower pool strictly isolated to {user?.tenant_name || "this workspace"}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLeads(pagination.page)}
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface-card border border-hairline rounded-xl p-3 flex flex-wrap items-center gap-3 shadow-soft">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-muted absolute left-3 top-3.5" />
          <input
            id="leads-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by borrower name or phone..."
            className="input-base pl-9 !h-[44px]"
          />
        </div>

        <select
          id="leads-lang-filter"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="input-base !h-[44px] !w-auto cursor-pointer"
        >
          <option value="">All Languages</option>
          <option value="telugu">Telugu</option>
          <option value="hindi">Hindi</option>
          <option value="english">English</option>
        </select>

        <select
          id="leads-consent-filter"
          value={consent}
          onChange={(e) => setConsent(e.target.value)}
          className="input-base !h-[44px] !w-auto cursor-pointer"
        >
          <option value="">All Consent</option>
          <option value="true">Consent Given</option>
          <option value="false">No Consent</option>
        </select>

        <select
          id="leads-dnd-filter"
          value={dnd}
          onChange={(e) => setDnd(e.target.value)}
          className="input-base !h-[44px] !w-auto cursor-pointer"
        >
          <option value="">All DND</option>
          <option value="true">DND Active</option>
          <option value="false">DND Cleared</option>
        </select>

        {(search || language || consent !== "" || dnd !== "") && (
          <Button variant="text" size="sm" onClick={handleResetFilters}>
            <X className="w-3.5 h-3.5" />
            <span>Clear</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-md bg-red-50 border border-semantic-error/20 t-caption text-semantic-error">
          {error}
        </div>
      )}

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        pagination={pagination}
        onPageChange={(newPage) => fetchLeads(newPage)}
        onRowClick={(lead) => setSelectedLead(lead)}
        emptyMessage="No leads found in this workspace."
        emptyAction={emptyActionBtn}
      />

      {/* Lead Details Dialog Box */}
      <Modal
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title={selectedLead?.name}
        subtitle={selectedLead ? `ID: ${selectedLead.id}` : ""}
      >
        {selectedLead && (
          <div className="space-y-5 font-sans">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-canvas p-4 rounded-xl border border-hairline">
                <span className="t-label text-muted block mb-1">Phone Number</span>
                <span className="t-body-strong text-ink">{selectedLead.phone}</span>
              </div>
              <div className="bg-canvas p-4 rounded-xl border border-hairline">
                <span className="t-label text-muted block mb-1">Monthly Income</span>
                <span className="t-body-strong text-ink">{formatCurrency(selectedLead.income)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="t-label text-muted-soft">Profile & Demographics</h4>
              <div className="bg-canvas rounded-xl border border-hairline divide-y divide-hairline">
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-body">Language</span>
                  <Badge variant={getLanguageVariant(selectedLead.language)}>
                    {formatLanguage(selectedLead.language)}
                  </Badge>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-body">City</span>
                  <span className="text-ink t-body-strong">{selectedLead.city}</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-body">Age</span>
                  <span className="text-ink">{selectedLead.age} years</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-body">Employment Segment</span>
                  <span className="text-ink font-medium">{formatSegment(selectedLead.segment)}</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-body">Source</span>
                  <span className="text-ink font-medium">{formatSource(selectedLead.source)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="t-label text-muted-soft">Compliance Status</h4>
              <div className="bg-canvas rounded-xl border border-hairline divide-y divide-hairline">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-body">Explicit Consent</span>
                  {selectedLead.consent ? (
                    <Badge variant="success">Consent Verified</Badge>
                  ) : (
                    <Badge variant="danger">Consent Missing</Badge>
                  )}
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-body">National DND Registry</span>
                  {selectedLead.dnd ? (
                    <Badge variant="danger">Registered on DND</Badge>
                  ) : (
                    <Badge variant="default">DND Cleared</Badge>
                  )}
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-body">Tenant Isolation ID</span>
                  <span className="text-muted t-caption">{selectedLead.tenant_id}</span>
                </div>
              </div>
            </div>

            {/* Product Fit & Policy Eligibility Section */}
            <ProductMatchesSection entityType="lead" entityId={selectedLead.id} />
          </div>
        )}
      </Modal>
    </div>
  );
}
