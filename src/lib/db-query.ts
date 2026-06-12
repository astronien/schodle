/**
 * Database query helper that routes all operations through the db-query Edge Function
 * This ensures all queries go through session verification and service role
 */

import { supabase } from './supabase';
import { getSessionToken } from './session';

interface FilterCondition {
  eq?: unknown;
  gte?: unknown;
  lte?: unknown;
  lt?: unknown;
  gt?: unknown;
  neq?: unknown;
  in?: unknown[];
}

interface QueryOptions {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  data?: unknown;
  filter?: Record<string, unknown | FilterCondition>;
  select?: string;
  order?: { column: string; ascending?: boolean };
}

/**
 * Execute a database query through the db-query Edge Function
 */
export async function dbQuery<T = unknown>(options: QueryOptions): Promise<{ data: T | null; error: Error | null }> {
  const token = getSessionToken();
  if (!token) {
    return { data: null, error: new Error('Session expired') };
  }

  try {
    const { data, error } = await supabase.functions.invoke<{ data: T }>('db-query', {
      body: options,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data?.data ?? null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Convenience function for SELECT queries
 */
export async function dbSelect<T = unknown>(
  table: string,
  filter?: Record<string, unknown | FilterCondition>,
  select?: string,
  order?: { column: string; ascending?: boolean }
): Promise<{ data: T[] | null; error: Error | null }> {
  return dbQuery<T[]>({ table, operation: 'select', filter, select, order });
}

/**
 * Convenience function for INSERT operations
 */
export async function dbInsert<T = unknown>(
  table: string,
  data: unknown
): Promise<{ data: T | null; error: Error | null }> {
  return dbQuery<T>({ table, operation: 'insert', data });
}

/**
 * Convenience function for UPDATE operations
 */
export async function dbUpdate<T = unknown>(
  table: string,
  data: unknown,
  filter: Record<string, unknown | FilterCondition>
): Promise<{ data: T | null; error: Error | null }> {
  return dbQuery<T>({ table, operation: 'update', data, filter });
}

/**
 * Convenience function for UPSERT operations
 */
export async function dbUpsert<T = unknown>(
  table: string,
  data: unknown
): Promise<{ data: T | null; error: Error | null }> {
  return dbQuery<T>({ table, operation: 'upsert', data });
}

/**
 * Convenience function for DELETE operations
 */
export async function dbDelete(
  table: string,
  filter: Record<string, unknown | FilterCondition>
): Promise<{ error: Error | null }> {
  const { error } = await dbQuery({ table, operation: 'delete', filter });
  return { error };
}
