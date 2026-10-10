import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { ColorValue } from 'react-native';

import { useAuth } from '@/lib/auth';
import { tabScreenOptions } from '@/lib/nav';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={icon} size={size} color={color as string} />,
});

export default function EmployeeTabs() {
  const { session } = useAuth();
  if (session.status !== 'employee') return null;
  return (
    <Tabs
      screenOptions={tabScreenOptions}
    >
      <Tabs.Screen name="index" options={tab('الرئيسية', 'home-outline')} />
      <Tabs.Screen name="services" options={tab('الخدمات', 'apps-outline')} />
      <Tabs.Screen name="requests" options={tab('طلباتي', 'document-text-outline')} />
      <Tabs.Screen name="account" options={tab('حسابي', 'person-outline')} />
    </Tabs>
  );
}
