import { connectToDatabase } from '../../lib/mongodb';
import { fetchMonitors, newMonitor, deleteMonitor } from '../../lib/uptimeRobot';
import { sendSlackNotification } from '../../lib/slack';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  // Get user session
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;

  if (method === 'GET') {
    try {
      const monitors = await fetchMonitors();
      return res.status(200).json(monitors);
    } catch (error) {
      console.error('Error in uptimeRobot API (GET):', error);
      return res.status(500).json({ 
        error: typeof error === 'object' ? error : { message: String(error) }
      });
    }
  }

  if (method === 'POST') {
    try {
      const { action, url, keyword_value, id } = req.body;

      switch (action) {
        case 'newMonitor': {
          if (!url) {
            return res.status(400).json({ error: 'Missing "url" in request body' });
          }

          // Friendly name same as URL but without the schema for simplicity
          const friendly_name = url.replace(/(^\w+:|^)\/\//, '');
          const createdData = await newMonitor({ friendly_name, url, keyword_value });

          // Send Slack notification
          await sendSlackNotification({
            action: 'created',
            url,
            friendly_name,
            userEmail: session.user.email,
          });

          return res.status(200).json({
            message: 'Monitor created',
            data: createdData
          });
        }

        case 'deleteMonitor': {
          const { id, url, friendly_name } = req.body;
          
          if (!id) {
            return res.status(400).json({ error: 'Missing "id" in request body' });
          }
          const deletedData = await deleteMonitor({ id });
          const numericId = parseInt(id, 10);

          let dbResult = { acknowledged: false, deletedCount: 0 };
          try {
            const { db } = await connectToDatabase();
            dbResult = await db.collection('websites').deleteOne({ id: numericId });
          } catch (dbError) {
            console.error('Error deleting website from DB:', dbError);
            return res.status(500).json({
              error: 'Monitor deleted from UptimeRobot, but failed to delete record in DB.',
              dbError,
            });
          }
          await sendSlackNotification({
            action: 'deleted',
            url: url || 'Unknown URL', 
            friendly_name: friendly_name || 'Unknown Name',  
            userEmail: session.user.email,
          });
          
          return res.status(200).json({
            message: 'Monitor deleted',
            data: {
              uptimeRobotResult: deletedData,
              dbDeleted: dbResult.deletedCount > 0,
            }
          });
        }

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error in uptimeRobot API (POST):', error);
      return res.status(500).json({
        error: typeof error === 'object' ? error : { message: String(error) }
      });
    }
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${method} Not Allowed`);
}