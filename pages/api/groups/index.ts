import { getDatabase } from '@/lib/db';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/api/response';
import type { Group } from '@/types';

interface CreateGroupRequest {
    name: string;
    websiteId?: number;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    const db = await getDatabase();

    switch (method) {
        case 'GET': {
            // Allow filtering groups by q query parameter (case-insensitive search)
            const { q } = req.query;
            const query = q && typeof q === 'string' ? { name: { $regex: q, $options: 'i' } } : {};
            
            const groups = await db.collection('groups').find(query).toArray();
            res.status(200).json(groups.map(g => ({
                _id: g._id.toString(),
                name: g.name,
                websites: g.websites,
                createdAt: g.createdAt
            })) as Group[]);
            return;
        }
        
        case 'POST': {
            // Create a new group or add a website to an existing group
            const { name, websiteId } = req.body as CreateGroupRequest;
            
            if (!name) {
                res.status(400).json({ error: 'Group name is required' });
                return;
            }
            
            // Look for an existing group with the same name
            const existingGroup = await db.collection('groups').findOne({ name });
            
            if (!existingGroup) {
                // Create a new group
                const newGroup = {
                    name,
                    websites: websiteId ? [websiteId] : [],
                    createdAt: new Date(),
                };
                const insertResult = await db.collection('groups').insertOne(newGroup);
                res.status(200).json({
                    _id: insertResult.insertedId.toString(),
                    ...newGroup
                } as Group);
                return;
            } else {
                // Group exists
                const updatedWebsites = websiteId && !existingGroup.websites?.includes(websiteId)
                    ? [...(existingGroup.websites || []), websiteId]
                    : existingGroup.websites || [];
                
                if (websiteId && !existingGroup.websites?.includes(websiteId)) {
                    // Add websiteId to existing group if not present
                    await db.collection('groups').updateOne(
                        { _id: existingGroup._id },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        { $push: { websites: websiteId } } as any
                    );
                }
                
                res.status(200).json({
                    _id: existingGroup._id.toString(),
                    name: existingGroup.name,
                    websites: updatedWebsites,
                    createdAt: existingGroup.createdAt
                } as Group);
                return;
            }
        }
        
        default:
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).end(`Method ${method} Not Allowed`);
            return;
    }
}

export default withErrorHandler(handler);
