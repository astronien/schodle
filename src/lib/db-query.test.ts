import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock('./supabase', () => ({
  supabase: {
    functions: { invoke: invokeMock },
    from: vi.fn(),
  },
}));
vi.mock('./session', () => ({ getSessionToken: () => 'test-token' }));

import {
  DB_PAGE_SIZE,
  dbSelectAll,
  dbUpsert,
  fetchAllPages,
  isLegacyOrderRejection,
  normalizeOnConflict,
  normalizeRange,
  type QueryRange,
} from './db-query';

/** Build a fake pager over `total` rows that records the ranges it was asked for. */
function makePager(total: number, pageSize: number) {
  const calls: QueryRange[] = [];
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const fetchPage = vi.fn(async (range: QueryRange) => {
    calls.push(range);
    expect(range.to - range.from + 1).toBe(pageSize); // ranges are inclusive
    return { data: rows.slice(range.from, range.to + 1), error: null };
  });
  return { calls, rows, fetchPage };
}

describe('normalizeOnConflict', () => {
  it('accepts a simple comma-separated column list', () => {
    expect(normalizeOnConflict('employee_id,date')).toBe('employee_id,date');
    expect(normalizeOnConflict('id')).toBe('id');
    expect(normalizeOnConflict('key')).toBe('key');
  });

  it('trims whitespace around each column', () => {
    expect(normalizeOnConflict(' employee_id , date ')).toBe('employee_id,date');
  });

  it('rejects anything that is not a plain column list', () => {
    const bad = [
      '',
      ' ',
      ',',
      'employee_id,',
      'employee_id,,date',
      'employee_id date',
      '"employee_id"',
      'employee_id) DO NOTHING',
      'employee_id;DROP TABLE schedules',
      'employee_id,date&select=*',
      '1_bad_start',
      'employee_id.date',
      '*',
    ];
    for (const value of bad) {
      expect(normalizeOnConflict(value), value).toBeNull();
    }
  });

  it('rejects non-string values', () => {
    for (const value of [undefined, null, 42, {}, ['employee_id'], true]) {
      expect(normalizeOnConflict(value)).toBeNull();
    }
  });

  it('rejects absurdly long lists and identifiers', () => {
    expect(normalizeOnConflict(Array.from({ length: 11 }, (_, i) => `c${i}`).join(','))).toBeNull();
    expect(normalizeOnConflict('a'.repeat(64))).toBeNull();
    expect(normalizeOnConflict('a'.repeat(63))).toBe('a'.repeat(63));
  });
});

describe('normalizeRange', () => {
  it('accepts a sane inclusive window', () => {
    expect(normalizeRange({ from: 0, to: 999 })).toEqual({ from: 0, to: 999 });
    expect(normalizeRange({ from: 5, to: 5 })).toEqual({ from: 5, to: 5 });
  });

  it('rejects malformed, negative, inverted or oversized windows', () => {
    expect(normalizeRange({ from: -1, to: 10 })).toBeNull();
    expect(normalizeRange({ from: 10, to: 9 })).toBeNull();
    expect(normalizeRange({ from: 0, to: 1.5 })).toBeNull();
    expect(normalizeRange({ from: 0, to: Number.NaN })).toBeNull();
    expect(normalizeRange({ from: 0, to: 100000 })).toBeNull();
    expect(normalizeRange({ from: 0 })).toBeNull();
    expect(normalizeRange('0-999')).toBeNull();
    expect(normalizeRange(null)).toBeNull();
  });
});

describe('fetchAllPages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('walks full pages until a short one ends the run', async () => {
    const { calls, fetchPage } = makePager(7, 3);
    const { data, error } = await fetchAllPages(fetchPage, { pageSize: 3 });

    expect(error).toBeNull();
    expect(data).toHaveLength(7);
    expect(data?.map((r) => r.id)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(calls).toEqual([
      { from: 0, to: 2 },
      { from: 3, to: 5 },
      { from: 6, to: 8 },
    ]);
  });

  it('stops after one request when the first page is already short', async () => {
    const { calls, fetchPage } = makePager(2, 3);
    const { data } = await fetchAllPages(fetchPage, { pageSize: 3 });

    expect(data).toHaveLength(2);
    expect(calls).toEqual([{ from: 0, to: 2 }]);
  });

  it('returns an empty list for an empty result', async () => {
    const { calls, fetchPage } = makePager(0, 3);
    const { data, error } = await fetchAllPages(fetchPage, { pageSize: 3 });

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(calls).toEqual([{ from: 0, to: 2 }]);
  });

  it('asks for one more page when the data is exactly one full page', async () => {
    const { calls, fetchPage } = makePager(3, 3);
    const { data } = await fetchAllPages(fetchPage, { pageSize: 3 });

    // A full page is indistinguishable from a truncated one, so it must probe
    // the next range instead of assuming it has everything.
    expect(data).toHaveLength(3);
    expect(calls).toEqual([
      { from: 0, to: 2 },
      { from: 3, to: 5 },
    ]);
  });

  it('warns when a page comes back exactly at the cap', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fetchPage } = makePager(3, 3);
    await fetchAllPages(fetchPage, { pageSize: 3, label: 'schedules' });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('schedules');
    expect(warn.mock.calls[0][0]).toContain('cap');
  });

  it('does not warn when nothing was truncated', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fetchPage } = makePager(2, 3);
    await fetchAllPages(fetchPage, { pageSize: 3 });

    expect(warn).not.toHaveBeenCalled();
  });

  it('propagates an error and stops paging', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: 0 }, { id: 1 }], error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('boom') });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { data, error } = await fetchAllPages(fetchPage, { pageSize: 2 });

    expect(data).toBeNull();
    expect(error?.message).toBe('boom');
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('treats a null page as the end of the data', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: null, error: null });
    const { data } = await fetchAllPages(fetchPage, { pageSize: 5 });

    expect(data).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('defaults to the PostgREST row cap as its page size', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: [], error: null });
    await fetchAllPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledWith({ from: 0, to: DB_PAGE_SIZE - 1 });
  });
});

describe('dbSelectAll', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('sends explicit ranges to the Edge Function until a short page arrives', async () => {
    invokeMock
      .mockResolvedValueOnce({ data: { data: [{ id: 1 }, { id: 2 }] }, error: null })
      .mockResolvedValueOnce({ data: { data: [{ id: 3 }] }, error: null });

    const order = [
      { column: 'date', ascending: true },
      { column: 'id', ascending: true },
    ];
    const { data, error } = await dbSelectAll('schedules', { date: { gte: '2026-01-01' } }, '*', order, 2);

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(invokeMock.mock.calls[0][1].body).toMatchObject({
      table: 'schedules',
      operation: 'select',
      order,
      range: { from: 0, to: 1 },
    });
    expect(invokeMock.mock.calls[1][1].body.range).toEqual({ from: 2, to: 3 });
  });
});

describe('dbUpsert', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: { data: null }, error: null });
  });

  it('forwards a valid conflict target to the Edge Function', async () => {
    await dbUpsert('schedules', { employee_id: 'e1', date: '2026-10-27' }, { onConflict: 'employee_id,date' });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock.mock.calls[0][1].body.onConflict).toBe('employee_id,date');
  });

  it('omits the conflict target when the caller does not pass one', async () => {
    await dbUpsert('settings', { key: 'app_name', value: 'ShiftFlow' });

    expect(invokeMock.mock.calls[0][1].body.onConflict).toBeUndefined();
  });

  it('refuses an injected conflict target without touching the network', async () => {
    const { data, error } = await dbUpsert('schedules', { id: 'x' }, { onConflict: 'employee_id,date) DO NOTHING --' });

    expect(data).toBeNull();
    expect(error?.message).toContain('Invalid onConflict');
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe('isLegacyOrderRejection', () => {
  const selectWithArrayOrder = {
    table: 'schedules',
    operation: 'select' as const,
    order: [
      { column: 'date', ascending: true },
      { column: 'id', ascending: true },
    ],
  };

  it('recognises the old function rejecting a multi-key sort', () => {
    expect(
      isLegacyOrderRejection('column schedules.undefined does not exist', selectWithArrayOrder),
    ).toBe(true);
  });

  it('ignores a genuinely missing column', () => {
    expect(
      isLegacyOrderRejection('column schedules.boundary_role does not exist', selectWithArrayOrder),
    ).toBe(false);
  });

  it('does not fire when only one sort key was sent', () => {
    expect(
      isLegacyOrderRejection('column schedules.undefined does not exist', {
        table: 'schedules',
        operation: 'select',
        order: { column: 'date', ascending: true },
      }),
    ).toBe(false);
  });

  it('does not fire for non-select operations', () => {
    expect(
      isLegacyOrderRejection('column schedules.undefined does not exist', {
        ...selectWithArrayOrder,
        operation: 'upsert',
      }),
    ).toBe(false);
  });

  it('does not fire on an unrelated error', () => {
    expect(
      isLegacyOrderRejection('permission denied for table schedules', selectWithArrayOrder),
    ).toBe(false);
  });
});
