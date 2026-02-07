import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import GroupAutocomplete from '@/components/GroupAutocomplete';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner'
import { 
  Hash, 
  Globe, 
  MessageSquare, 
  Bell,
  TrendingDown,
  TrendingUp,
  Clock4,
  Link as LinkIcon,
  LayoutDashboard,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import Header from '@/components/Header';
import type { Group } from '@/types';

interface SlackUser {
  id: string;
  name: string;
}

interface SlackChannel {
  id: string;
  name: string;
}

interface WebsiteData {
  id: number;
  friendlyName?: string;
  url?: string;
  alertContacts?: {
    slack?: {
      users?: string[];
      channels?: string[];
    };
  };
  group?: Group;
  notificationPreferences?: {
    downAlerts: boolean;
    upAlerts: boolean;
    latencyAlerts: boolean;
  };
}

const EditWebsite = () => {
  const router = useRouter();
  const { id, friendlyName: queryFriendlyName, url: queryUrl } = router.query;
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [friendlyName, setFriendlyName] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [userOptions, setUserOptions] = useState<SlackUser[]>([]);
  const [channelOptions, setChannelOptions] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Notification preferences
  const [downAlerts, setDownAlerts] = useState<boolean>(true);
  const [upAlerts, setUpAlerts] = useState<boolean>(true);
  const [latencyAlerts, setLatencyAlerts] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;

    const fetchWebsiteData = async () => {
      try {
        const response = await fetch(`/api/websites/${id}`);
        if (response.ok) {
          const data: WebsiteData = await response.json();
          setWebsite(data);
          setFriendlyName(data.friendlyName || (queryFriendlyName as string) || '');
          setUrl(data.url || (queryUrl as string) || '');
          setSelectedUsers(data.alertContacts?.slack?.users || []);
          setSelectedChannels(data.alertContacts?.slack?.channels || []);
          if (data.group) setSelectedGroup(data.group);
          
          // Load notification preferences
          if (data.notificationPreferences) {
            setDownAlerts(data.notificationPreferences.downAlerts);
            setUpAlerts(data.notificationPreferences.upAlerts);
            setLatencyAlerts(data.notificationPreferences.latencyAlerts);
          }
        } else {
          // Website data not found, initialize with query parameters
          setWebsite({ id: parseInt(id as string) });
          setFriendlyName((queryFriendlyName as string) || '');
          setUrl((queryUrl as string) || '');
        }
      } catch (error) {
        console.error('Failed to fetch website data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWebsiteData();
  }, [id, queryFriendlyName, queryUrl]);

  const handleSave = async () => {
    const alertContacts = {
      slack: {
        users: selectedUsers,
        channels: selectedChannels,
      },
    };

    const updateData = {
      friendlyName,
      url,
      alertContacts,
      group: selectedGroup ? { _id: selectedGroup._id, name: selectedGroup.name } : null,
      notificationPreferences: {
        downAlerts,
        upAlerts,
        latencyAlerts,
      },
    };


    try {
      const response = await fetch(`/api/websites/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success('Website updated successfully');
      } else {
        const data = await response.json();
        toast.error(`Error updating website: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update website:', error);
      toast.error('Failed to update website');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <Spinner />
      </div>
    );
  }

  // Helper functions to get user/channel names
  const getUserNameById = (id: string): string => {
    const user = userOptions.find((u) => u.id === id);
    return user ? user.name : id;
  };

  const getChannelNameById = (id: string): string => {
    const channel = channelOptions.find((c) => c.id === id);
    return channel ? channel.name : id;
  };

  const handleCancel = () => {
    router.push('/websites');
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${friendlyName}?`)) {
      // TODO: Implement delete functionality
      router.push('/websites');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Navigation Header */}
      <Header currentPage="edit" />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Breadcrumb & Back */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
          <Link href="/websites" className="hover:text-zinc-300 flex items-center gap-1 transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            Websites List
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-zinc-200">{friendlyName || 'Edit Monitor'}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-zinc-900 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Edit Monitor</h1>
            <p className="text-zinc-400 mt-1">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  Loading...
                </span>
              ) : (
                <>Modify monitoring settings for <span className="text-blue-400">{friendlyName}</span></>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-[var(--bg-elevated)] transition-all font-medium text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 transition-all font-semibold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="space-y-8">
          {/* Section 1: Website Information */}
          <section className="p-6 rounded-2xl bg-[var(--bg-deepest)] border border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Globe className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold">Website Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Display Name
                </label>
                <input 
                  type="text" 
                  value={friendlyName}
                  onChange={(e) => setFriendlyName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[var(--bg-elevated)] border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={loading ? "Loading..." : ""}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Website URL
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                  <input 
                    type="url" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[var(--bg-elevated)] border border-zinc-800 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder={loading ? "Loading..." : ""}
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Group
                </label>
                <GroupAutocomplete
                  value={selectedGroup}
                  onChange={setSelectedGroup}
                  websiteId={website?.id || 0}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Alert Contacts */}
          <section className="p-6 rounded-2xl bg-[var(--bg-deepest)] border border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold">Alert Contacts</h2>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                  Slack Channels
                </label>
                <MultiSelectDropdown
                  apiEndpoint="/api/slackChannels"
                  placeholder="Select channels..."
                  selectedPlaceholder="channel(s)"
                  labelKey="name"
                  idKey="id"
                  selectedItems={selectedChannels}
                  setSelectedItems={setSelectedChannels}
                  onItemsLoaded={(items) => setChannelOptions(items)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {selectedChannels.map((channelId) => (
                    <label 
                      key={channelId}
                      className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Hash className="w-4 h-4 text-zinc-400" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{getChannelNameById(channelId)}</span>
                          <span className="text-[10px] text-zinc-500">Slack Channel</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                  Individual Users
                </label>
                <MultiSelectDropdown
                  apiEndpoint="/api/slackUsers"
                  placeholder="Select users..."
                  selectedPlaceholder="user(s)"
                  labelKey="name"
                  idKey="id"
                  selectedItems={selectedUsers}
                  setSelectedItems={setSelectedUsers}
                  onItemsLoaded={(items) => setUserOptions(items)}
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {selectedUsers.map((userId) => {
                    const userName = getUserNameById(userId);
                    return (
                      <label 
                        key={userId}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all text-center"
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full border border-zinc-800 bg-[var(--bg-elevated)] flex items-center justify-center text-white font-semibold text-sm">
                            {userName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <span className="text-xs font-medium">{userName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Notification Preferences */}
          <section className="p-6 rounded-2xl bg-[var(--bg-deepest)] border border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Bell className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-900 bg-black">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Down Alerts</p>
                    <p className="text-xs text-zinc-500">Send notification immediately when the monitor goes down.</p>
                  </div>
                </div>
                <label className="relative inline-block w-11 h-6">
                  <input 
                    type="checkbox" 
                    checked={downAlerts}
                    onChange={(e) => setDownAlerts(e.target.checked)}
                    className="opacity-0 w-0 h-0 peer"
                  />
                  <span className="absolute cursor-pointer inset-0 bg-[var(--bg-subtle)] rounded-full transition-colors peer-checked:bg-blue-500">
                    <span className="absolute h-[18px] w-[18px] left-[3px] bottom-[3px] bg-white rounded-full transition-transform peer-checked:translate-x-5"></span>
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-900 bg-black">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Up Alerts</p>
                    <p className="text-xs text-zinc-500">Notify when the service recovers and is back online.</p>
                  </div>
                </div>
                <label className="relative inline-block w-11 h-6">
                  <input 
                    type="checkbox" 
                    checked={upAlerts}
                    onChange={(e) => setUpAlerts(e.target.checked)}
                    className="opacity-0 w-0 h-0 peer"
                  />
                  <span className="absolute cursor-pointer inset-0 bg-[var(--bg-subtle)] rounded-full transition-colors peer-checked:bg-blue-500">
                    <span className="absolute h-[18px] w-[18px] left-[3px] bottom-[3px] bg-white rounded-full transition-transform peer-checked:translate-x-5"></span>
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-900 bg-black">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Clock4 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Latency Alerts</p>
                    <p className="text-xs text-zinc-500">Notify if response time exceeds 2000ms for 3 consecutive checks.</p>
                  </div>
                </div>
                <label className="relative inline-block w-11 h-6">
                  <input 
                    type="checkbox" 
                    checked={latencyAlerts}
                    onChange={(e) => setLatencyAlerts(e.target.checked)}
                    className="opacity-0 w-0 h-0 peer"
                  />
                  <span className="absolute cursor-pointer inset-0 bg-[var(--bg-subtle)] rounded-full transition-colors peer-checked:bg-blue-500">
                    <span className="absolute h-[18px] w-[18px] left-[3px] bottom-[3px] bg-white rounded-full transition-transform peer-checked:translate-x-5"></span>
                  </span>
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="mt-12 pt-8 border-t border-zinc-900 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          <button 
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-500 hover:text-red-400 text-sm font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete this monitor
          </button>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={handleCancel}
              className="flex-1 sm:flex-none px-8 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:bg-[var(--bg-elevated)] transition-all font-medium text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 sm:flex-none px-8 py-3 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all font-bold text-sm shadow-lg shadow-white/5 cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditWebsite;
