import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Spinner } from '@/components/ui/spinner';
import { Palette, User, Hash, ArrowUp } from "lucide-react";
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';
import AlertModal from '@/components/AlertModal';
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
  const [websites, setWebsites] = useState<Website[]>([]);
  const [userOptions, setUserOptions] = useState<SlackUser[]>([]);
  const [channelOptions, setChannelOptions] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);

  const fetchWebsites = async () => {
    try {
      const response = await fetch('/api/websites');
      if (!response.ok) {
        throw new Error('Failed to fetch websites');
      }
      const data = await response.json();
      setWebsites(data.success ? data.data : data);
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

  useEffect(() => {
    fetchWebsites();
    fetchUserOptions();
    fetchChannelOptions();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold">Websites List</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {websites.length} / {process.env.NEXT_PUBLIC_UPTIMEROBOT_WEBSITES_ALL || '50'} websites
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleCreateMonitor}
              disabled={websites.length >= Number(process.env.NEXT_PUBLIC_UPTIMEROBOT_WEBSITES_ALL || 50)}
            >
              Create
            </Button>
            <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              <Palette />
            </Button>
            <Button onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {websites.map((website) => (
            <Card key={website.id}>
              <CardHeader>
                <CardTitle>{website.friendly_name}</CardTitle>
                <CardDescription>
                  <Link 
                    href={website.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {website.url}
                  </Link>
                  {website.group && (
                      <div className="mt-2">
                          <span className="text-sm">
                            Group: {website.group.name}
                          </span>
                      </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Display Alert Contacts if they exist */}
                {(
                  (website.alertContacts?.slack?.users?.length ?? 0) > 0 ||
                  (website.alertContacts?.slack?.channels?.length ?? 0) > 0
                ) && (
                  <div className="mt-2">
                    <h3 className="text-lg font-semibold">Alert Contacts:</h3>
                    <div className="flex flex-wrap mt-2">
                      {/* Display Users */}
                      {(website.alertContacts?.slack?.users?.length ?? 0) > 0 && (
                        <div className="flex items-center mr-4">
                          <User className="mr-1" />
                          {website.alertContacts!.slack!.users!.map((userId) => (
                            <span key={userId} className="mr-2">
                              {getUserNameById(userId)}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Display Channels */}
                      {(website.alertContacts?.slack?.channels?.length ?? 0) > 0 && (
                        <div className="flex items-center">
                          <Hash className="mr-1" />
                          {website.alertContacts!.slack!.channels!.map((channelId) => (
                            <span key={channelId} className="mr-2">
                              {getChannelNameById(channelId)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button className="mr-2" variant="secondary" onClick={() => handleEdit(website)}>
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => handleDeleteMonitor(website)}>
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      <div className="fixed bottom-6 right-6">
        <Button variant="outline" size="icon" onClick={handleGoToTop}>
          <ArrowUp />
        </Button>
      </div>
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

      setResult({ success: true, message: data.message || 'Success!' });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 capitalize">
        {action === 'newMonitor' ? 'Create Monitor' : 'Delete Monitor'}
      </h2>
      {action === 'newMonitor' && (
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="url">
            URL
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            className="mb-4 w-full rounded border p-2"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <label className="block mb-2 font-semibold" htmlFor="keyword">
            Keyword
          </label>
          <input
            id="keyword"
            name="keyword"
            type="text"
            required
            className="mb-4 w-full rounded border p-2"
            placeholder="Text to monitor on the page"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />

          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="mr-2"
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      )}

      {action === 'deleteMonitor' && (
        <form onSubmit={handleSubmit}>
          <p className="mb-4 text-red-500">
            Are you sure you want to delete monitor ID {monitorId}?
          </p>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="mr-2"
              type="button"
            >
              Cancel
            </Button>
            <Button variant="destructive" type="submit" disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </form>
      )}

      {result && (
        <div
          className={`mt-4 p-3 rounded ${
            result.success
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
};

export default Websites;
