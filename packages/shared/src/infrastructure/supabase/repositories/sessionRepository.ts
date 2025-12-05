/**
 * Session Repository - Supabase Implementation
 * セッションリポジトリのSupabase実装
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';
import type {
  SessionRepository,
  QueryOptions,
  DateRangeOptions,
} from '../../../domain/repositories';
// TODO: 将来的にはDB型を直接返すように変更し、このインポートを削除する
import type { Session } from '../../../domain/entities/_conceptual-model-DO-NOT-IMPORT';
import {
  createSessionId,
  createSalonId,
  createStaffId,
  type SessionId,
  type SalonId,
  type StaffId,
  type SessionStatus,
  type CustomerInfo,
} from '../../../domain/valueObjects';

type SessionRow = Database['public']['Tables']['sessions']['Row'];
type SessionInsert = Database['public']['Tables']['sessions']['Insert'];

/**
 * Row to Entity mapper
 */
function toEntity(row: SessionRow): Session {
  return {
    id: createSessionId(row.id),
    salonId: createSalonId(row.salon_id),
    stylistId: createStaffId(row.stylist_id),
    status: row.status,
    customerInfo: row.customer_info as CustomerInfo | null,
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    totalDurationMs: row.total_duration_ms,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function createSessionRepository(
  supabase: SupabaseClient<Database>
): SessionRepository {
  return {
    async findById(id: SessionId): Promise<Session | null> {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return toEntity(data);
    },

    async findByStylistId(
      stylistId: StaffId,
      options?: QueryOptions & DateRangeOptions & { status?: SessionStatus }
    ): Promise<Session[]> {
      let query = supabase
        .from('sessions')
        .select('*')
        .eq('stylist_id', stylistId)
        .order('started_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.startDate) {
        query = query.gte('started_at', options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte('started_at', options.endDate.toISOString());
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;
      if (error || !data) return [];
      return data.map(toEntity);
    },

    async findBySalonId(
      salonId: SalonId,
      options?: QueryOptions & DateRangeOptions & { status?: SessionStatus }
    ): Promise<Session[]> {
      let query = supabase
        .from('sessions')
        .select('*')
        .eq('salon_id', salonId)
        .order('started_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.startDate) {
        query = query.gte('started_at', options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte('started_at', options.endDate.toISOString());
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;
      if (error || !data) return [];
      return data.map(toEntity);
    },

    async findActiveByStylistId(stylistId: StaffId): Promise<Session | null> {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('stylist_id', stylistId)
        .in('status', ['recording', 'processing', 'analyzing'])
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;
      return toEntity(data);
    },

    async create(
      data: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<Session> {
      const insertData: SessionInsert = {
        salon_id: data.salonId,
        stylist_id: data.stylistId,
        status: data.status,
        customer_info: data.customerInfo as Record<string, unknown> | null,
        started_at: data.startedAt.toISOString(),
        ended_at: data.endedAt?.toISOString() ?? null,
        total_duration_ms: data.totalDurationMs,
      };

      // Use type assertion due to Supabase type inference limitations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any)
        .from('sessions')
        .insert(insertData)
        .select()
        .single();

      if (error || !result) {
        throw new Error(`Failed to create session: ${error?.message}`);
      }

      return toEntity(result as SessionRow);
    },

    async update(
      id: SessionId,
      data: Partial<Omit<Session, 'id' | 'createdAt' | 'updatedAt'>>
    ): Promise<Session> {
      const updateData: Partial<Database['public']['Tables']['sessions']['Update']> = {};

      if (data.salonId !== undefined) updateData.salon_id = data.salonId;
      if (data.stylistId !== undefined) updateData.stylist_id = data.stylistId;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.customerInfo !== undefined)
        updateData.customer_info = data.customerInfo as unknown as Record<string, unknown>;
      if (data.endedAt !== undefined)
        updateData.ended_at = data.endedAt?.toISOString() ?? null;
      if (data.totalDurationMs !== undefined)
        updateData.total_duration_ms = data.totalDurationMs;

      // Use type assertion due to Supabase type inference limitations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any)
        .from('sessions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error || !result) {
        throw new Error(`Failed to update session: ${error?.message}`);
      }

      return toEntity(result);
    },

    async countBySalonId(
      salonId: SalonId,
      options?: DateRangeOptions
    ): Promise<number> {
      let query = supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('salon_id', salonId);

      if (options?.startDate) {
        query = query.gte('started_at', options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte('started_at', options.endDate.toISOString());
      }

      const { count, error } = await query;
      if (error) return 0;
      return count ?? 0;
    },
  };
}
