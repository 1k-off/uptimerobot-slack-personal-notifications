import { NextApiRequest, NextApiResponse } from 'next';
import { messageRepository } from '@/lib/db';
import { Message } from '@/types';

interface ApiResponse {
  messages?: Message[];
  total?: number;
  page?: number;
  limit?: number;
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
    const { page = '1', limit = '50', search = '' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const searchStr = search as string;

    const { messages, total } = await messageRepository.findWithPagination(
      pageNum,
      limitNum,
      searchStr.trim() || undefined
    );
    
    res.status(200).json({ 
      messages: messages as unknown as Message[],
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 