import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Session } from "@/types";
import { toast } from "sonner";
import Header from "@/components/Header";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import {
  Info,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type AuditAction = "created" | "updated" | "deleted";

interface AuditItem {
  _id: string;
  action: AuditAction;
  websiteId: number;
  url?: string;
  name?: string;
  actor: string;
  fields?: string[];
  summary?: string;
  at: string;
}

interface MonitorOption {
  id: number;
  label: string;
}

export default function AdminAuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [websiteIdFilter, setWebsiteIdFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [monitors, setMonitors] = useState<MonitorOption[]>([]);
  const itemsPerPage = 50;

  const currentPage = Number(router.query.page) || 1;

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.search) {
      setSearchQuery(String(router.query.search));
      setDebouncedSearch(String(router.query.search));
    }
    if (router.query.websiteId) {
      setWebsiteIdFilter(String(router.query.websiteId));
    }
    if (router.query.action) {
      setActionFilter(String(router.query.action));
    }
  }, [router.isReady]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!router.isReady) return;
    const nextQuery: Record<string, string | undefined> = {
      ...router.query,
      search: debouncedSearch || undefined,
      websiteId: websiteIdFilter || undefined,
      action: actionFilter || undefined,
      page: "1",
    };

    const same =
      (router.query.search || "") === (debouncedSearch || "") &&
      (router.query.websiteId || "") === (websiteIdFilter || "") &&
      (router.query.action || "") === (actionFilter || "");

    if (!same) {
      router.push(
        { pathname: router.pathname, query: nextQuery },
        undefined,
        { shallow: true },
      );
    }
  }, [debouncedSearch, websiteIdFilter, actionFilter, router.isReady]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(websiteIdFilter && { websiteId: websiteIdFilter }),
        ...(actionFilter && { action: actionFilter }),
      });

      const response = await fetch(`/api/admin/audit?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
        setTotalCount(data.total || 0);
      } else {
        toast.error("Failed to fetch audit log");
      }
    } catch (error) {
      console.error("Error fetching audit log:", error);
      toast.error("Failed to fetch audit log");
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, websiteIdFilter, actionFilter]);

  useEffect(() => {
    if (status === "loading") return;
    const typedSession = session as Session | null;
    if (!typedSession || !typedSession.user.isAdmin) {
      router.push("/unauthorized");
      return;
    }
    fetchItems();
  }, [session, status, router, fetchItems]);

  useEffect(() => {
    const typedSession = session as Session | null;
    if (!typedSession?.user?.isAdmin) return;

    const loadMonitors = async () => {
      try {
        const response = await fetch("/api/websites?page=1&limit=500");
        if (!response.ok) return;
        const data = await response.json();
        const list = data.success ? data.data : data;
        if (!Array.isArray(list)) return;
        setMonitors(
          list.map((m: { id: number; friendly_name?: string; url?: string }) => ({
            id: m.id,
            label: m.friendly_name || m.url || String(m.id),
          })),
        );
      } catch (error) {
        console.error("Failed to load monitors for filter:", error);
      }
    };

    loadMonitors();
  }, [session]);

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  const goToPage = (page: number) => {
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, page: String(page) },
      },
      undefined,
      { shallow: true },
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatDate = (dateInput: string | Date) => {
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    let label = "";
    if (isToday) label = "Today";
    else if (isYesterday) label = "Yesterday";

    return { dateStr, timeStr, label };
  };

  const actionBadge = (action: AuditAction) => {
    if (action === "created") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">
          CREATED
        </span>
      );
    }
    if (action === "deleted") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
          DELETED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
        UPDATED
      </span>
    );
  };

  const FIELD_LABELS: Record<string, string> = {
    friendlyName: "display name",
    url: "URL",
    keyword: "keyword",
    alertContacts: "alert contacts",
    group: "group",
    notificationPreferences: "notification preferences",
  };

  const formatDetails = (item: AuditItem): string => {
    if (item.summary?.trim()) {
      return item.summary;
    }
    if (item.action === "created") {
      return "Monitor created";
    }
    if (item.action === "deleted") {
      return "Monitor deleted";
    }

    if (item.fields?.length) {
      const labels = item.fields.map(
        (field) => FIELD_LABELS[field] || field,
      );
      return `Updated ${labels.join(", ")}`;
    }

    return "Monitor updated";
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Header currentPage="audit" />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight mb-1">
            Audit log
          </h1>
          <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            Who created, updated, or deleted monitors. Existing sites without
            an actor show as <span className="font-mono">system</span>.
          </p>
        </header>

        <section className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] w-4 h-4" />
              <input
                type="text"
                placeholder="Search actor, URL, name, or ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ukad-magenta)_25%,transparent)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <select
              value={websiteIdFilter}
              onChange={(e) => setWebsiteIdFilter(e.target.value)}
              className="lg:w-64 border border-[var(--border-color)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ukad-magenta)_25%,transparent)]"
            >
              <option value="">All websites</option>
              {monitors.map((monitor) => (
                <option key={monitor.id} value={String(monitor.id)}>
                  {monitor.label}
                </option>
              ))}
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="lg:w-40 border border-[var(--border-color)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ukad-magenta)_25%,transparent)]"
            >
              <option value="">All actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>
        </section>

        <section className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center text-[var(--text-secondary)]">
              Loading audit log…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-deepest)] text-[10px] uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Timestamp</th>
                    <th className="px-4 py-3 font-bold">Action</th>
                    <th className="px-4 py-3 font-bold">Monitor</th>
                    <th className="px-4 py-3 font-bold">Actor</th>
                    <th className="px-4 py-3 font-bold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {items.map((item) => {
                    const { dateStr, timeStr, label } = formatDate(item.at);
                    return (
                      <tr
                        key={item._id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <div className="font-medium">
                            {dateStr}, {timeStr}
                          </div>
                          {label && (
                            <div className="text-[var(--text-secondary)] text-xs">{label}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {actionBadge(item.action)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/editWebsite?id=${item.websiteId}`}
                            className="hover:underline"
                          >
                            <div className="font-medium text-sm truncate max-w-[16rem]">
                              {item.url || item.name || `Website ${item.websiteId}`}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              ID: {item.websiteId}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className="font-mono text-xs">
                            {item.actor || "system"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {formatDetails(item)}
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-[var(--text-secondary)]"
                      >
                        No audit events found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalCount > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-color)] text-sm text-[var(--text-secondary)]">
              <span>
                {(currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, totalCount)} of{" "}
                {totalCount}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  className="p-1.5 rounded-md border border-[var(--border-color)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-[var(--bg-subtle)]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  className="p-1.5 rounded-md border border-[var(--border-color)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-[var(--bg-subtle)]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <ScrollToTopButton onClick={handleGoToTop} />
    </div>
  );
}
