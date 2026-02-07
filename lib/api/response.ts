import { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from './errors';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

export type ApiHandler<T = unknown> = (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<T>>
) => Promise<void> | void;

export function withErrorHandler<T = unknown>(
  handler: ApiHandler<T>
): ApiHandler<T> {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof ApiError) {
        const response: ApiResponse<T> = {
          success: false,
          error: error.message,
        };
        if (error.details) {
          response.data = error.details as T;
        }
        return res.status(error.statusCode).json(response);
      }

      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          error: error.message,
        } as ApiResponse<T>);
      }

      return res.status(500).json({
        success: false,
        error: 'An unexpected error occurred',
      } as ApiResponse<T>);
    }
  };
}

export function sendSuccess<T>(
  res: NextApiResponse<ApiResponse<T>>,
  data?: T,
  metadata?: { message?: string; total?: number; page?: number; limit?: number }
): void {
  res.status(200).json({
    success: true,
    ...(data !== undefined && { data }),
    ...(metadata?.message && { message: metadata.message }),
    ...(metadata?.total !== undefined && { total: metadata.total }),
    ...(metadata?.page !== undefined && { page: metadata.page }),
    ...(metadata?.limit !== undefined && { limit: metadata.limit }),
  });
}

export function sendCreated<T>(
  res: NextApiResponse<ApiResponse<T>>,
  data?: T,
  message?: string
): void {
  res.status(201).json({
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  });
}

export function sendError(
  res: NextApiResponse<ApiResponse>,
  statusCode: number,
  error: string,
  details?: unknown
): void {
  const response: ApiResponse = {
    success: false,
    error,
  };
  if (details) {
    response.data = details;
  }
  res.status(statusCode).json(response);
}
