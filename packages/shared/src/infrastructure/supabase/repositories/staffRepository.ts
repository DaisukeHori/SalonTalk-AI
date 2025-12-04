/**
 * Staff Repository - Supabase Implementation
 * スタッフリポジトリのSupabase実装
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';
import type { StaffRepository, QueryOptions } from '../../../domain/repositories';
import type { Staff } from '../../../domain/entities';
import {
  createStaffId,
  createSalonId,
  type StaffId,
  type SalonId,
  type StaffRole,
} from '../../../domain/valueObjects';

type StaffRow = Database['public']['Tables']['staffs']['Row'];
type StaffInsert = Database['public']['Tables']['staffs']['Insert'];

/**
 * Row to Entity mapper
 */
function toEntity(row: StaffRow): Staff {
  return {
    id: createStaffId(row.id),
    salonId: createSalonId(row.salon_id),
    email: row.email,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function createStaffRepository(
  supabase: SupabaseClient<Database>
): StaffRepository {
  return {
    async findById(id: StaffId): Promise<Staff | null> {
      const { data, error } = await supabase
        .from('staffs')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return toEntity(data);
    },

    async findByAuthUserId(authUserId: string): Promise<Staff | null> {
      const { data, error } = await supabase
        .from('staffs')
        .select('*')
        .eq('id', authUserId)
        .single();

      if (error || !data) return null;
      return toEntity(data);
    },

    async findBySalonId(
      salonId: SalonId,
      options?: QueryOptions
    ): Promise<Staff[]> {
      let query = supabase
        .from('staffs')
        .select('*')
        .eq('salon_id', salonId)
        .order('name');

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

    async findActiveByRole(salonId: SalonId, role: StaffRole): Promise<Staff[]> {
      const { data, error } = await supabase
        .from('staffs')
        .select('*')
        .eq('salon_id', salonId)
        .eq('role', role)
        .eq('is_active', true)
        .order('name');

      if (error || !data) return [];
      return data.map(toEntity);
    },

    async create(
      data: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<Staff> {
      const insertData: StaffInsert = {
        id: data.id as string,
        salon_id: data.salonId,
        email: data.email,
        name: data.name,
        role: data.role,
        avatar_url: data.avatarUrl,
        is_active: data.isActive,
      };

      const { data: result, error } = await supabase
        .from('staffs')
        .insert(insertData)
        .select()
        .single();

      if (error || !result) {
        throw new Error(`Failed to create staff: ${error?.message}`);
      }

      return toEntity(result);
    },

    async update(
      id: StaffId,
      data: Partial<Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>>
    ): Promise<Staff> {
      const updateData: Database['public']['Tables']['staffs']['Update'] = {};

      if (data.salonId !== undefined) updateData.salon_id = data.salonId;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { data: result, error } = await supabase
        .from('staffs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error || !result) {
        throw new Error(`Failed to update staff: ${error?.message}`);
      }

      return toEntity(result);
    },

    async delete(id: StaffId): Promise<void> {
      const { error } = await supabase
        .from('staffs')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete staff: ${error.message}`);
      }
    },

    async countBySalonId(salonId: SalonId): Promise<number> {
      const { count, error } = await supabase
        .from('staffs')
        .select('id', { count: 'exact', head: true })
        .eq('salon_id', salonId);

      if (error) return 0;
      return count ?? 0;
    },
  };
}
