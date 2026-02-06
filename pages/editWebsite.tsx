import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import GroupAutocomplete from '@/components/GroupAutocomplete';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent
} from '@/components/ui/card';

import { User, Hash } from 'lucide-react';
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
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error' | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

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

  // Fetch all user options to display selected user names
  useEffect(() => {
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

    const updateData = {
      friendlyName,
      url,
      alertContacts,
      group: selectedGroup ? { _id: selectedGroup._id, name: selectedGroup.name } : null,
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
        setAlertMessage('Website updated successfully');
        setAlertType('success');
        setTimeout(() => {
          router.push('/websites');
        }, 2000);
      } else {
        const data = await response.json();
        setAlertMessage(`Error updating website: ${data.error}`);
        setAlertType('error');
      }
    } catch (error) {
      console.error('Failed to update website:', error);
      setAlertMessage('Failed to update website');
      setAlertType('error');
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
  const getUserNameById = (id: string): string => {
    const user = userOptions.find((u) => u.id === id);
    return user ? user.name : id;
  };

  const getChannelNameById = (id: string): string => {
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
              <Card key={userId} className="py-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">{getUserNameById(userId)}</span>
                  </div>
                </CardContent>
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
              <Card key={channelId} className="py-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    <span className="text-sm font-medium">{getChannelNameById(channelId)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        {/* Group section */}
        <div>
          <GroupAutocomplete
              value={selectedGroup}
              onChange={setSelectedGroup}
              websiteId={website?.id || 0}
          />
        </div>
        <hr className="mb-4"/>
        <Button onClick={handleSave}>Save</Button>
        {alertMessage && (
          <Alert variant={alertType === 'success' ? 'default' : 'destructive'}>
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
