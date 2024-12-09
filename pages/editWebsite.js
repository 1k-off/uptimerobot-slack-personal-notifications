import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from '@/components/ui/card';
import { User, Hash } from 'lucide-react'; // Icons for user and channel

const EditWebsite = () => {
  const router = useRouter();
  const { id, friendlyName: queryFriendlyName, url: queryUrl } = router.query;
  const [website, setWebsite] = useState(null);
  const [friendlyName, setFriendlyName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [userOptions, setUserOptions] = useState([]); // To store all user options
  const [channelOptions, setChannelOptions] = useState([]); // To store all channel options
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null); // Added state for alert message
  const [alertType, setAlertType] = useState(null); // Added state for alert type

  useEffect(() => {
    if (!id) return;

    const fetchWebsiteData = async () => {
      try {
        const response = await fetch(`/api/websites/${id}`);
        if (response.ok) {
          const data = await response.json();
          setWebsite(data);
          setFriendlyName(data.friendlyName || queryFriendlyName || '');
          setUrl(data.url || queryUrl || '');
          setSelectedUsers(data.alertContacts?.slack?.users || []);
          setSelectedChannels(data.alertContacts?.slack?.channels || []);
        } else {
          // Website data not found, initialize with query parameters
          setWebsite({ id: parseInt(id) });
          setFriendlyName(queryFriendlyName || '');
          setUrl(queryUrl || '');
        }
      } catch (error) {
        console.error('Failed to fetch website data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWebsiteData();
  }, [id, queryFriendlyName, queryUrl]);

  // Fetch all user options to display selected user names
  useEffect(() => {
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

    fetchUserOptions();
    fetchChannelOptions();
  }, []);

  const handleSave = async () => {
    const alertContacts = {
      slack: {
        users: selectedUsers,
        channels: selectedChannels,
      },
    };

    try {
      const response = await fetch(`/api/websites/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alertContacts, friendlyName, url }),
      });

      if (response.ok) {
        setAlertMessage('Website updated successfully'); // Set alert message on success
        setAlertType('success'); // Set alert type on success
        setTimeout(() => {
          router.push('/websites');
        }, 2000); // Redirect after 2 seconds
      } else {
        const data = await response.json();
        setAlertMessage(`Error updating website: ${data.error}`); // Set alert message on error
        setAlertType('error'); // Set alert type on error
      }
    } catch (error) {
      console.error('Failed to update website:', error);
      setAlertMessage('Failed to update website'); // Set alert message on catch
      setAlertType('error'); // Set alert type on catch
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Helper functions to get user/channel names
  const getUserNameById = (id) => {
    const user = userOptions.find((u) => u.id === id);
    return user ? user.name : id;
  };

  const getChannelNameById = (id) => {
    const channel = channelOptions.find((c) => c.id === id);
    return channel ? channel.name : id;
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">
        Edit Website - {friendlyName || 'Unknown'}
      </h1>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:space-x-4">
          <div className="md:w-1/2">
            <Label htmlFor="friendlyName">Friendly Name</Label>
            <Input
              disabled
              id="friendlyName"
              type="text"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
            />
          </div>
          <div className="md:w-1/2">
            <Label htmlFor="url">URL</Label>
            <Input
              disabled
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>
        <hr className="mb-4"/>
        {/* Users Section */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Select Users</h2>
          <MultiSelectDropdown
            apiEndpoint="/api/slackUsers"
            placeholder="Select users..."
            selectedPlaceholder="user(s)"
            labelKey="name"
            idKey="id"
            selectedItems={selectedUsers}
            setSelectedItems={setSelectedUsers}
          />
          {/* Display selected users */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-8 gap-4">
            {selectedUsers.map((userId) => (
              <Card key={userId}>
                <CardHeader className="flex items-center">
                  <User className="mr-2" />
                  <CardTitle>{getUserNameById(userId)}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Channels Section */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Select Channels</h2>
          <MultiSelectDropdown
            apiEndpoint="/api/slackChannels"
            placeholder="Select channels..."
            selectedPlaceholder="channel(s)"
            labelKey="name"
            idKey="id"
            selectedItems={selectedChannels}
            setSelectedItems={setSelectedChannels}
          />
          {/* Display selected channels */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-8 gap-4">
            {selectedChannels.map((channelId) => (
              <Card key={channelId}>
                <CardHeader className="flex items-center">
                  <Hash className="mr-2" />
                  <CardTitle>{getChannelNameById(channelId)}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
        <hr className="mb-4"/>
        <Button onClick={handleSave}>Save</Button>
        {alertMessage && (
          <Alert variant={alertType}>
            <AlertTitle>{alertType === 'success' ? 'Success' : 'Error'}</AlertTitle>
            <AlertDescription>
              {alertMessage}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default EditWebsite;
