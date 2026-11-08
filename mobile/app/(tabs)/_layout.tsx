import React from 'react';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f8fafc',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pitch & Bench',
          tabBarLabel: 'Pitch',
        }}
      />
      <Tabs.Screen
        name="matrix"
        options={{
          title: 'Rotation Matrix',
          tabBarLabel: 'Matrix',
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Squad Roster',
          tabBarLabel: 'Squad',
        }}
      />
      <Tabs.Screen
        name="fixtures"
        options={{
          title: 'Match Fixtures',
          tabBarLabel: 'Fixtures',
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Team Dashboard',
          tabBarLabel: 'Stats',
        }}
      />
    </Tabs>
  );
}

