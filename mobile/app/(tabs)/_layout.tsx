import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pitch',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>⚽</Text>,
        }}
      />
      <Tabs.Screen
        name="matrix"
        options={{
          title: 'Matrix',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Squad',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>👟</Text>,
        }}
      />
      <Tabs.Screen
        name="fixtures"
        options={{
          title: 'Fixtures',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>🏆</Text>,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
