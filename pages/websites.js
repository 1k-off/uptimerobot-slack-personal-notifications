import { useEffect, useState } from 'react';
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
import { useSession, signOut } from 'next-auth/react';
import AlertModal from '@/components/AlertModal';

const Websites = () => {
  const [websites, setWebsites] = useState([]);
  const [userOptions, setUserOptions] = useState([]); // To store all user options
  const [channelOptions, setChannelOptions] = useState([]); // To store all channel options
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { data: session, status } = useSession();

  const alertText = process.env.NEXT_PUBLIC_REQUEST_ALERT_TEXT || 'Default alert message.';
  const alertLink = process.env.NEXT_PUBLIC_REQUEST_ALERT_LINK || 'Default alert link.';

  const [modalContent, setModalContent] = useState(null);
  const [actionType, setActionType] = useState(''); // 'add' or 'delete'

  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        const response = await fetch('/api/websites');
        if (!response.ok) {
          throw new Error('Failed to fetch websites');
        }
        const data = await response.json();
        setWebsites(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserOptions = async () => {
      try {
        const response = await fetch('/api/slackUsers');
        if (response.ok) {
          const data = await response.json();
          setUserOptions(data);
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
          setChannelOptions(data);
        }
      } catch (error) {
        console.error('Failed to fetch channel options:', error);
      }
    };

    fetchWebsites();
    fetchUserOptions();
    fetchChannelOptions();
  }, []);

  const handleEdit = (website) => {
    router.push({
      pathname: '/editWebsite',
      query: {
        id: website.id,
        friendlyName: website.friendly_name,
        url: website.url,
      },
    });
  };

  const handleRequest = (action, defaultUrl = '') => {
    setActionType(action);
    setModalContent(
      <RequestForm 
        action={action}
        defaultUrl={defaultUrl}
        onClose={() => setModalContent(null)}
      />
    );
  };

  // Helper functions to get user/channel names
  const getUserNameById = (id) => {
    const user = userOptions.find((u) => u.id === id);
    return user ? user.name : id;
  };

  const getChannelNameById = (id) => {
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
          <h1 className="text-4xl font-bold">Websites List</h1>
          <div className="flex gap-2">
            <Button onClick={() => handleRequest('add')}>Request Create</Button>
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
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Display Alert Contacts if they exist */}
                {(
                  (website.alertContacts?.slack?.users?.length > 0) ||
                  (website.alertContacts?.slack?.channels?.length > 0)
                ) && (
                  <div className="mt-2">
                    <h3 className="text-lg font-semibold">Alert Contacts:</h3>
                    <div className="flex flex-wrap mt-2">
                      {/* Display Users */}
                      {website.alertContacts?.slack?.users?.length > 0 && (
                        <div className="flex items-center mr-4">
                          <User className="mr-1" />
                          {website.alertContacts.slack.users.map((userId) => (
                            <span key={userId} className="mr-2">
                              {getUserNameById(userId)}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Display Channels */}
                      {website.alertContacts?.slack?.channels?.length > 0 && (
                        <div className="flex items-center">
                          <Hash className="mr-1" />
                          {website.alertContacts.slack.channels.map((channelId) => (
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
                <Button variant="destructive" onClick={() => handleRequest('delete', website.url)}>Request Delete</Button>
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

// RequestForm Component
const RequestForm = ({ action, defaultUrl = '', onClose }) => {
  const [url, setUrl] = useState(defaultUrl);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const { data: session } = useSession(); // Get session to access user email

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!url) {
      setSubmissionResult({ success: false, message: 'URL is required.' });
      return;
    }

    setSubmitting(true);
    setSubmissionResult(null);

    try {
      // Fetch Slack user ID from API route
      const userIdResponse = await fetch('/api/getSlackUserId', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: session.user.email }),
      });

      const userIdData = await userIdResponse.json();

      if (!userIdResponse.ok) {
        throw new Error(userIdData.error || 'Failed to fetch Slack user ID.');
      }

      const reporterId = userIdData.userId;

      // Send payload to Slack workflow webhook via API route
      const webhookResponse = await fetch('/api/sendSlackWebhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          url,
          reporter: reporterId,
        }),
      });

      const webhookData = await webhookResponse.json();

      if (!webhookResponse.ok) {
        throw new Error(webhookData.error || 'Failed to send webhook.');
      }

      setSubmissionResult({ success: true, message: 'Request sent successfully.' });
      // Close the modal after successful submission (optional)
      onClose();
    } catch (error) {
      console.error('Error:', error);
      setSubmissionResult({ success: false, message: error.message || 'An error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 capitalize">{action} Website</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Website URL
          </label>
          <input
            type="url"
            id="url"
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://example.com"
            readOnly={action === 'delete'} // Make read-only if action is 'delete'
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
              action === 'delete'
                ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                : 'dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            }`}
          />
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting} className="mr-2">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </form>
      {submissionResult && (
        <div
          className={`mt-4 p-4 rounded ${
            submissionResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {submissionResult.message}
        </div>
      )}
    </div>
  );
};

export default Websites;
