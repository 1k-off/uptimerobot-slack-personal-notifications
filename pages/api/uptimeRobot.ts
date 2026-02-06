import { getDatabase } from '@/lib/db';
import { fetchMonitors, newMonitor, deleteMonitor } from '@/lib/uptimeRobot';
import { sendSlackNotification } from '@/lib/slack';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/api/response';

interface NewMonitorRequest {
    action: 'newMonitor';
    url: string;
    keyword_value?: string;
}

interface DeleteMonitorRequest {
    action: 'deleteMonitor';
    id: string;
    url?: string;
    friendly_name?: string;
}

type UptimeRobotRequest = NewMonitorRequest | DeleteMonitorRequest;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Get user session
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    if (method === 'GET') {
        const monitors = await fetchMonitors();
        res.status(200).json(monitors);
        return;
    }

    if (method === 'POST') {
        const { action } = req.body as UptimeRobotRequest;

        switch (action) {
            case 'newMonitor': {
                const { url, keyword_value } = req.body as NewMonitorRequest;
                
                if (!url) {
                    res.status(400).json({ error: 'Missing "url" in request body' });
                    return;
                }

                // Friendly name same as URL but without the schema for simplicity
                const friendly_name = url.replace(/(^\w+:|^)\/\//, '');
                const createdData = await newMonitor({ friendly_name, url, keyword_value: keyword_value || undefined });

                // Send Slack notification
                await sendSlackNotification({
                    action: 'created',
                    url,
                    friendly_name,
                    userEmail: session.user?.email || 'Unknown',
                });

                res.status(200).json({
                    message: 'Monitor created',
                    data: createdData
                });
                return;
            }

            case 'deleteMonitor': {
                const { id, url, friendly_name } = req.body as DeleteMonitorRequest;

                if (!id) {
                    res.status(400).json({ error: 'Missing "id" in request body' });
                    return;
                }
                
                const numericId = parseInt(id, 10);
                const deletedData = await deleteMonitor({ id: numericId });

                let dbResult = { acknowledged: false, deletedCount: 0 };
                try {
                    const db = await getDatabase();
                    dbResult = await db.collection('websites').deleteOne({ id: numericId });
                } catch (dbError) {
                    console.error('Error deleting website from DB:', dbError);
                    res.status(500).json({
                        error: 'Monitor deleted from UptimeRobot, but failed to delete record in DB.',
                        dbError,
                    });
                    return;
                }
                
                await sendSlackNotification({
                    action: 'deleted',
                    url: url || 'Unknown URL',
                    friendly_name: friendly_name || 'Unknown Name',
                    userEmail: session.user?.email || 'Unknown',
                });

                res.status(200).json({
                    message: 'Monitor deleted',
                    data: {
                        uptimeRobotResult: deletedData,
                        dbDeleted: dbResult.deletedCount > 0,
                    }
                });
                return;
            }

            default:
                res.status(400).json({ error: 'Invalid action' });
                return;
        }
    }

    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${method} Not Allowed`);
}

export default withErrorHandler(handler);
