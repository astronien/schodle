/**
 * Database query helper that routes all operations through the db-query Edge Function.
 * Falls back to direct Supabase queries if the Edge Function is unavailable
 * (e.g., CORS issues, function not deployed, network errors).
 *
 * Direct queries use the user's own JWT and rely on RLS policies for access control.
 */

import { supabase } from './supabase';
import { getSessionToken } from './session';
import { AUTH_EXPIRED_EVENT } from '../config/constants';

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
 * Execute a database query — try Edge Function first, fall back to direct Supabase.
 * Falls back on ANY error from the Edge Function (CORS, 401, 500, network, etc.)
 * so the app works even if the function isn't deployed or configured correctly.
 */
export async function dbQuery<T = unknown>(options: QueryOptions): Promise<{ data: T | null; error: Error | null }> {
  const token = getSessionToken();
  if (!token) {
    const wasLoggedIn = localStorage.getItem('schodle_auth_employee_id');
    if (wasLoggedIn) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    return { data: null, error: new Error('Session expired') };
  }

  try {
    // Try Edge Function
    const { data, error } = await supabase.functions.invoke<{ data: T }>('db-query', {
      body: options,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      // Edge Function returned an error — fall back
      console.warn(`[db-query] Edge Function error, falling back to direct query: ${error.message}`);
      return fallbackQuery<T>(options);
    }

    return { data: data?.data ?? null, error: null };
  } catch (catchErr) {
    // Network error, CORS, function not found, etc. — fall back
    const msg = catchErr instanceof Error ? catchErr.message : 'Unknown error';
    console.warn(`[db-query] Edge Function unavailable (${msg}), falling back to direct query`);
    return fallbackQuery<T>(options);
  }
}

/**
 * Fallback: execute query directly using the Supabase client (user's JWT, RLS applies).
 */
async function fallbackQuery<T>(options: QueryOptions): Promise<{ data: T | null; error: Error | null }> {
  const { table, operation, data, filter, select, order } = options;

  try {
    let query: any;

    const applyFilters = (q: any, f?: Record<string, unknown | FilterCondition>) => {
      if (!f) return q;
      for (const [key, value] of Object.entries(f)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const condition = value as FilterCondition;
          if (condition.eq !== undefined) q = q.eq(key, condition.eq);
          if (condition.gte !== undefined) q = q.gte(key, condition.gte);
          if (condition.lte !== undefined) q = q.lte(key, condition.lte);
          if (condition.lt !== undefined) q = q.lt(key, condition.lt);
          if (condition.gt !== undefined) q = q.gt(key, condition.gt);
          if (condition.neq !== undefined) q = q.neq(key, condition.neq);
          if (condition.in !== undefined) q = q.in(key, condition.in);
        } else {
          q = q.eq(key, value);
        }
      }
      return q;
    };

    switch (operation) {
      case 'select':
        query = supabase.from(table).select(select || '*');
        query = applyFilters(query, filter);
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        }
        break;

      case 'insert':
        query = supabase.from(table).insert(data as Record<string, unknown>);
        if (Array.isArray(data)) query = query.select();
        break;

      case 'update':
        query = supabase.from(table).update(data as Record<string, unknown>);
        query = applyFilters(query, filter);
        break;

      case 'upsert':
        query = supabase.from(table).upsert(data as Record<string, unknown>);
        break;

      case 'delete':
        query = supabase.from(table).delete();
        query = applyFilters(query, filter);
        break;

      default:
        return { data: null, error: new Error('Invalid operation') };
    }

    const { data: result, error: queryError } = await query;
    if (queryError) {
      return { data: null, error: new Error(queryError.message) };
    }

    return { data: (result as T) ?? null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Fallback query failed') };
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
