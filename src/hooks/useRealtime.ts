import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface ActiveEditor {
  id: string;
  name: string;
  role: string;
  onlineAt: string;
}

interface UseRealtimeOptions {
  employeeId: string;
  fullName: string;
  role: string;
}

type TableName = 'schedules' | 'employees' | 'shift_types' | 'positions' | 'position_groups' | 'recurring_schedules' | 'settings' | 'schedule_confirmations';

type ChangeHandler = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

export function useRealtime({ employeeId, fullName, role }: UseRealtimeOptions) {
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([]);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  const handlersRef = useRef<Map<TableName, Set<ChangeHandler>>>(new Map());
  const trackRef = useRef(false);

  const onTableChange = useCallback((table: TableName, handler: ChangeHandler) => {
    if (!handlersRef.current.has(table)) {
      handlersRef.current.set(table, new Set());
    }
    handlersRef.current.get(table)!.add(handler);
    return () => {
      handlersRef.current.get(table)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (!employeeId || trackRef.current) return;
    trackRef.current = true;

    const TABLES: TableName[] = [
      'schedules', 'employees', 'shift_types',
      'positions', 'position_groups', 'recurring_schedules',
      'settings', 'schedule_confirmations',
    ];

    const dbChannel = supabase.channel('db-changes');

    for (const table of TABLES) {
      dbChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          setSyncedAt(new Date());
          const handlers = handlersRef.current.get(table);
          if (handlers) {
            for (const handler of handlers) {
              handler(payload);
            }
          }
        },
      );
    }
    dbChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsLive(true);
        setSyncedAt(new Date());
      } else {
        setIsLive(false);
      }
    });

    const presenceChannel = supabase.channel('online', {
      config: { presence: { key: employeeId } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const editors: ActiveEditor[] = [];
        for (const [, presences] of Object.entries(state)) {
          for (const p of (presences as Array<Record<string, unknown>>)) {
            const user = p.user as ActiveEditor | undefined;
            if (user && user.id !== employeeId) {
              editors.push(user);
            }
          }
        }
        setActiveEditors(editors);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key !== employeeId) {
          setSyncedAt(new Date());
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== employeeId) {
          setSyncedAt(new Date());
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user: {
              id: employeeId,
              name: fullName,
              role,
              onlineAt: new Date().toISOString(),
            },
          });
        }
      });

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(presenceChannel);
      trackRef.current = false;
    };
  }, [employeeId, fullName, role]);

  const otherEditors = activeEditors.filter((e) => e.id !== employeeId);

  return {
    activeEditors: otherEditors,
    syncedAt,
    isLive,
    onTableChange,
  };
}
