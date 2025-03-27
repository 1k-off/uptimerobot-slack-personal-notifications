// pages/admin.js
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const { toast } = useToast();

    // State for storing selected user and channel IDs
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedChannels, setSelectedChannels] = useState([]);

    if (status === "loading") {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!session || !session.user.isAdmin) {
        router.push('/unauthorized');
        return null;
    }

    const handleTestSlackMessage = async () => {
        // Validate if at least one recipient is selected
        if (selectedUsers.length === 0 && selectedChannels.length === 0) {
            toast({
                title: "Warning",
                description: "Please select at least one user or channel to send the message to",
                duration: 5000,
            });
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
                toast({
                    title: "Success",
                    description: "Test Slack message sent successfully!",
                    duration: 5000,
                });
                setResult(data);
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to send test Slack message",
                    variant: "destructive",
                    duration: 5000,
                });
                setResult(data);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
                duration: 5000,
            });
            console.error("Error sending test Slack message:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

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