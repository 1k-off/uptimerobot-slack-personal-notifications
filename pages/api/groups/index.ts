import { groupRepository } from '@/lib/db';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/api/response';
import type { Group } from '@/types';

interface CreateGroupRequest {
    name: string;
    websiteId?: number;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    switch (method) {
        case 'GET': {
            // Allow filtering groups by q query parameter (case-insensitive search)
            const { q } = req.query;
            
            let groups;
            if (q && typeof q === 'string') {
                // For search, we'd need to add a search method to the repository
                // For now, get all and filter (not optimal for large datasets)
                const allGroups = await groupRepository.findAll();
                groups = allGroups.filter(g => 
                    g.name.toLowerCase().includes(q.toLowerCase())
                );
            } else {
                groups = await groupRepository.findAll();
            }
            
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
            const existingGroup = await groupRepository.findByName(name);
            
            if (!existingGroup) {
                // Create a new group
                const newGroup = await groupRepository.create({
                    name,
                    websites: websiteId ? [websiteId] : [],
                });
                
                res.status(200).json({
                    _id: newGroup._id.toString(),
                    name: newGroup.name,
                    websites: newGroup.websites,
                    createdAt: newGroup.createdAt
                } as Group);
                return;
            } else {
                // Group exists - add website if needed
                if (websiteId && !existingGroup.websites?.includes(websiteId)) {
                    await groupRepository.addWebsiteToGroup(
                        existingGroup._id.toString(),
                        websiteId
                    );
                }
                
                const updatedWebsites = websiteId && !existingGroup.websites?.includes(websiteId)
                    ? [...(existingGroup.websites || []), websiteId]
                    : existingGroup.websites || [];
                
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
