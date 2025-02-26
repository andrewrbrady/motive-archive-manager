/**
 * Generic API response type
 */
export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Route handler interface
 */
export interface RouteHandler<T, P = object> {
  GET?: (params: P) => Promise<T>;
  POST?: (params: P, body: any) => Promise<T>;
  PUT?: (params: P, body: any) => Promise<T>;
  DELETE?: (params: P) => Promise<T>;
}

/**
 * Route parameters with ID
 */
export interface RouteParamsWithId {
  params: {
    id: string;
  };
}

/**
 * Search parameters interface
 */
export interface SearchParams {
  page?: string;
  pageSize?: string;
  sort?: string;
  [key: string]: string | undefined;
}
