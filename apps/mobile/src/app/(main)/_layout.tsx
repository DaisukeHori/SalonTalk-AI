import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

// Simple icon component (replace with actual icons later)
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <View className="items-center">
    <Text className={focused ? 'text-primary-600 text-2xl' : 'text-gray-400 text-2xl'}>
      {name === 'home' ? '🏠' : name === 'session' ? '🎙️' : name === 'history' ? '📊' : '⚙️'}
    </Text>
  </View>
);

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 80,
          paddingTop: 10,
          paddingBottom: 20,
        },
        tabBarLabelStyle: {
          fontSize: 14,
        },
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="session"
        options={{
          title: 'セッション',
          tabBarIcon: ({ focused }) => <TabIcon name="session" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '履歴',
          tabBarIcon: ({ focused }) => <TabIcon name="history" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
