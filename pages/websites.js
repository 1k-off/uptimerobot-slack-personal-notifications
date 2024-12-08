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
import { Palette, User, Hash } from "lucide-react";
import { useRouter } from 'next/router';

const Websites = () => {
  const [websites, setWebsites] = useState([]);
  const [userOptions, setUserOptions] = useState([]); // To store all user options
  const [channelOptions, setChannelOptions] = useState([]); // To store all channel options
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

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

  const handleEditContacts = (website) => {
    router.push({
      pathname: '/editWebsite',
      query: {
        id: website.id,
        friendlyName: website.friendly_name,
        url: website.url,
      },
    });
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
            <Button>Request create</Button>
            <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              <Palette />
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
                <Button variant="secondary" onClick={() => handleEditContacts(website)}>
                  Edit Contacts
                </Button>
                <Button variant="destructive">Request delete</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Websites;
