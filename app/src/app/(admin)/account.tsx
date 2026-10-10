import React from 'react';

import { AdminScreen } from '@/components/admin/AdminScreen';
import { ProfileView } from '@/components/ProfileView';
import { useAuth } from '@/lib/auth';

export default function AdminAccount() {
  const { session, logout } = useAuth();
  if (session.status !== 'manager') return null;
  const p = session.profile;
  return (
    <AdminScreen title="حسابي" subtitle={p.role ?? 'مدير النظام'}>
      <ProfileView
        name={p.name}
        subtitle={p.role ?? 'مدير النظام'}
        onLogout={() => void logout()}
        rows={[
          { icon: 'person-outline', label: 'اسم المستخدم', value: p.username },
          { icon: 'shield-checkmark-outline', label: 'الدور', value: p.role ?? 'مدير النظام' },
        ]}
      />
    </AdminScreen>
  );
}
