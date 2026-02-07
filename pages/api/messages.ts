import { NextApiRequest, NextApiResponse } from 'next';
import { messageRepository } from '@/lib/db';
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
    const messagesData = await messageRepository.findAll();
    
    // Limit to last 100 messages (already sorted in repository)
    const messages = messagesData.slice(0, 100) as unknown as Message[];
    
    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 