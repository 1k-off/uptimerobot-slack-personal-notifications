import { connectToDatabase } from '@/lib/mongodb';

export default async function handler(req, res) {
  const { id } = req.query;
  const { method } = req;

  const websiteId = parseInt(id);

  if (isNaN(websiteId)) {
    return res.status(400).json({ error: 'Invalid website ID' });
  }

  try {
    const { db } = await connectToDatabase();

    switch (method) {
      case 'GET':
        try {
          const website = await db.collection('websites').findOne({ id: websiteId });
          if (!website) {
            return res.status(404).json({ error: 'Website not found' });
          }

          res.status(200).json(website);
        } catch (error) {
          console.error('Error fetching website data:', error);
          res.status(500).json({ error: 'Failed to fetch website data' });
        }
        break;
      case 'PUT':
        try {
          const { alertContacts, friendlyName, url, group } = req.body;

          const updateFields = {
            alertContacts,
            updatedAt: new Date(),
          };

          if (friendlyName) updateFields.friendlyName = friendlyName;
          if (url) updateFields.url = url;

          // Build the update query with $set and $setOnInsert
          const updateQuery = {
            $set: updateFields,
            $setOnInsert: {
              id: websiteId,
              createdAt: new Date(),
            },
          };

          // For the group field, either update it if provided, or unset it if falsy
          if (group) {
            updateQuery.$set.group = group;
          } else {
            updateQuery.$unset = { group: "" };
          }

          await db.collection('websites').updateOne(
              { id: websiteId },
              updateQuery,
              { upsert: true }
          );

          res.status(200).json({ message: 'Website updated successfully' });
        } catch (error) {
          console.error('Error updating website data:', error);
          res.status(500).json({ error: 'Failed to update website data' });
        }
        break;
      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}