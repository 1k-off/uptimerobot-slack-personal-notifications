import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Message, Session } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';

export default function AdminMessages() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    const typedSession = session as Session | null;
    if (!typedSession || !typedSession.user.isAdmin) {
      router.push('/unauthorized');
      return;
    }

    fetchMessages();
  }, [session, status]);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerCleanup = async () => {
    setCleanupLoading(true);
    try {
      const response = await fetch('/api/cleanup-messages', {
        method: 'POST',
      });
      
      if (response.ok) {
        toast.success('Cleanup completed successfully');
        fetchMessages(); // Refresh the list
      } else {
        toast.error('Cleanup failed');
      }
    } catch (error) {
      console.error('Error triggering cleanup:', error);
      toast.error('Cleanup failed');
    } finally {
      setCleanupLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/admin')}
            >
              ← Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Slack Messages Admin</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                View and manage Slack message records
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={triggerCleanup}
          disabled={cleanupLoading}
          variant="destructive"
        >
          {cleanupLoading ? 'Cleaning...' : 'Trigger Cleanup'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message._id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {message.messageId}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Channel: {message.channelId}
                      </span>
                      {message.threadTs && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Thread: {message.threadTs}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Website ID: {message.websiteId} | 
                      Alert Type: {message.alertType} |
                      Created: {new Date(message.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No messages found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 