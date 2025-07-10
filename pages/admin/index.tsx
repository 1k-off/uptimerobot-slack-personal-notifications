import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from 'sonner';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Session } from '@/types';

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // State for storing selected user and channel IDs
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

    if (status === "loading") {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    const typedSession = session as Session | null;
    if (!typedSession || !typedSession.user.isAdmin) {
        router.push('/unauthorized');
        return null;
    }

    const handleTestSlackMessage = async () => {
        // Validate if at least one recipient is selected
        if (selectedUsers.length === 0 && selectedChannels.length === 0) {
            toast.warning("Please select at least one user or channel to send the message to");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/test-slack-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    users: selectedUsers,
                    channels: selectedChannels,
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
        <div className="container py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/admin/messages')}
                    >
                        View Messages
                    </Button>
                </div>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Slack Integration Test</CardTitle>
                    <CardDescription>
                        Send a test message to Slack users or channels to verify your integration
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div>
                            <div className="mb-4">
                                <h3 className="text-lg font-medium mb-2">Select Recipients</h3>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Users
                                    </label>
                                    <MultiSelectDropdown
                                        apiEndpoint="/api/slackUsers"
                                        placeholder="Select Users"
                                        selectedPlaceholder="users"
                                        labelKey="name"
                                        idKey="id"
                                        selectedItems={selectedUsers}
                                        setSelectedItems={setSelectedUsers}
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Channels
                                    </label>
                                    <MultiSelectDropdown
                                        apiEndpoint="/api/slackChannels"
                                        placeholder="Select Channels"
                                        selectedPlaceholder="channels"
                                        labelKey="name"
                                        idKey="id"
                                        selectedItems={selectedChannels}
                                        setSelectedItems={setSelectedChannels}
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleTestSlackMessage}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                {loading ? "Sending..." : "Send Test Message"}
                            </Button>
                        </div>

                        {result && (
                            <Alert className="mt-4">
                                <AlertDescription>
                                    <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 