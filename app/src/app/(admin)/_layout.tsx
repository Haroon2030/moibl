import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { DrawerProvider } from '@/components/admin/Drawer';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function AdminLayout() {
  const { session } = useAuth();
  if (session.status !== 'manager') return null;
  // حماية من فتح المسار بحساب غير أدمن
  if (!session.profile.is_admin) return <Redirect href="/(manager)" />;
  return (
    <DrawerProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: 'fade' }} />
    </DrawerProvider>
  );
}
