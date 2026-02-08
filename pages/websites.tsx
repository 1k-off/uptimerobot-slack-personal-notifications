import { useEffect, useState, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  User, 
  Hash, 
  ArrowUp, 
  Edit3, 
  Trash2,
  X
} from "lucide-react";
import { useRouter } from 'next/router';
import AlertModal from '@/components/AlertModal';
import Header from '@/components/Header';
import type { MonitorFormProps } from '@/types';

interface SlackUser {
  id: string;
  name: string;
}

interface SlackChannel {
  id: string;
  name: string;
}

interface Website {
  id: number;
  friendly_name: string;
  url: string;
  status?: number; // UptimeRobot status: 0=paused, 1=not checked yet, 2=up, 8=seems down, 9=down
  type?: number;
  uptime_ratio?: number;
  alertContacts?: {
    slack?: {
      users?: string[];
      channels?: string[];
    };
  };
  group?: {
    _id: string;
    name: string;
  };
}

const Websites = () => {
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [userOptions, setUserOptions] = useState<SlackUser[]>([]);
  const [channelOptions, setChannelOptions] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const itemsPerPage = 12;
  
  // Get current page from URL or default to 1
  const currentPage = Number(router.query.page) || 1;

  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);

  const fetchWebsites = async (page: number, search: string = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(search && { search })
      });
      
      const response = await fetch(`/api/websites?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch websites');
      }
      const data = await response.json();
      const websitesData = data.success ? data.data : data;
      setWebsites(Array.isArray(websitesData) ? websitesData : []);
      setTotalCount(data.total || (Array.isArray(websitesData) ? websitesData.length : 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOptions = async () => {
    try {
      const response = await fetch('/api/slackUsers');
      if (response.ok) {
        const data = await response.json();
        setUserOptions(data.success ? data.data : data);
      }
    } catch (error) {
      console.error('Failed to fetch user options:', error);
    }
  };

  const fetchChannelOptions = async () => {
    try {
      const response = await fetch('/api/slackChannels');
      if (response.ok) {
        const data = await response.json();
        setChannelOptions(data.success ? data.data : data);
      }
    } catch (error) {
      console.error('Failed to fetch channel options:', error);
    }
  };

  // Fetch data when router is ready
  useEffect(() => {
    if (!router.isReady) return;
    
    const page = Number(router.query.page) || 1;
    const search = (router.query.search as string) || '';
    
    setSearchQuery(search);
    setDebouncedSearchQuery(search);
    fetchWebsites(page, search);
    fetchUserOptions();
    fetchChannelOptions();
  }, [router.isReady, router.query.page, router.query.search]);

  // Debounced search effect
  useEffect(() => {
    if (!router.isReady) return;
    
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      
      // Update URL with search query and reset to page 1
      const query: { page?: string; search?: string } = { page: '1' };
      if (searchQuery) {
        query.search = searchQuery;
      }
      
      router.push(
        {
          pathname: router.pathname,
          query,
        },
        undefined,
        { shallow: true }
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, router.isReady]);

  const handleEdit = (website: Website) => {
    router.push({
      pathname: '/editWebsite',
      query: {
        id: website.id,
        friendlyName: website.friendly_name,
        url: website.url,
      },
    });
  };

  const handleCreateMonitor = () => {
    setModalContent(
      <MonitorForm
        action="newMonitor"
        onClose={() => setModalContent(null)}
      />
    );
  };

  const handleDeleteMonitor = (website: Website) => {
    setModalContent(
      <MonitorForm
        action="deleteMonitor"
        monitorId={website.id}
        websiteUrl={website.url}
        websiteName={website.friendly_name}
        onClose={() => setModalContent(null)}
      />
    );
  };

  // Helper functions to get user/channel names
  const getUserNameById = (id: string): string => {
    const user = userOptions.find((u) => u.id === id);
    return user ? user.name : id;
  };

  const getChannelNameById = (id: string): string => {
    const channel = channelOptions.find((c) => c.id === id);
    return channel ? channel.name : id;
  };

  const handleGoToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);

  // Pagination handlers - update URL
  const handlePreviousPage = useCallback(() => {
    const newPage = Math.max(currentPage - 1, 1);
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, page: newPage.toString() },
      },
      undefined,
      { shallow: true }
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
      { shallow: true }
    );
    handleGoToTop();
  }, [currentPage, totalPages, router]);

  const handlePageClick = useCallback((page: number) => {
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, page: page.toString() },
      },
      undefined,
      { shallow: true }
    );
    handleGoToTop();
  }, [router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      {/* Navigation Header */}
      <Header currentPage="monitors" />

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Page Header with Title, Search, and Create Button */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">Websites List</h1>
              <p className="text-zinc-400 font-medium">
                <span className="">{totalCount}</span> / {process.env.NEXT_PUBLIC_UPTIMEROBOT_WEBSITES_ALL || '50'} websites monitored
              </p>
            </div>
            <button 
              onClick={handleCreateMonitor}
              disabled={totalCount >= Number(process.env.NEXT_PUBLIC_UPTIMEROBOT_WEBSITES_ALL || 50)}
              className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg font-medium dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer lg:flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Monitor</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search websites by name or URL..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-zinc-800 rounded-xl py-3 pl-11 pr-10 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 cursor-pointer" />
              </button>
            )}
          </div>
        </div>

        {/* Results count and pagination info */}
        {totalCount > 0 && (
          <div className="mb-4 text-sm text-zinc-400">
            Showing <span className="font-medium">{startIndex + 1}-{endIndex}</span> of <span className="font-medium">{totalCount}</span> {totalCount === 1 ? 'website' : 'websites'}
          </div>
        )}

        {/* Grid of Monitoring Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {websites.map((website) => {
            // UptimeRobot status codes: 0=paused, 1=not checked yet, 2=up, 8=seems down, 9=down
            const isUp = website.status === 2;
            const isPaused = website.status === 0;
            const isDown = website.status === 8 || website.status === 9;
            const statusText = isPaused ? 'Paused' : isUp ? 'Up' : isDown ? 'Down' : 'Unknown';
            
            return (
              <div 
                key={website.id}
                className={`bg-[var(--bg-elevated)] border ${
                  isUp ? 'border-zinc-800' : 
                  isDown ? 'border-red-500/30' : 
                  'border-amber-500/30'
                } rounded-2xl p-6 hover:border-white/20 transition-all group`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      isUp ? 'bg-green-500 status-pulse-green' : 
                      isDown ? 'bg-red-500 status-pulse-red' : 
                      isPaused ? 'bg-amber-500' : 'bg-zinc-500'
                    }`}></div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-bold text-lg truncate ${
                        isUp ? 'group-hover:text-green-400' : 
                        isDown ? 'group-hover:text-red-400' : 
                        'group-hover:text-amber-400'
                      } transition-colors`}>
                        {website.friendly_name}
                      </h3>
                      <Link 
                        href={website.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-400 text-sm font-mono truncate block hover:text-white transition-colors"
                      >
                        {website.url}
                      </Link>
                    </div>
                  </div>
                  <div className={`${
                    isUp ? 'bg-green-500/10 text-green-500' : 
                    isDown ? 'bg-red-500/10 text-red-500' : 
                    isPaused ? 'bg-amber-500/10 text-amber-500' :
                    'bg-zinc-500/10 text-zinc-500'
                  } text-xs px-2 py-1 rounded font-bold uppercase tracking-wider flex-shrink-0 ml-2`}>
                    {statusText}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Group info */}
                  {website.group && (
                    <div>
                      <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Group</span>
                      <div className="flex flex-wrap gap-2">
                        <span className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-1 rounded-full text-xs">
                          {website.group.name}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Alert Contacts */}
                  {((website.alertContacts?.slack?.users?.length ?? 0) > 0 || 
                    (website.alertContacts?.slack?.channels?.length ?? 0) > 0) && (
                    <div>
                      <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Alert Contacts</span>
                      <div className="flex flex-wrap gap-2">
                        {/* Channels */}
                        {website.alertContacts?.slack?.channels?.map((channelId) => (
                          <span key={channelId} className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-1 rounded-full text-xs">
                            <Hash className="w-3 h-3" />
                            {getChannelNameById(channelId)}
                          </span>
                        ))}
                        {/* Users */}
                        {website.alertContacts?.slack?.users?.map((userId) => (
                          <span key={userId} className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-1 rounded-full text-xs">
                            <User className="w-3 h-3" />
                            {getUserNameById(userId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                    <div className="text-xs text-zinc-400">
                      {website.uptime_ratio !== undefined && (
                        <span className="font-medium">
                          Uptime: {website.uptime_ratio}%
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(website)}
                        className="p-2 hover:bg-[var(--bg-subtle)] rounded-lg transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteMonitor(website)}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3">
              <Spinner />
              <span className="text-zinc-400 text-lg">Loading websites...</span>
            </div>
          </div>
        )}

        {/* No results message */}
        {!loading && websites.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg">No websites found{debouncedSearchQuery ? ' matching your search' : ''}.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-4 bg-[var(--bg-elevated)] border border-zinc-800 rounded-2xl px-6 py-6">
            <p className="text-xs text-zinc-400">
              Showing <span className="font-medium">{startIndex + 1}-{endIndex}</span> of <span className="font-medium">{totalCount}</span> {totalCount === 1 ? 'website' : 'websites'}
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium border border-zinc-800 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageClick(page)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                      currentPage === page 
                        ? 'bg-white text-black' 
                        : 'hover:bg-white/5 text-zinc-400'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                {totalPages > 5 && (
                  <>
                    <span className="px-2 text-zinc-400">...</span>
                    <button
                      onClick={() => handlePageClick(totalPages)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors cursor-pointer ${
                        currentPage === totalPages 
                          ? 'bg-white text-black font-bold' 
                          : 'hover:bg-white/5 text-zinc-400'
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
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FAB - Scroll to Top (bottom-right) */}
      <div className="fixed bottom-8 right-8 z-50">
        <button 
          onClick={handleGoToTop}
          className="w-12 h-12 bg-[var(--bg-elevated)] border border-zinc-800 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-white hover:text-black hover:scale-110 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>

      {/* Modals */}
      {modalContent && (
        <AlertModal onClose={() => setModalContent(null)}>
          {modalContent}
        </AlertModal>
      )}
    </div>
  );
};

const MonitorForm = ({ action, onClose, monitorId, websiteUrl, websiteName }: MonitorFormProps) => {
  const [url, setUrl] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      let payload: Record<string, unknown> = {};
      const endpoint = '/api/uptimeRobot';

      if (action === 'newMonitor') {
        if (!url || !keyword) {
          setResult({ success: false, message: 'URL and keyword are required.' });
          setSubmitting(false);
          return;
        }
        payload = {
          action: 'newMonitor',
          url,
          keyword_value: keyword,
        };
      } else if (action === 'deleteMonitor') {
        if (!monitorId) {
          setResult({ success: false, message: 'No monitor ID provided.' });
          setSubmitting(false);
          return;
        }
        payload = {
          action: 'deleteMonitor',
          id: monitorId,
          url: websiteUrl,
          friendly_name: websiteName,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // If there's an error, parse and display it.
        const responseData = await response.json();
        
        // In development, log it for debugging:
        console.error('Response error data:', responseData);

        let errorMessage = 'Request failed.';
        if (responseData.error) {
          // If error is an object, convert to string
          if (typeof responseData.error === 'string') {
            errorMessage = responseData.error;
          } else {
            if (typeof responseData.error.message === 'string') {
              errorMessage = responseData.error.message;
            } else {
              errorMessage = JSON.stringify(responseData.error, null, 2);
            }
          }
        } else if (typeof responseData === 'object') {
          errorMessage = JSON.stringify(responseData, null, 2);
        }

        // Throw an Error to be caught below
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (action === 'deleteMonitor') {
        toast.success(data.message || 'Monitor deleted successfully');
        onClose();
        // Refresh the websites list
        window.location.reload();
      } else if (action === 'newMonitor') {
        toast.success(data.message || 'Monitor created successfully');
        onClose();
        // Refresh the websites list
        window.location.reload();
      } else {
        setResult({ success: true, message: data.message || 'Success!' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (action === 'deleteMonitor') {
        toast.error(`Failed to delete monitor: ${errorMessage}`);
      } else if (action === 'newMonitor') {
        toast.error(`Failed to create monitor: ${errorMessage}`);
      } else {
        setResult({ success: false, message: errorMessage });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-[24px] font-bold tracking-tight text-black">
          {action === 'newMonitor' ? 'Create Monitor' : 'Delete Monitor'}
        </h2>
      </div>

      {action === 'newMonitor' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Field */}
          <div className="space-y-2">
            <label 
              htmlFor="url" 
              className="block text-[13px] font-semibold text-[#1e293b] uppercase tracking-wide"
            >
              URL
            </label>
            <input
              id="url"
              name="url"
              type="url"
              required
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Keyword Field */}
          <div className="space-y-2">
            <label 
              htmlFor="keyword" 
              className="block text-[13px] font-semibold text-[#1e293b] uppercase tracking-wide"
            >
              Keyword
            </label>
            <input
              id="keyword"
              name="keyword"
              type="text"
              required
              placeholder="Text to monitor on the page"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 mt-10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-semibold text-gray-700 hover:text-black transition-colors duration-200 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2.5 bg-[#111827] text-white text-sm font-semibold rounded-lg hover:bg-black active:scale-95 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {action === 'deleteMonitor' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-gray-900">
              Are you sure you want to delete <span className="font-semibold">{websiteName}</span>?
            </p>
            <p className="text-xs text-gray-500">
              Monitor ID: {monitorId}
            </p>
            <p className="text-xs text-red-600 font-medium">
              This action cannot be undone.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 mt-10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-semibold text-gray-700 hover:text-black transition-colors duration-200 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </form>
      )}

      {result && (
        <div
          className={`mt-6 p-4 rounded-lg text-sm font-medium ${
            result.success
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
};

export default Websites;
