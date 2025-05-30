/**
 * Pagination Utilities
 *
 * This file provides utilities for implementing pagination in database queries.
 */

import { config } from '@/config/config';

/**
 * Generates a cursor for the next page
 * This is a placeholder implementation - in a real application, you would
 * encode information about the last item in the current page
 * @param currentCursor Current cursor
 * @returns Next cursor
 */
function generateNextCursor(currentCursor: string): string {
  // In a real implementation, this would encode information about the last item
  // For now, we'll just append a suffix to indicate it's the next cursor
  return `${currentCursor}_next`;
}

/**
 * Generates a cursor for the previous page
 * This is a placeholder implementation - in a real application, you would
 * encode information about the first item in the current page
 * @param currentCursor Current cursor
 * @returns Previous cursor
 */
function generatePreviousCursor(currentCursor: string): string {
  // In a real implementation, this would encode information about the first item
  // For now, we'll just append a suffix to indicate it's the previous cursor
  return `${currentCursor}_prev`;
}

export interface PaginationOptions {
  /**
   * Page number (1-based)
   * @default 1
   */
  page?: number;

  /**
   * Number of items per page
   * @default config.database.defaultPageSize
   */
  pageSize?: number;

  /**
   * Cursor for cursor-based pagination
   */
  cursor?: string;

  /**
   * Sort field
   */
  sortBy?: string;

  /**
   * Sort direction
   * @default 'asc'
   */
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  /**
   * Array of items for the current page
   */
  items: T[];

  /**
   * Total number of items (across all pages)
   */
  total: number;

  /**
   * Current page number
   */
  page: number;

  /**
   * Number of items per page
   */
  pageSize: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Whether there is a next page
   */
  hasNextPage: boolean;

  /**
   * Whether there is a previous page
   */
  hasPreviousPage: boolean;

  /**
   * Cursor for the next page (cursor-based pagination only)
   */
  nextCursor?: string;

  /**
   * Cursor for the previous page (cursor-based pagination only)
   */
  previousCursor?: string;
}

/**
 * Normalizes pagination options
 * @param options Pagination options
 * @returns Normalized pagination options
 */
export function normalizePaginationOptions(
  options?: PaginationOptions
): Required<Omit<PaginationOptions, 'cursor' | 'sortBy' | 'sortDirection'>> &
  Pick<PaginationOptions, 'cursor' | 'sortBy' | 'sortDirection'> {
  const defaultPageSize = config.database.defaultPageSize || 20;
  const maxPageSize = config.database.maxPageSize || 100;

  // Default to page 1 if not specified or invalid
  const page = options?.page && options.page > 0 ? options.page : 1;

  // Use specified page size, but enforce limits
  let pageSize = options?.pageSize || defaultPageSize;
  pageSize = Math.min(pageSize, maxPageSize);
  pageSize = Math.max(pageSize, 1);

  return {
    page,
    pageSize,
    cursor: options?.cursor,
    sortBy: options?.sortBy,
    sortDirection: options?.sortDirection || 'asc',
  };
}

/**
 * Calculates offset and limit for SQL queries
 * @param options Pagination options
 * @returns Object with offset and limit
 */
export function calculateOffsetAndLimit(options?: PaginationOptions): {
  offset: number;
  limit: number;
} {
  const { page, pageSize } = normalizePaginationOptions(options);
  const offset = (page - 1) * pageSize;
  return { offset, limit: pageSize };
}

/**
 * Creates a paginated result
 * @param items Items for the current page
 * @param total Total number of items
 * @param options Pagination options
 * @returns Paginated result
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  options?: PaginationOptions
): PaginatedResult<T> {
  const { page, pageSize, cursor } = normalizePaginationOptions(options);
  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    nextCursor: cursor ? generateNextCursor(cursor) : undefined,
    previousCursor: cursor ? generatePreviousCursor(cursor) : undefined,
  };
}
