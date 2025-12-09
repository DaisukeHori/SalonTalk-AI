/**
 * Activation Layout
 * デバイスアクティベーション画面のレイアウト
 */
import { Stack } from 'expo-router';

export default function ActivationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
