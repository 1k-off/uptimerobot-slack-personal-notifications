import { websiteRepository } from '@/lib/db';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/api/response';
import type { Group } from '@/types';

interface UpdateWebsiteRequest {
    alertContacts?: string[];
    friendlyName?: string;
    url?: string;
    group?: Group | null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const { method } = req;

    const websiteId = parseInt(id as string);

    if (isNaN(websiteId)) {
        return res.status(400).json({ error: 'Invalid website ID' });
    }

    switch (method) {
        case 'GET': {
            const website = await websiteRepository.findById(websiteId);
            if (!website) {
                return res.status(404).json({ error: 'Website not found' });
            }

            return res.status(200).json(website);
        }
        
        case 'PUT': {
            const { alertContacts, friendlyName, url, group } = req.body as UpdateWebsiteRequest;

            const updateFields: Record<string, unknown> = {
                alertContacts,
            };

            if (friendlyName) updateFields.friendlyName = friendlyName;
            if (url) updateFields.url = url;
            if (group) updateFields.group = group;

            await websiteRepository.upsert(websiteId, updateFields);

            res.status(200).json({ message: 'Website updated successfully' });
            return;
        }
        
        default:
            res.setHeader('Allow', ['GET', 'PUT']);
            res.status(405).end(`Method ${method} Not Allowed`);
            return;
    }
}

export default withErrorHandler(handler);
