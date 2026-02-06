import { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '@/lib/db';
import { Message } from '@/types';

interface ApiResponse {
  messages?: Message[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const db = await getDatabase();
    const messagesCollection = db.collection('messages');
    
    // Get messages sorted by creation date (newest first)
    const messagesData = await messagesCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(100) // Limit to last 100 messages
      .toArray();
    
    const messages = messagesData as unknown as Message[];
    
    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 