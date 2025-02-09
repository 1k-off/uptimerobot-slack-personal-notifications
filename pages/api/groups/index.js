import { connectToDatabase } from '@/lib/mongodb';

export default async function handler(req, res) {
  const { method } = req;
  const { db } = await connectToDatabase();

  switch (method) {
    case 'GET': {
      // Allow filtering groups by q query parameter (case-insensitive search)
      const { q } = req.query;
      const query = q ? { name: { $regex: q, $options: 'i' } } : {};
      try {
        const groups = await db.collection('groups').find(query).toArray();
        return res.status(200).json(groups);
      } catch (error) {
        console.error('Error fetching groups:', error);
        return res.status(500).json({ error: 'Failed to fetch groups' });
      }
    }
    case 'POST': {
      // Create a new group or add a website to an existing group
      const { name, websiteId } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Group name is required' });
      }
      try {
        // Look for an existing group with the same name
        let group = await db.collection('groups').findOne({ name });
        if (!group) {
          // Create a new group
          const newGroup = {
            name,
            websites: websiteId ? [websiteId] : [],
            createdAt: new Date(),
          };
          const insertResult = await db.collection('groups').insertOne(newGroup);
          group = { _id: insertResult.insertedId, ...newGroup };
        } else if (websiteId && !group.websites.includes(websiteId)) {
          // Add websiteId to existing group if not present
          await db.collection('groups').updateOne(
            { _id: group._id },
            { $push: { websites: websiteId } }
          );
          // For response, add updated websites list (optional)
          group.websites.push(websiteId);
        }
        return res.status(200).json(group);
      } catch (error) {
        console.error('Error creating/updating group:', error);
        return res.status(500).json({ error: 'Failed to process group data' });
      }
    }
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}