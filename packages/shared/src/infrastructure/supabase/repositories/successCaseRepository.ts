/**
 * Success Case Repository - Supabase Implementation
 * 成功事例リポジトリのSupabase実装
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';
import type { SuccessCaseRepository, QueryOptions } from '../../../domain/repositories';
import type { SuccessCase } from '../../../domain/entities';
import {
  createSuccessCaseId,
  createSalonId,
  createSessionId,
  type SuccessCaseId,
  type SalonId,
  type Embedding,
} from '../../../domain/valueObjects';

type SuccessCaseRow = Database['public']['Tables']['success_cases']['Row'];
type SuccessCaseInsert = Database['public']['Tables']['success_cases']['Insert'];

/**
 * Row to Entity mapper
 */
function toEntity(row: SuccessCaseRow): SuccessCase {
  return {
    id: createSuccessCaseId(row.id),
    salonId: createSalonId(row.salon_id),
    sessionId: row.session_id ? createSessionId(row.session_id) : null,
    concernKeywords: row.concern_keywords,
    approachText: row.approach_text,
    result: row.result,
    conversionRate: row.conversion_rate,
    embedding: row.embedding,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function createSuccessCaseRepository(
  supabase: SupabaseClient<Database>
): SuccessCaseRepository {
  return {
    async findById(id: SuccessCaseId): Promise<SuccessCase | null> {
      const { data, error } = await supabase
        .from('success_cases')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return toEntity(data);
    },

    async findBySalonId(
      salonId: SalonId,
      options?: QueryOptions
    ): Promise<SuccessCase[]> {
      let query = supabase
        .from('success_cases')
        .select('*')
        .eq('salon_id', salonId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

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

    async findPublic(options?: QueryOptions): Promise<SuccessCase[]> {
      let query = supabase
        .from('success_cases')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

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

    async searchByEmbedding(
      embedding: Embedding,
      options: {
        salonId?: SalonId;
        includePublic?: boolean;
        limit?: number;
        threshold?: number;
      }
    ): Promise<Array<SuccessCase & { similarity: number }>> {
      // Use type assertion for RPC call parameters
      const { data, error } = await supabase.rpc('search_success_cases', {
        query_embedding: embedding,
        match_threshold: options.threshold ?? 0.7,
        match_count: options.limit ?? 5,
        salon_id: options.salonId ?? null,
      } as unknown as undefined);

      if (error || !data) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any[]).map((row: any) => ({
        id: createSuccessCaseId(row.id),
        salonId: createSalonId(''),
        sessionId: null,
        concernKeywords: row.concern_keywords,
        approachText: row.approach_text,
        result: row.result,
        conversionRate: null,
        embedding: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        similarity: row.similarity,
      }));
    },

    async searchByKeywords(
      keywords: string[],
      options: {
        salonId?: SalonId;
        includePublic?: boolean;
        limit?: number;
      }
    ): Promise<SuccessCase[]> {
      let query = supabase
        .from('success_cases')
        .select('*')
        .eq('is_active', true)
        .overlaps('concern_keywords', keywords)
        .order('created_at', { ascending: false });

      if (options.salonId) {
        query = query.eq('salon_id', options.salonId);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error || !data) return [];
      return data.map(toEntity);
    },

    async create(
      data: Omit<SuccessCase, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<SuccessCase> {
      const insertData: SuccessCaseInsert = {
        salon_id: data.salonId,
        session_id: data.sessionId,
        concern_keywords: data.concernKeywords,
        approach_text: data.approachText,
        result: data.result,
        conversion_rate: data.conversionRate,
        embedding: data.embedding,
        is_active: data.isActive,
      };

      // Use type assertion due to Supabase type inference limitations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any)
        .from('success_cases')
        .insert(insertData)
        .select()
        .single();

      if (error || !result) {
        throw new Error(`Failed to create success case: ${error?.message}`);
      }

      return toEntity(result as SuccessCaseRow);
    },

    async updateEmbedding(
      id: SuccessCaseId,
      embedding: Embedding
    ): Promise<SuccessCase> {
      // Use type assertion due to Supabase type inference limitations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any)
        .from('success_cases')
        .update({ embedding })
        .eq('id', id)
        .select()
        .single();

      if (error || !result) {
        throw new Error(`Failed to update embedding: ${error?.message}`);
      }

      return toEntity(result as SuccessCaseRow);
    },

    async delete(id: SuccessCaseId): Promise<void> {
      // Use type assertion due to Supabase type inference limitations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('success_cases')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete success case: ${error.message}`);
      }
    },
  };
}
