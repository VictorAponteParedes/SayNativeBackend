export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  timestamp: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginatedMeta;
}
