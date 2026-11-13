import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import ProjectAutocomplete from "@/components/ProjectAutocomplete";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import type { AccessProject, AccessRecord, Session } from "@/types";

interface UserInfo {
  id: number;
  username: string | null;
  name: string;
  email: string | null;
}

interface AccessFormState {
  name: string;
  project: AccessProject | null;
  requestTicket: string;
  url: string;
}

const emptyForm: AccessFormState = {
  name: "",
  project: null,
  requestTicket: "",
  url: "",
};

export default function AccessManagementUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = Number(router.query.id);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [accesses, setAccesses] = useState<AccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AccessFormState>(emptyForm);
  const [displayGivenBy, setDisplayGivenBy] = useState("");

  const sessionActor =
    (session as Session | null)?.user?.email?.trim() ||
    (session as Session | null)?.user?.name?.trim() ||
    "";

  const load = useCallback(async () => {
    if (!Number.isFinite(userId) || userId <= 0) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/access-management/users/${userId}/accesses`,
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to load accesses");
        return;
      }
      const payload = data.success ? data.data : data;
      setUser(payload.user);
      setAccesses(payload.accesses || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load accesses");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (status === "loading" || !router.isReady) return;
    const typed = session as Session | null;
    if (!typed?.user?.isAccessManager && !typed?.user?.isAdmin) {
      router.push("/unauthorized");
      return;
    }
    void load();
  }, [session, status, router, load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDisplayGivenBy(sessionActor);
    setShowForm(true);
  };

  const openEdit = (access: AccessRecord) => {
    setEditingId(access.id);
    setForm({
      name: access.name,
      project:
        access.projectId && access.projectName
          ? { id: access.projectId, name: access.projectName }
          : access.projectId
            ? { id: access.projectId, name: `Project #${access.projectId}` }
            : null,
      requestTicket: access.requestTicket || "",
      url: access.url || "",
    });
    setDisplayGivenBy(access.givenBy || sessionActor || "—");
    setShowForm(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.project) {
      toast.error("Project is required");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        userId,
        projectId: form.project.id,
        projectName: form.project.name,
        requestTicket: form.requestTicket.trim(),
        url: form.url.trim(),
      };

      const response = await fetch(
        editingId
          ? `/api/access-management/accesses/${editingId}`
          : `/api/access-management/accesses`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Save failed");
        return;
      }
      toast.success(editingId ? "Access updated" : "Access created");
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeAccess = async (access: AccessRecord) => {
    if (
      !window.confirm(
        `Soft-delete access "${access.name}"? It will move to the GLPI trash.`,
      )
    ) {
      return;
    }
    try {
      const response = await fetch(
        `/api/access-management/accesses/${access.id}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Delete failed");
        return;
      }
      toast.success("Access soft-deleted");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Header currentPage="access-management" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/access-management"
            className="text-sm text-[var(--ukad-magenta)] hover:underline"
          >
            ← Back to users
          </Link>
        </div>

        {loading && !user ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                  {user?.name || "User"}
                </h1>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {user?.username || "—"}
                  {user?.email ? ` · ${user.email}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--ukad-magenta)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add access
              </button>
            </div>

            {showForm && (
              <form
                onSubmit={submitForm}
                className="mb-8 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-6 space-y-4"
              >
                <h2 className="text-lg font-medium text-[var(--text-primary)]">
                  {editingId ? "Edit access" : "New access"}
                </h2>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">
                    Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">
                    Project
                  </label>
                  <ProjectAutocomplete
                    value={form.project}
                    onChange={(project) =>
                      setForm((f) => ({ ...f, project }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">
                    Given by
                  </label>
                  <p className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                    {displayGivenBy || "—"}
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">
                      Request ticket
                    </label>
                    <input
                      value={form.requestTicket}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          requestTicket: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">
                      URL
                    </label>
                    <input
                      value={form.url}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, url: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[var(--ukad-magenta)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Saving..." : editingId ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setForm(emptyForm);
                    }}
                    className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
                </div>
              ) : accesses.length === 0 ? (
                <div className="py-16 text-center text-[var(--text-secondary)]">
                  No accesses for this user
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
                      <tr className="text-left text-[var(--text-secondary)]">
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Project</th>
                        <th className="px-4 py-3 font-medium">Given by</th>
                        <th className="px-4 py-3 font-medium">Ticket</th>
                        <th className="px-4 py-3 font-medium">URL</th>
                        <th className="px-4 py-3 font-medium w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accesses.map((access) => (
                        <tr
                          key={access.id}
                          className="border-b border-[var(--border-color)] last:border-0"
                        >
                          <td className="px-4 py-3 text-[var(--text-primary)]">
                            {access.name}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {access.projectName || "—"}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {access.givenBy || "—"}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {access.requestTicket || "—"}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[12rem] truncate">
                            {access.url ? (
                              <a
                                href={access.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[var(--ukad-magenta)] hover:underline"
                              >
                                {access.url}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(access)}
                                className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeAccess(access)}
                                className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-red-400 cursor-pointer"
                                aria-label="Soft-delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <ScrollToTopButton
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />
    </div>
  );
}
