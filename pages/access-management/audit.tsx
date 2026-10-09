import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import type { Session } from "@/types";

type AuditAction = "created" | "updated" | "deleted";

interface AccessAuditItem {
  _id: string;
  action: AuditAction;
  actor: string;
  accessId: number;
  glpiUserId: number;
  glpiUserName?: string;
  accessName?: string;
  projectName?: string;
  fields?: string[];
  summary: string;
  at: string;
}

export default function AccessManagementAuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<AccessAuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, actionFilter]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debounced.trim()) params.set("search", debounced.trim());
      if (actionFilter) params.set("action", actionFilter);

      const response = await fetch(
        `/api/access-management/audit?${params.toString()}`,
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to load audit log");
        return;
      }
      setItems(data.success ? data.data || [] : []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, debounced, actionFilter]);

  useEffect(() => {
    if (status === "loading") return;
    const typed = session as Session | null;
    if (!typed?.user?.isAccessManager && !typed?.user?.isAdmin) {
      router.push("/unauthorized");
      return;
    }
    void fetchItems();
  }, [session, status, router, fetchItems]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Header currentPage="access-audit" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/access-management"
            className="text-sm text-[var(--ukad-magenta)] hover:underline"
          >
            ← Access management
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
          Access audit
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, assigned user, access, project..."
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] pl-10 pr-10 py-2.5 text-[var(--text-primary)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2.5 text-[var(--text-primary)]"
          >
            <option value="">All actions</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-secondary)]">
              No audit events yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
                  <tr className="text-left text-[var(--text-secondary)]">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Assigned to</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Summary</th>
                    <th className="px-4 py-3 font-medium">Access</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b border-[var(--border-color)] last:border-0"
                    >
                      <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(item.at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)]">
                        {item.actor}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)]">
                        {item.glpiUserName ||
                          (item.glpiUserId
                            ? `User #${item.glpiUserId}`
                            : "—")}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {item.action}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)]">
                        {item.summary}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {item.accessName || `#${item.accessId}`}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {item.projectName || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-3 py-1.5 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-3 py-1.5 disabled:opacity-40 cursor-pointer"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>
      <ScrollToTopButton
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />
    </div>
  );
}
