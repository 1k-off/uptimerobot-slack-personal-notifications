import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";
import {
  Activity,
  Bell,
  Send,
  CheckCircle,
  ArrowRight,
  UserMinus,
} from "lucide-react";
import { Session } from "@/types";
import Header from "@/components/Header";

interface Metrics {
  totalMonitors: number;
  activeAlerts: number;
  alertSeverity: "Healthy" | "Degraded" | "Down";
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<object | null>(null);
  const [message, setMessage] = useState(
    "This is a system test message from the Admin Dashboard. Current system health: 100%.",
  );

  // State for storing selected user and channel IDs
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // Metrics state
  const [metrics, setMetrics] = useState<Metrics>({
    totalMonitors: 0,
    activeAlerts: 0,
    alertSeverity: "Healthy",
  });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [pruneLoading, setPruneLoading] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true);
      const response = await fetch('/api/admin/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        toast.error('Failed to load metrics');
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      toast.error('Failed to load metrics');
    } finally {
      setMetricsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  const typedSession = session as Session | null;

  if (!typedSession || !typedSession.user.isAdmin) {
    router.push("/unauthorized");
    return null;
  }

  const handleTestSlackMessage = async () => {
    // Validate if at least one recipient is selected
    if (selectedUsers.length === 0 && selectedChannels.length === 0) {
      toast.warning(
        "Please select at least one user or channel to send the message to",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/test-slack-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          users: selectedUsers,
          channels: selectedChannels,
          message: message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Test Slack message sent successfully!");
        setResult(data);
      } else {
        toast.error(data.error || "Failed to send test Slack message");
        setResult(data);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Error sending test Slack message:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePruneDeactivatedUsers = async () => {
    if (
      !window.confirm(
        "Remove deactivated Slack users from all monitor subscriptions? This only updates the database; message cleanup is not affected.",
      )
    ) {
      return;
    }

    setPruneLoading(true);
    try {
      const response = await fetch("/api/admin/prune-deactivated-users", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to prune deactivated users");
        return;
      }

      if (data.usersRemoved === 0) {
        toast.success("No deactivated users found in subscriptions");
      } else {
        toast.success(
          `Removed ${data.usersRemoved} deactivated user(s) from ${data.websitesUpdated} monitor(s)`,
        );
      }
    } catch (error) {
      console.error("Failed to prune deactivated users:", error);
      toast.error("Failed to prune deactivated users");
    } finally {
      setPruneLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Navigation */}
      <Header currentPage="admin" />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        </div>

        {/* System Metrics/Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-zinc-800">
            <div className="flex justify-between items-start mb-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <span className="text-[10px] font-bold text-blue-500 uppercase">
                Total Monitors
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              {metricsLoading ? (
                <div className="h-8 w-20 bg-[var(--bg-subtle)] animate-pulse rounded" />
              ) : (
                <h3 className="text-2xl font-bold">
                  {metrics.totalMonitors.toLocaleString()}
                </h3>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-zinc-800">
            <div className="flex justify-between items-start mb-2">
              <Bell className="w-5 h-5 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-500 uppercase">
                Active Alerts
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              {metricsLoading ? (
                <div className="h-8 w-20 bg-[var(--bg-subtle)] animate-pulse rounded" />
              ) : (
                <>
                  <h3 className="text-2xl font-bold">{metrics.activeAlerts}</h3>
                  <span
                    className={`text-xs font-medium ${
                      metrics.alertSeverity === "Down"
                        ? "text-red-500"
                        : metrics.alertSeverity === "Degraded"
                          ? "text-amber-500"
                          : "text-green-500"
                    }`}
                  >
                    {metrics.alertSeverity}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Slack Integration Test */}
          <section className="p-5 rounded-xl bg-[var(--bg-elevated)] border border-zinc-800 h-full flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-1.5 bg-blue-500/10 rounded-lg">
                <Send className="w-4 h-4 text-blue-500" />
              </div>
              <h2 className="text-base font-semibold">Slack Integration Test</h2>
            </div>

            <div className="space-y-4 flex-1 flex flex-col">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Target Channels
                </label>
                <MultiSelectDropdown
                  apiEndpoint="/api/slackChannels"
                  placeholder="Select channels..."
                  selectedPlaceholder="channel(s)"
                  labelKey="name"
                  idKey="id"
                  selectedItems={selectedChannels}
                  setSelectedItems={setSelectedChannels}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Target Users
                </label>
                <MultiSelectDropdown
                  apiEndpoint="/api/slackUsers"
                  placeholder="Select users..."
                  selectedPlaceholder="user(s)"
                  labelKey="name"
                  idKey="id"
                  selectedItems={selectedUsers}
                  setSelectedItems={setSelectedUsers}
                />
              </div>

              <div className="space-y-2 flex-1 flex flex-col">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Message Content
                </label>
                <textarea
                  placeholder="Type a test message here..."
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full flex-1 min-h-[5.5rem] border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-between gap-3 mt-auto">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Ready to send</span>
                </div>
                <button
                  onClick={handleTestSlackMessage}
                  disabled={loading}
                  className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Test Message"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {result && (
                <Alert className="mt-2 bg-green-500/10 border-green-500/20 text-green-500">
                  <AlertDescription>
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </section>

          <section className="p-5 rounded-xl bg-[var(--bg-elevated)] border border-zinc-800 h-full flex flex-col">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 bg-amber-500/10 rounded-lg shrink-0">
                <UserMinus className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  Subscription maintenance
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Remove deactivated Slack users from all monitor alert
                  contacts. Does not affect message cleanup.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePruneDeactivatedUsers}
              disabled={pruneLoading}
              className="mt-auto self-start px-4 py-2 text-sm bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {pruneLoading ? "Pruning..." : "Prune deactivated users"}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
