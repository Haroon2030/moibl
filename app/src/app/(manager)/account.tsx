import React from 'react';

import { ProfileView } from '@/components/ProfileView';
import { useAuth } from '@/lib/auth';

export default function ManagerAccount() {
  const { session, logout } = useAuth();
  if (session.status !== 'manager') return null;
  const p = session.profile;
  return (
    <ProfileView
      name={p.name}
      subtitle={p.role}
      onLogout={() => void logout()}
      rows={[
        { icon: 'person-outline', label: 'اسم المستخدم', value: p.username },
        { icon: 'shield-checkmark-outline', label: 'الدور', value: p.role },
        { icon: 'storefront-outline', label: 'الفروع التي تديرها', value: p.branches.length ? p.branches.join('، ') : 'كل الفروع' },
      ]}
    />
  );
}
