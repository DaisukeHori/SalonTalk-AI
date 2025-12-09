import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { useDeviceStore } from '@/stores/device';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, initialize: initAuth } = useAuthStore();
  const { is_activated, is_revoked, check_activation, start_heartbeat } = useDeviceStore();
  const [isCheckingDevice, setIsCheckingDevice] = useState(true);

  // Check device activation first
  useEffect(() => {
    const checkDevice = async () => {
      setIsCheckingDevice(true);
      await check_activation();
      setIsCheckingDevice(false);
    };
    checkDevice();
  }, [check_activation]);

  // Initialize auth after device check
  useEffect(() => {
    if (!isCheckingDevice && is_activated && !is_revoked) {
      initAuth();
      // Start heartbeat for activated devices
      start_heartbeat();
    }
  }, [isCheckingDevice, is_activated, is_revoked, initAuth, start_heartbeat]);

  // Route based on device and auth status
  useEffect(() => {
    if (isCheckingDevice) return;

    // Device not activated or revoked -> activation screen
    if (!is_activated || is_revoked) {
      router.replace('/(activation)');
      return;
    }

    // Device activated, check auth
    if (!isAuthLoading) {
      if (isAuthenticated) {
        router.replace('/(main)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isCheckingDevice, is_activated, is_revoked, isAuthLoading, isAuthenticated, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-primary-600 mb-4">SalonTalk AI</Text>
      <ActivityIndicator size="large" color="#0ea5e9" />
      <Text className="text-sm text-gray-500 mt-4">
        {isCheckingDevice ? 'デバイス確認中...' : '読み込み中...'}
      </Text>
    </View>
  );
}
