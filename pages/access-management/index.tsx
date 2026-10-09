import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Search, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import type { Session } from "@/types";
import type { GlpiUserOrg } from "@/lib/glpi";

interface GlpiUserRow {
  id: number;
  username: string | null;
  name: string;
  email: string | null;
  isActive: boolean;
  org: GlpiUserOrg;
}

const ORG_TABS: Array<{ id: GlpiUserOrg | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "ukad", label: "UKAD" },
  { id: "compent", label: "Compent" },
  { id: "other", label: "Other" },
];

export default function AccessManagementUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [users, setUsers] = useState<GlpiUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgFilter, setOrgFilter] = useState<GlpiUserOrg | "all">("ukad");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debounced.trim()) params.set("q", debounced.trim());
      const response = await fetch(
        `/api/access-management/users?${params.toString()}`,
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to load users");
        setUsers([]);
        return;
      }
      setUsers(data.success ? data.data || [] : data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    if (status === "loading") return;
    const typed = session as Session | null;
    if (!typed?.user?.isAccessManager && !typed?.user?.isAdmin) {
      router.push("/unauthorized");
      return;
    }
    void fetchUsers();
  }, [session, status, router, fetchUsers]);

  const counts = useMemo(() => {
    const next = { all: users.length, ukad: 0, compent: 0, other: 0 };
    for (const user of users) {
      if (user.org === "ukad") next.ukad += 1;
      else if (user.org === "compent") next.compent += 1;
      else next.other += 1;
    }
    return next;
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (orgFilter === "all") return users;
    return users.filter((user) => user.org === orgFilter);
  }, [users, orgFilter]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Header currentPage="access-management" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Access management
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Select a GLPI user to view and manage their accesses. Grouped by
              username domain (UKAD / Compent / Other).
            </p>
          </div>
          <Link
            href="/access-management/audit"
            className="text-sm text-[var(--ukad-magenta)] hover:underline"
          >
            View access audit
          </Link>
        </div>

        <div className="relative mb-4 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users by name or username..."
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg pl-10 pr-10 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {ORG_TABS.map((tab) => {
            const active = orgFilter === tab.id;
            const count = counts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOrgFilter(tab.id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--ukad-magenta)_14%,transparent)] text-[var(--ukad-magenta)]"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-secondary)]">
              No users found
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
                <tr className="text-left text-[var(--text-secondary)]">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  {orgFilter === "all" && (
                    <th className="px-4 py-3 font-medium">Org</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-subtle)] cursor-pointer"
                    onClick={() =>
                      router.push(`/access-management/users/${user.id}`)
                    }
                  >
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {user.username || "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {user.email || "—"}
                    </td>
                    {orgFilter === "all" && (
                      <td className="px-4 py-3 text-[var(--text-secondary)] uppercase text-xs tracking-wide">
                        {user.org}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <ScrollToTopButton
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />
    </div>
  );
}
