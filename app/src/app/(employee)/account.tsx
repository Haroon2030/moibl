import React from 'react';

import { ProfileView } from '@/components/ProfileView';
import { useAuth } from '@/lib/auth';
import { date } from '@/lib/format';

export default function EmployeeAccount() {
  const { session, logout } = useAuth();
  if (session.status !== 'employee') return null;
  const p = session.profile;
  return (
    <ProfileView
      name={p.name}
      subtitle={[p.profession, p.branch].filter(Boolean).join(' · ')}
      onLogout={() => void logout()}
      rows={[
        { icon: 'id-card-outline', label: 'الرقم الوظيفي', value: p.employee_number },
        { icon: 'storefront-outline', label: 'الفرع', value: p.branch },
        { icon: 'git-network-outline', label: 'القسم', value: p.department },
        { icon: 'briefcase-outline', label: 'المهنة', value: p.profession },
        { icon: 'calendar-outline', label: 'تاريخ المباشرة', value: p.hire_date ? date(p.hire_date) : null },
        { icon: 'pulse-outline', label: 'الحالة', value: p.status_display },
      ]}
    />
  );
}
