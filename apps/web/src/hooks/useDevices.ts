'use client';

/**
 * useDevices Hook
 * デバイス管理フック - Edge Functions経由でデバイスを管理
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface Device {
  id: string;
  salon_id: string;
  device_name: string;
  device_identifier: string | null;
  seat_number: number | null;
  status: 'pending' | 'active' | 'inactive' | 'revoked';
  activated_at: string | null;
  activated_by: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  // Computed properties
  is_online?: boolean;
  current_session?: {
    id: string;
    stylist_name: string;
    started_at: string;
  } | null;
}

export interface ActivationCode {
  id: string;
  device_id: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  created_by: string;
}

export interface SalonInfo {
  seats_count: number;
  active_device_count: number;
}

interface UseDevicesReturn {
  devices: Device[];
  salonInfo: SalonInfo | null;
  isLoading: boolean;
  error: string | null;
  registerDevice: (params: { device_name: string; seat_number?: number }) => Promise<{ device: Device; activation_code: ActivationCode }>;
  generateActivationCode: (deviceId: string) => Promise<ActivationCode>;
  updateDevice: (params: { device_id: string; device_name?: string; seat_number?: number | null; status?: string }) => Promise<Device>;
  revokeDevice: (deviceId: string, reason?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds

export function useDevices(): UseDevicesReturn {
  const [devices, setDevices] = useState<Device[]>([]);
  const [salonInfo, setSalonInfo] = useState<SalonInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();

      // Get current user's salon
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('ログインが必要です');
        setIsLoading(false);
        return;
      }

      const { data: currentStaff, error: staffError } = await supabase
        .from('staffs')
        .select('salon_id')
        .eq('id', user.id)
        .single<{ salon_id: string }>();

      if (staffError || !currentStaff) {
        setError('店舗情報の取得に失敗しました');
        setIsLoading(false);
        return;
      }

      const salonId = currentStaff.salon_id;

      // Fetch salon info for seats_count
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('seats_count')
        .eq('id', salonId)
        .single<{ seats_count: number | null }>();

      if (salonError) {
        console.error('Salon fetch error:', salonError);
      }

      // Fetch devices
      const devicesResult = await supabase
        .from('devices')
        .select('*')
        .eq('salon_id', salonId)
        .order('created_at', { ascending: true });

      if (devicesResult.error) {
        setError('デバイスの取得に失敗しました');
        setIsLoading(false);
        return;
      }

      const deviceList = devicesResult.data as Device[] | null;

      const now = Date.now();
      const activeDeviceCount = (deviceList || []).filter((d) => d.status === 'active').length;

      // Add computed properties
      const devicesWithStatus = (deviceList || []).map((device: Device) => {
        const lastActive = device.last_active_at ? new Date(device.last_active_at).getTime() : 0;
        const is_online = device.status === 'active' && (now - lastActive) < ONLINE_THRESHOLD_MS;

        return {
          ...device,
          is_online,
        };
      });

      // Fetch current sessions for online devices
      const onlineDeviceIds = devicesWithStatus
        .filter(d => d.is_online)
        .map(d => d.id);

      if (onlineDeviceIds.length > 0) {
        const { data: sessions } = await supabase
          .from('sessions')
          .select(`
            id,
            device_id,
            started_at,
            staffs!sessions_stylist_id_fkey (
              name
            )
          `)
          .in('device_id', onlineDeviceIds)
          .in('status', ['recording', 'processing', 'analyzing']);

        if (sessions) {
          const sessionMap = new Map(sessions.map((s: any) => [
            s.device_id,
            {
              id: s.id,
              stylist_name: s.staffs?.name || '不明',
              started_at: s.started_at,
            }
          ]));

          devicesWithStatus.forEach(device => {
            device.current_session = sessionMap.get(device.id) || null;
          });
        }
      }

      setDevices(devicesWithStatus);
      setSalonInfo({
        seats_count: salon?.seats_count || 0,
        active_device_count: activeDeviceCount,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchDevices();

    // Auto refresh every 30 seconds for online status
    intervalRef.current = setInterval(fetchDevices, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchDevices]);

  const registerDevice = useCallback(async (params: { device_name: string; seat_number?: number }) => {
    const supabase = getSupabaseBrowserClient();
    const session = await supabase.auth.getSession();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-device`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify(params),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'デバイスの登録に失敗しました');
    }

    await fetchDevices();
    return result;
  }, [fetchDevices]);

  const generateActivationCode = useCallback(async (deviceId: string) => {
    const supabase = getSupabaseBrowserClient();
    const session = await supabase.auth.getSession();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-activation-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({ device_id: deviceId }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'アクティベーションコードの生成に失敗しました');
    }

    return result;
  }, []);

  const updateDevice = useCallback(async (params: {
    device_id: string;
    device_name?: string;
    seat_number?: number | null;
    status?: string;
  }) => {
    const supabase = getSupabaseBrowserClient();
    const session = await supabase.auth.getSession();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-device`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify(params),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.message || 'デバイスの更新に失敗しました');
    }

    await fetchDevices();
    return result.device;
  }, [fetchDevices]);

  const revokeDevice = useCallback(async (deviceId: string, reason?: string) => {
    const supabase = getSupabaseBrowserClient();
    const session = await supabase.auth.getSession();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/revoke-device`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({ device_id: deviceId, reason }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.message || 'デバイスの失効に失敗しました');
    }

    await fetchDevices();
  }, [fetchDevices]);

  return {
    devices,
    salonInfo,
    isLoading,
    error,
    registerDevice,
    generateActivationCode,
    updateDevice,
    revokeDevice,
    refresh: fetchDevices,
  };
}

export default useDevices;
