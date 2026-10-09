"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AccessProject, ProjectAutocompleteProps } from "@/types";

function dedupeByName(projects: AccessProject[]): AccessProject[] {
  const byName = new Map<string, AccessProject>();
  for (const project of projects) {
    const key = project.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing || project.id < existing.id) {
      byName.set(key, project);
    }
  }
  return [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

const ProjectAutocomplete = ({ value, onChange }: ProjectAutocompleteProps) => {
  const [projects, setProjects] = useState<AccessProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/access-management/projects");
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to load projects");
        setProjects([]);
        return;
      }
      const list = data.success ? data.data : data;
      setProjects(dedupeByName(Array.isArray(list) ? list : []));
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    if (!id) {
      onChange(null);
      return;
    }
    const project = projects.find((p) => p.id === id) || null;
    onChange(project);
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Project name is required");
      return;
    }

    const existing = projects.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      onChange(existing);
      setNewName("");
      setShowCreate(false);
      toast.message("Project already exists — selected");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/access-management/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to create project");
        return;
      }
      const project = (data.success ? data.data : data) as AccessProject;
      await loadProjects();
      onChange(project);
      setNewName("");
      setShowCreate(false);
      toast.success("Project created");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-[var(--text-secondary)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading projects...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <select
        id="project"
        value={value?.id ? String(value.id) : ""}
        onChange={handleSelectChange}
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
      >
        <option value="">Select a project...</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-sm text-[var(--ukad-magenta)] hover:underline cursor-pointer"
        >
          Create new project
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New project name"
            className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
          />
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreate()}
            className="rounded-lg bg-[var(--ukad-magenta)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {creating ? "Creating..." : "Add"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setNewName("");
            }}
            className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectAutocomplete;
