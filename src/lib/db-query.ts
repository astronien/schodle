/**
 * Database query helper that routes all operations through the db-query Edge Function.
 * Falls back to direct Supabase queries if the Edge Function is unavailable
 * (e.g., CORS issues, function not deployed, network errors).
 *
 * Direct queries use the user's own JWT and rely on RLS policies for access control.
 */

import { supabase } from './supabase';
import { getSessionToken } from './session';

/**
 * Pull the server's actual message out of a supabase-js FunctionsHttpError.
 *
 * supabase-js collapses every non-2xx response into the same string ("Edge
 * Function returned a non-2xx status code") and stashes the real Response on
 * `error.context`. Reading it turns an undebuggable generic failure into the
 * concrete reason (missing column, rejected query, forbidden write…).
 */
async function readEdgeFunctionError(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: Response }).context;
  if (!ctx || typeof ctx.json !== 'function') return null;
  try {
    const parsed = (await ctx.clone().json()) as { error?: string };
    return parsed?.error ?? null;
  } catch {
    // Not JSON — fall back to the raw text, which is still more useful than
    // the generic message.
    try {
      const text = await ctx.clone().text();
      return text ? text.slice(0, 300) : null;
    } catch {
      return null;
    }
  }
}

interface FilterCondition {
  eq?: unknown;
  gte?: unknown;
  lte?: unknown;
  lt?: unknown;
  gt?: unknown;
  neq?: unknown;
  in?: unknown[];
}

/** Inclusive, zero-based row range (mirrors PostgREST's `Range` header). */
export interface QueryRange {
  from: number;
  to: number;
}

/**
 * Sort key(s). A list applies them in order — paginated reads need a total
 * order (e.g. `date` then `id`), otherwise rows that tie can move between
 * pages and get duplicated or skipped.
 */
export type OrderSpec = { column: string; ascending?: boolean };

interface QueryOptions {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  data?: unknown;
  filter?: Record<string, unknown | FilterCondition>;
  select?: string;
  order?: OrderSpec | OrderSpec[];
  range?: QueryRange;
  /**
   * Conflict target for UPSERT, e.g. `'employee_id,date'`. Without it PostgREST
   * resolves conflicts on the PRIMARY KEY only, so a row carrying a fresh id
   * for an already-taken (employee_id, date) pair raises a 23505 unique
   * violation instead of updating the existing row.
   */
  onConflict?: string;
}

/** A single Postgres identifier — no quotes, no whitespace, no punctuation. */
const COLUMN_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_CONFLICT_COLUMNS = 10;
/** Rows fetched per page by {@link fetchAllPages} — PostgREST's usual cap. */
export const DB_PAGE_SIZE = 1000;
/** Hard ceiling on a single range request, so a bad range can't ask for the world. */
const MAX_RANGE_SIZE = 100000;
/** Safety valve: stop paginating rather than loop forever on a misbehaving API. */
const MAX_PAGES = 200;

/**
 * Validate an `onConflict` value and return it normalised (`"a, b"` → `"a,b"`),
 * or null when it is anything other than a simple comma-separated column list.
 * The value ends up in a PostgREST query string, so it is never passed through
 * unchecked.
 */
export function normalizeOnConflict(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length === 0 || parts.length > MAX_CONFLICT_COLUMNS) return null;
  for (const part of parts) {
    if (part.length === 0 || part.length > 63 || !COLUMN_NAME_PATTERN.test(part)) return null;
  }
  return parts.join(',');
}

/** Validate a row range; returns null when it is not a sane, finite window. */
export function normalizeRange(value: unknown): QueryRange | null {
  if (!value || typeof value !== 'object') return null;
  const { from, to } = value as { from?: unknown; to?: unknown };
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
  const f = from as number;
  const t = to as number;
  if (f < 0 || t < f) return null;
  if (t - f + 1 > MAX_RANGE_SIZE) return null;
  return { from: f, to: t };
}

/**
 * Does this failure look like an old db-query rejecting a multi-key sort?
 *
 * The pre-pagination function did `query.order(order.column)`, so an array
 * yields `undefined` and Postgres answers "column <table>.undefined does not
 * exist". Matched narrowly — only a select that actually sent an array — so a
 * genuinely missing column still surfaces as an error.
 */
export function isLegacyOrderRejection(message: string, options: QueryOptions): boolean {
  if (options.operation !== 'select') return false;
  if (!Array.isArray(options.order) || options.order.length < 2) return false;
  return /column\s+\S*\.?undefined\s+does not exist/i.test(message);
}

/**
 * Execute a database query — try Edge Function first, fall back to direct Supabase.
 * Falls back on ANY error from the Edge Function (CORS, 401, 500, network, etc.)
 * so the app works even if the function isn't deployed or configured correctly.
 */
export async function dbQuery<T = unknown>(options: QueryOptions): Promise<{ data: T | null; error: Error | null }> {
  const token = getSessionToken();
  if (!token) {
    return { data: null, error: new Error('Session expired') };
  }

  // Validate here as well as in the Edge Function so both paths (function and
  // direct fallback) reject the same inputs, and reject them before any I/O.
  let safeOptions = options;
  if (options.onConflict !== undefined) {
    const onConflict = normalizeOnConflict(options.onConflict);
    if (!onConflict) {
      return { data: null, error: new Error(`Invalid onConflict: ${String(options.onConflict)}`) };
    }
    safeOptions = { ...safeOptions, onConflict };
  }
  if (options.range !== undefined) {
    const range = normalizeRange(options.range);
    if (!range) {
      return { data: null, error: new Error(`Invalid range: ${JSON.stringify(options.range)}`) };
    }
    safeOptions = { ...safeOptions, range };
  }

  try {
    // Try Edge Function
    const { data, error } = await supabase.functions.invoke<{ data: T }>('db-query', {
      body: safeOptions,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      // Only fall back on transport-level failures (function unreachable /
      // not deployed). An explicit HTTP error (401, 403, 500) is a real
      // answer — falling back would silently bypass authorization.
      const name = (error as Error).name || '';
      if (name === 'FunctionsFetchError' || name === 'FunctionsRelayError') {
        console.warn(`[db-query] Edge Function unreachable, falling back: ${error.message}`);
        return fallbackQuery<T>(safeOptions);
      }
      // supabase-js reports every HTTP error as the same opaque string
      // ("Edge Function returned a non-2xx status code") and hides the real
      // reason in error.context. Surface the server's message instead —
      // without this, a missing column or a rejected query is undebuggable.
      const serverMsg = await readEdgeFunctionError(error);
      const detail = serverMsg ?? error.message ?? 'Edge Function error';
      console.error(
        `[db-query] ${safeOptions.operation} on "${safeOptions.table}" failed: ${detail}`,
      );

      // Compatibility shim for a db-query deployment that predates multi-key
      // ordering. The old function read `order.column` straight off the value,
      // so an array arrives as `undefined` and Postgres reports the missing
      // column below. Retry with a single sort key so the app keeps working,
      // and say plainly what needs deploying — silently degrading here would
      // just hide the version skew that caused this.
      if (isLegacyOrderRejection(detail, safeOptions)) {
        const [firstSpec] = safeOptions.order as OrderSpec[];
        console.warn(
          `[db-query] the deployed db-query function does not support multi-key ordering — ` +
            `retrying "${safeOptions.table}" sorted by "${firstSpec.column}" only. ` +
            `Run "npm run deploy:functions" to deploy the current version.`,
        );
        return dbQuery<T>({ ...safeOptions, order: firstSpec });
      }

      return { data: null, error: new Error(detail) };
    }

    return { data: data?.data ?? null, error: null };
  } catch (catchErr) {
    // Network error, CORS, function not found, etc. — fall back
    const msg = catchErr instanceof Error ? catchErr.message : 'Unknown error';
    console.warn(`[db-query] Edge Function unavailable (${msg}), falling back to direct query`);
    return fallbackQuery<T>(safeOptions);
  }
}

/**
 * Fallback: execute query directly using the Supabase client (user's JWT, RLS applies).
 */
/* eslint-disable @typescript-eslint/no-explicit-any --
   Supabase's query-builder generics change type on every chained call;
   typing them here adds noise without real safety. */
async function fallbackQuery<T>(options: QueryOptions): Promise<{ data: T | null; error: Error | null }> {
  const { table, operation, data, filter, select, order, range, onConflict } = options;

  // dbQuery normalises these before we get here; re-check so a direct caller
  // can't slip an unvalidated conflict target / range into the query string.
  const safeConflict = onConflict === undefined ? undefined : normalizeOnConflict(onConflict);
  if (onConflict !== undefined && !safeConflict) {
    return { data: null, error: new Error(`Invalid onConflict: ${String(onConflict)}`) };
  }
  const safeRange = range === undefined ? undefined : normalizeRange(range);
  if (range !== undefined && !safeRange) {
    return { data: null, error: new Error(`Invalid range: ${JSON.stringify(range)}`) };
  }

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
        for (const spec of order ? (Array.isArray(order) ? order : [order]) : []) {
          query = query.order(spec.column, { ascending: spec.ascending ?? true });
        }
        if (safeRange) {
          query = query.range(safeRange.from, safeRange.to);
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
        query = supabase
          .from(table)
          .upsert(data as Record<string, unknown>, safeConflict ? { onConflict: safeConflict } : undefined);
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
  order?: OrderSpec | OrderSpec[],
  range?: QueryRange
): Promise<{ data: T[] | null; error: Error | null }> {
  return dbQuery<T[]>({ table, operation: 'select', filter, select, order, range });
}

/**
 * Run a paged reader until it returns a short page, concatenating the results.
 *
 * PostgREST caps the rows a single request may return (1000 by default), and it
 * does so silently: an over-large SELECT looks like a complete, successful
 * answer. Callers that need the whole set must ask for explicit ranges instead
 * of assuming one request is enough.
 *
 * @param fetchPage reader for one inclusive, zero-based range
 * @returns every row, or the first error encountered
 */
export async function fetchAllPages<T>(
  fetchPage: (range: QueryRange) => Promise<{ data: T[] | null; error: Error | null }>,
  options?: { pageSize?: number; label?: string },
): Promise<{ data: T[] | null; error: Error | null }> {
  const pageSize = options?.pageSize ?? DB_PAGE_SIZE;
  const label = options?.label ?? 'query';
  const all: T[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * pageSize;
    const { data, error } = await fetchPage({ from, to: from + pageSize - 1 });
    if (error) return { data: null, error };

    const rows = data ?? [];
    all.push(...rows);

    // A short page means we reached the end. A full page means the server hit
    // its row cap — say so out loud, because this is exactly the silent
    // truncation that used to leave later dates missing from the client.
    if (rows.length < pageSize) return { data: all, error: null };
    console.warn(
      `[db-query] "${label}" page ${page + 1} came back exactly at the ${pageSize}-row cap — fetching the next page (${all.length} rows so far)`,
    );
  }

  console.warn(
    `[db-query] "${label}" hit the ${MAX_PAGES}-page limit (${all.length} rows); results may be incomplete`,
  );
  return { data: all, error: null };
}

/**
 * SELECT every matching row, paging through PostgREST's row cap.
 * Use instead of {@link dbSelect} whenever a partial result would be wrong.
 */
export async function dbSelectAll<T = unknown>(
  table: string,
  filter?: Record<string, unknown | FilterCondition>,
  select?: string,
  order?: OrderSpec | OrderSpec[],
  pageSize: number = DB_PAGE_SIZE,
): Promise<{ data: T[] | null; error: Error | null }> {
  return fetchAllPages<T>((range) => dbSelect<T>(table, filter, select, order, range), {
    pageSize,
    label: table,
  });
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
 * Convenience function for UPSERT operations.
 *
 * Pass `onConflict` whenever the table has a unique constraint other than the
 * primary key that the rows may collide on — e.g. `schedules` is unique on
 * (employee_id, date), so without it a row carrying a newly generated id for an
 * existing employee/date fails with a 23505 unique violation (surfacing as a
 * 500 from the db-query Edge Function) instead of updating that row.
 */
export async function dbUpsert<T = unknown>(
  table: string,
  data: unknown,
  options?: { onConflict?: string }
): Promise<{ data: T | null; error: Error | null }> {
  return dbQuery<T>({ table, operation: 'upsert', data, onConflict: options?.onConflict });
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
