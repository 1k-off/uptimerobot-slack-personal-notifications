import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";
import {
  Activity,
  Bell,
  Zap,
  Send,
  CheckCircle,
  ArrowRight,
  Hash,
  Lock,
  ExternalLink,
  Search,
} from "lucide-react";
import { Session } from "@/types";
import Header from "@/components/Header";

interface SlackChannel {
  id: string;
  name: string;
}

interface Metrics {
  totalMonitors: number;
  activeAlerts: number;
  connectedChannels: number;
  apiUptime: number;
  monitorTrend: string;
  alertSeverity: string;
  recentMessages: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<object | null>(null);
  const [message, setMessage] = useState(
    "This is a system test message from the Admin Dashboard. Current system health: 100%.",
  );
  const [channelSearch, setChannelSearch] = useState("");
  const [channels, setChannels] = useState<SlackChannel[]>([]);

  // State for storing selected user and channel IDs
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // Metrics state
  const [metrics, setMetrics] = useState<Metrics>({
    totalMonitors: 0,
    activeAlerts: 0,
    connectedChannels: 0,
    apiUptime: 100,
    monitorTrend: '+0%',
    alertSeverity: 'Normal',
    recentMessages: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    fetchChannels();
    fetchMetrics();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch("/api/slackChannels");
      if (response.ok) {
        const data = await response.json();
        setChannels(data.success ? data.data : data);
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    }
  };

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

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(channelSearch.toLowerCase()),
  );

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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Navigation */}
      <Header currentPage="admin" />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-500/20">
                System Administrator
              </span>
            </div>
            <p className="text-zinc-400">
              Manage system-wide integration settings and monitor delivery
              health.
            </p>
          </div>
        </div>

        {/* System Metrics/Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-6 rounded-xl bg-[var(--bg-elevated)] border border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <Activity className="w-6 h-6 text-blue-500" />
              <span className="text-[10px] font-bold text-blue-500 uppercase">
                Total Monitors
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              {metricsLoading ? (
                <div className="h-9 w-24 bg-[var(--bg-subtle)] animate-pulse rounded" />
              ) : (
                <>
                  <h3 className="text-3xl font-bold">{metrics.totalMonitors.toLocaleString()}</h3>
                  <span className={`text-xs font-medium ${
                    metrics.monitorTrend.startsWith('+') ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {metrics.monitorTrend}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[var(--bg-elevated)] border border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <Bell className="w-6 h-6 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-500 uppercase">
                Active Alerts
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              {metricsLoading ? (
                <div className="h-9 w-24 bg-[var(--bg-subtle)] animate-pulse rounded" />
              ) : (
                <>
                  <h3 className="text-3xl font-bold">{metrics.activeAlerts}</h3>
                  <span className={`text-xs font-medium ${
                    metrics.alertSeverity === 'Critical' ? 'text-red-500' :
                    metrics.alertSeverity === 'Warning' ? 'text-amber-500' :
                    'text-green-500'
                  }`}>
                    {metrics.alertSeverity}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[var(--bg-elevated)] border border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <svg
                className="w-6 h-6"
                viewBox="0 0 127 127"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80z"
                  fill="#A855F7"
                />
                <path
                  d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47z"
                  fill="#A855F7"
                />
              </svg>
              <span className="text-[10px] font-bold text-purple-500 uppercase">
                Channels Connected
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              {metricsLoading ? (
                <div className="h-9 w-24 bg-[var(--bg-subtle)] animate-pulse rounded" />
              ) : (
                <>
                  <h3 className="text-3xl font-bold">{metrics.connectedChannels}</h3>
                  <span className="text-xs text-zinc-400 font-medium">
                    1 Workspace
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[var(--bg-elevated)] border border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <Zap className="w-6 h-6 text-green-500" />
              <span className="text-[10px] font-bold text-green-500 uppercase">
                API Uptime %
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              {metricsLoading ? (
                <div className="h-9 w-24 bg-[var(--bg-subtle)] animate-pulse rounded" />
              ) : (
                <>
                  <h3 className="text-3xl font-bold">{metrics.apiUptime}</h3>
                  <span className="text-xs text-green-500 font-medium">Stable</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Slack Integration Test */}
            <section className="p-8 rounded-2xl bg-[var(--bg-elevated)] border border-zinc-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Send className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold">Slack Integration Test</h2>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
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
                  <div className="flex-1 space-y-2">
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
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Message Content
                  </label>
                  <textarea
                    placeholder="Type a test message here..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Ready to send</span>
                  </div>
                  <button
                    onClick={handleTestSlackMessage}
                    disabled={loading}
                    className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2 shadow-lg shadow-white/5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending..." : "Send Test Message"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {result && (
                  <Alert className="mt-4 bg-green-500/10 border-green-500/20 text-green-500">
                    <AlertDescription>
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar: Connected Channels */}
          <aside className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-zinc-800 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold">Connected Channels</h2>
                <span className="text-xs font-bold text-zinc-400 px-2 py-0.5 bg-white/5 rounded">
                  {channels.length} TOTAL
                </span>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 text-zinc-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Filter channels..."
                  value={channelSearch}
                  onChange={(e) => setChannelSearch(e.target.value)}
                  className="w-full border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {filteredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {channel.name.includes("admin") ||
                      channel.name.includes("private") ? (
                        <Lock className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <Hash className="w-4 h-4 text-zinc-400" />
                      )}
                      <span className="text-sm">{channel.name}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800">
                <button
                  onClick={fetchChannels}
                  className="w-full py-2 bg-[var(--bg-subtle)] border border-zinc-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 transition-all cursor-pointer"
                >
                  Force Re-Sync
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
