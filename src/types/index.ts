export type ApiResponse<T = unknown> =
  | { success: true;  data: T;      error?: never }
  | { success: false; data?: never; error: string };

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}