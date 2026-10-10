import { Redirect } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { session } = useAuth();
  if (session.status === 'loading') {
    return (
      <View style={{ flex: 1 }}>
        <Loading />
      </View>
    );
  }
  if (session.status === 'employee') return <Redirect href="/(employee)" />;
  if (session.status === 'manager') return <Redirect href={session.profile.is_admin ? '/(admin)' : '/(manager)'} />;
  return <Redirect href="/login" />;
}
