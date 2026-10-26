import React, { useState, useEffect, useCallback } from "react";
import { Search, X, RefreshCw, Sparkles, HeartPulse } from "lucide-react";
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
  formatRepayment,
  getRepaymentVariant,
} from "../utils/format";

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 15, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sampleLoading, setSampleLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [consent, setConsent] = useState("");
  const [dnd, setDnd] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const fetchCustomers = useCallback(
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

        const res = await api.get(`/customers?${params.toString()}`);
        setCustomers(res.items);
        setPagination(res.pagination);
      } catch (err) {
        setError(err.message || "Failed to load customers");
      } finally {
        setLoading(false);
      }
    },
    [search, language, consent, dnd, pagination.page_size]
  );

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

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
      await fetchCustomers(1);
    } catch (err) {
      setError(err.message || "Could not load sample data.");
    } finally {
      setSampleLoading(false);
    }
  };

  const columns = [
    {
      header: "Customer Name",
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
      header: "Location & Age",
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
      header: "Health Score",
      className: "whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center gap-1.5 t-table text-body-strong">
          <HeartPulse
            className={`w-3.5 h-3.5 ${
              row.financial_health >= 75
                ? "text-semantic-success"
                : row.financial_health >= 60
                ? "text-amber-600"
                : "text-semantic-error"
            }`}
          />
          <span>{row.financial_health}/100</span>
        </div>
      ),
    },
    {
      header: "Repayment",
      className: "whitespace-nowrap",
      render: (row) => (
        <Badge variant={getRepaymentVariant(row.repayment_behaviour)}>
          {formatRepayment(row.repayment_behaviour)}
        </Badge>
      ),
    },
    {
      header: "Existing Products",
      className: "whitespace-nowrap",
      render: (row) =>
        row.existing_products && row.existing_products.length > 0 ? (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="px-2.5 py-0.5 rounded-full bg-surface-strong border border-hairline t-caption text-body">
              {row.existing_products[0]}
            </span>
            {row.existing_products.length > 1 && (
              <span className="px-2 py-0.5 rounded-full bg-surface-strong text-muted t-caption font-medium">
                +{row.existing_products.length - 1} more
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted t-caption">—</span>
        ),
    },
    {
      header: "DND Status",
      className: "whitespace-nowrap",
      render: (row) =>
        row.dnd ? <Badge variant="danger">DND Active</Badge> : <Badge variant="default">DND Cleared</Badge>,
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
          <h1 className="t-display-sm font-bold text-ink">Customers Registry</h1>
          <p className="t-body-sm text-muted mt-1">
            Existing institutional accounts eligible for portfolio evaluation and cross-sell campaigns.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchCustomers(pagination.page)}
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
            id="customers-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name or phone..."
            className="input-base pl-9 !h-[44px]"
          />
        </div>

        <select
          id="customers-lang-filter"
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
          id="customers-consent-filter"
          value={consent}
          onChange={(e) => setConsent(e.target.value)}
          className="input-base !h-[44px] !w-auto cursor-pointer"
        >
          <option value="">All Consent</option>
          <option value="true">Consent Given</option>
          <option value="false">No Consent</option>
        </select>

        <select
          id="customers-dnd-filter"
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
        data={customers}
        loading={loading}
        pagination={pagination}
        onPageChange={(newPage) => fetchCustomers(newPage)}
        onRowClick={(cust) => setSelectedCustomer(cust)}
        emptyMessage="No customer records found in this workspace."
        emptyAction={emptyActionBtn}
      />

      {/* Customer Details Dialog Box */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name}
        subtitle={selectedCustomer ? `ID: ${selectedCustomer.id}` : ""}
      >
        {selectedCustomer && (
          <div className="space-y-5 font-sans">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-canvas p-4 rounded-xl border border-hairline">
                <span className="t-label text-muted block mb-1">Phone Number</span>
                <span className="t-body-strong text-ink">{selectedCustomer.phone}</span>
              </div>
              <div className="bg-canvas p-4 rounded-xl border border-hairline">
                <span className="t-label text-muted block mb-1">Monthly Income</span>
                <span className="t-body-strong text-ink">{formatCurrency(selectedCustomer.income)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="t-label text-muted-soft">Financial Standing</h4>
              <div className="bg-canvas rounded-xl border border-hairline divide-y divide-hairline">
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-body">Health Score</span>
                  <div className="flex items-center gap-1.5 font-medium text-ink">
                    <HeartPulse className="w-4 h-4 text-semantic-success" />
                    <span>{selectedCustomer.financial_health}/100</span>
                  </div>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-body">Repayment Track</span>
                  <Badge variant={getRepaymentVariant(selectedCustomer.repayment_behaviour)}>
                    {formatRepayment(selectedCustomer.repayment_behaviour)}
                  </Badge>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-body">Preferred Language</span>
                  <Badge variant={getLanguageVariant(selectedCustomer.language)}>
                    {formatLanguage(selectedCustomer.language)}
                  </Badge>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-body">Location</span>
                  <span className="text-ink t-body-strong">
                    {selectedCustomer.city}, {selectedCustomer.state || "India"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="t-label text-muted-soft">Existing Bank Products</h4>
              <div className="bg-canvas rounded-xl border border-hairline p-3.5">
                <div className="flex flex-wrap gap-2">
                  {selectedCustomer.existing_products?.map((prod, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-surface-card border border-hairline t-body-sm text-body-strong shadow-soft"
                    >
                      {prod}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="t-label text-muted-soft">Compliance & Isolation</h4>
              <div className="bg-canvas rounded-xl border border-hairline divide-y divide-hairline">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-body">National DND Registry</span>
                  {selectedCustomer.dnd ? (
                    <Badge variant="danger">Registered on DND</Badge>
                  ) : (
                    <Badge variant="default">DND Cleared</Badge>
                  )}
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-body">Tenant Isolation ID</span>
                  <span className="text-muted t-caption">{selectedCustomer.tenant_id}</span>
                </div>
              </div>
            </div>

            {/* Product Fit & Policy Eligibility Section */}
            <ProductMatchesSection entityType="customer" entityId={selectedCustomer.id} />
          </div>
        )}
      </Modal>
    </div>
  );
}
