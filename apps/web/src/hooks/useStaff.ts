'use client';

/**
 * useStaff Hook
 * スタッフ管理フック
 */
import { useState, useCallback } from 'react';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'stylist' | 'manager' | 'receptionist';
  avatarUrl?: string;
  averageScore: number;
  sessionCount: number;
  conversionRate: number;
  status: 'active' | 'inactive';
  joinedAt: Date;
  salonId: string;
}

interface StaffFilters {
  role?: 'stylist' | 'manager' | 'receptionist';
  status?: 'active' | 'inactive';
  search?: string;
}

interface UseStaffReturn {
  staff: StaffMember[];
  loading: boolean;
  error: string | null;
  fetchStaff: (filters?: StaffFilters) => Promise<void>;
  getStaffById: (id: string) => Promise<StaffMember | null>;
  createStaff: (data: Omit<StaffMember, 'id' | 'averageScore' | 'sessionCount' | 'conversionRate' | 'joinedAt'>) => Promise<StaffMember>;
  updateStaff: (id: string, data: Partial<StaffMember>) => Promise<StaffMember>;
  deleteStaff: (id: string) => Promise<void>;
}

export function useStaff(): UseStaffReturn {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async (filters?: StaffFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.role) params.append('role', filters.role);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);

      const response = await fetch(`/api/staff?${params.toString()}`);
      if (!response.ok) {
        throw new Error('スタッフの取得に失敗しました');
      }

      const data = await response.json();
      setStaff(data.map((s: StaffMember) => ({
        ...s,
        joinedAt: new Date(s.joinedAt),
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const getStaffById = useCallback(async (id: string): Promise<StaffMember | null> => {
    try {
      const response = await fetch(`/api/staff/${id}`);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        ...data,
        joinedAt: new Date(data.joinedAt),
      };
    } catch {
      return null;
    }
  }, []);

  const createStaff = useCallback(async (
    data: Omit<StaffMember, 'id' | 'averageScore' | 'sessionCount' | 'conversionRate' | 'joinedAt'>
  ): Promise<StaffMember> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('スタッフの登録に失敗しました');
      }

      const newStaff = await response.json();
      const staffWithDate = {
        ...newStaff,
        joinedAt: new Date(newStaff.joinedAt),
      };
      setStaff((prev) => [...prev, staffWithDate]);
      return staffWithDate;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'エラーが発生しました';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStaff = useCallback(async (id: string, data: Partial<StaffMember>): Promise<StaffMember> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('スタッフの更新に失敗しました');
      }

      const updatedStaff = await response.json();
      const staffWithDate = {
        ...updatedStaff,
        joinedAt: new Date(updatedStaff.joinedAt),
      };
      setStaff((prev) =>
        prev.map((s) => (s.id === id ? staffWithDate : s))
      );
      return staffWithDate;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'エラーが発生しました';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteStaff = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('スタッフの削除に失敗しました');
      }

      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'エラーが発生しました';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    staff,
    loading,
    error,
    fetchStaff,
    getStaffById,
    createStaff,
    updateStaff,
    deleteStaff,
  };
}

export default useStaff;
