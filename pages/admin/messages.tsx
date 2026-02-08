import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Message, Session } from "@/types";
import { toast } from "sonner";
import Header from "@/components/Header";
import {
  Info,
  Search,
  Trash2,
  Hash,
  AtSign,
  ArrowUp,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function AdminMessages() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const messagesPerPage = 50;

  // Get current page from URL or default to 1
  const currentPage = Number(router.query.page) || 1;

  // Initialize search from URL on mount
  useEffect(() => {
    if (router.isReady && router.query.search) {
      setSearchQuery(router.query.search as string);
      setDebouncedSearchQuery(router.query.search as string);
    }
  }, [router.isReady]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL when search changes, reset to page 1
  useEffect(() => {
    if (debouncedSearchQuery !== (router.query.search || "")) {
      router.push(
        {
          pathname: router.pathname,
          query: {
            ...router.query,
            search: debouncedSearchQuery || undefined,
            page: "1", // Reset to first page when search changes
          },
        },
        undefined,
        { shallow: true },
      );
    }
  }, [debouncedSearchQuery, router]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(messagesPerPage),
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
      });

      const response = await fetch(`/api/messages?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setTotalCount(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchQuery]);

  useEffect(() => {
    if (status === "loading") return;

    const typedSession = session as Session | null;
    if (!typedSession || !typedSession.user.isAdmin) {
      router.push("/unauthorized");
      return;
    }

    fetchMessages();
  }, [session, status, router, fetchMessages]);

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedMessages.length} selected message(s)?`)) {
      return;
    }

    setCleanupLoading(true);
    try {
      const response = await fetch("/api/messages/bulk-delete", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedMessages }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.failed > 0) {
          toast.warning(`Deleted ${data.deleted} message(s), ${data.failed} failed`);
        } else {
          toast.success(`Successfully deleted ${data.deleted} message(s)`);
        }
        fetchMessages();
        setSelectedMessages([]);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete messages");
      }
    } catch (error) {
      console.error("Error deleting messages:", error);
      toast.error("Failed to delete messages");
    } finally {
      setCleanupLoading(false);
    }
  };

  const triggerAutomatedCleanup = async () => {
    if (!window.confirm("Are you sure you want to run automated cleanup? This will delete old messages based on retention settings.")) {
      return;
    }

    setCleanupLoading(true);
    try {
      const response = await fetch("/api/cleanup-messages", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Automated cleanup completed successfully");
        fetchMessages();
        setSelectedMessages([]);
      } else {
        toast.error("Cleanup failed");
      }
    } catch (error) {
      console.error("Error triggering cleanup:", error);
      toast.error("Cleanup failed");
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMessages(messages.map((m) => m._id));
    } else {
      setSelectedMessages([]);
    }
  };

  const handleSelectMessage = (messageId: string, checked: boolean) => {
    if (checked) {
      setSelectedMessages([...selectedMessages, messageId]);
    } else {
      setSelectedMessages(selectedMessages.filter((id) => id !== messageId));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Message deleted successfully');
        fetchMessages();
        // Remove from selected if it was selected
        setSelectedMessages(selectedMessages.filter(id => id !== messageId));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleGoToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / messagesPerPage);
  const startIndex = (currentPage - 1) * messagesPerPage;
  const endIndex = Math.min(startIndex + messagesPerPage, totalCount);

  // Pagination handlers - update URL
  const handlePreviousPage = useCallback(() => {
    const newPage = Math.max(currentPage - 1, 1);
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, page: newPage.toString() },
      },
      undefined,
      { shallow: true },
    );
    handleGoToTop();
  }, [currentPage, router]);

  const handleNextPage = useCallback(() => {
    const newPage = Math.min(currentPage + 1, totalPages);
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, page: newPage.toString() },
      },
      undefined,
      { shallow: true },
    );
    handleGoToTop();
  }, [currentPage, totalPages, router]);

  const handlePageClick = useCallback(
    (page: number) => {
      router.push(
        {
          pathname: router.pathname,
          query: { ...router.query, page: page.toString() },
        },
        undefined,
        { shallow: true },
      );
      handleGoToTop();
    },
    [router],
  );

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

  const getAlertTypeBadge = (alertType: string) => {
    if (alertType === "up") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">
          UP ALERT
        </span>
      );
    } else if (alertType === "down") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
          DOWN ALERT
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          ALERT
        </span>
      );
    }
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
      {/* Navigation Header */}
      <Header currentPage="history" />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10">
        {/* Page Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">
            Message History
          </h1>
          <p className="text-zinc-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500" />
            Historical alert delivery records. Search by website ID, message ID,
            or channel.
          </p>
        </header>

        {/* Filters Bar */}
        <section className="bg-[var(--bg-elevated)] border border-zinc-800 rounded-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by website ID, message ID, or channel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-zinc-800 rounded-lg placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDeleteSelected}
                  disabled={cleanupLoading || selectedMessages.length === 0}
                  className="bg-red-500/10 text-red-500 border border-red-500/20 font-semibold rounded-lg px-4 py-2.5 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {cleanupLoading ? "Deleting..." : "Delete Selected"}
                </button>
                <button
                  onClick={triggerAutomatedCleanup}
                  disabled={cleanupLoading}
                  className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold rounded-lg px-4 py-2.5 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {cleanupLoading ? "Running..." : "Cleanup Messages"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="text-zinc-400 text-lg">Loading messages...</span>
            </div>
          </div>
        )}

        {/* History Table */}
        {!loading && (
          <section className="bg-[var(--bg-elevated)] border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-white/5">
                    <th className="px-6 py-4 w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedMessages.length === messages.length &&
                          messages.length > 0
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-800 text-blue-500 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Timestamp
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Monitor
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Type
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Target
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Message ID
                    </th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {messages.map((message) => {
                    const { dateStr, timeStr, label } = formatDate(
                      message.createdAt,
                    );
                    const isSelected = selectedMessages.includes(message._id);

                    return (
                      <tr
                        key={message._id}
                        className="hover:bg-[var(--bg-subtle)]/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              handleSelectMessage(message._id, e.target.checked)
                            }
                            className="w-4 h-4 rounded border-zinc-800 text-blue-500 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <div className="font-medium">
                            {dateStr}, {timeStr}
                          </div>
                          {label && (
                            <div className="text-zinc-400 text-xs">{label}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/editWebsite?id=${message.websiteId}`}
                            className="hover:underline"
                          >
                            <span className="font-medium">
                              Website {message.websiteId}
                            </span>
                            <div className="text-xs text-zinc-400">
                              ID: {message.websiteId}
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getAlertTypeBadge(message.alertType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {message.channelId.startsWith("C") ? (
                              <Hash className="w-4 h-4 text-zinc-400" />
                            ) : (
                              <AtSign className="w-4 h-4 text-zinc-400" />
                            )}
                            <span className="text-sm">
                              {message.channelId}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-sm font-medium">
                              Delivered
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-zinc-400 truncate font-mono max-w-[200px]">
                            {message.messageId}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-all cursor-pointer"
                              title="Delete Message"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {messages.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-zinc-500"
                      >
                        {searchQuery
                          ? "No messages found matching your search."
                          : "No messages found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / Footer */}
            {totalPages > 1 && (
              <div className="px-6 py-6 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-xs text-zinc-400">
                  Showing{" "}
                  <span className="font-medium">
                    {startIndex + 1}-{endIndex}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{totalCount}</span>{" "}
                  messages
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium border border-zinc-800 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageClick(page)}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                            currentPage === page
                              ? "bg-white text-black"
                              : "hover:bg-white/5 text-zinc-400"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    {totalPages > 5 && (
                      <>
                        <span className="px-2 text-zinc-400">...</span>
                        <button
                          onClick={() => handlePageClick(totalPages)}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors cursor-pointer ${
                            currentPage === totalPages
                              ? "bg-white text-black font-bold"
                              : "hover:bg-white/5 text-zinc-400"
                          }`}
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium border border-zinc-800 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Back to top FAB */}
      <button
        onClick={handleGoToTop}
        className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-white text-black shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 cursor-pointer"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
}
