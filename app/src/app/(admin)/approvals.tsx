import React from 'react';

import { AdminScreen } from '@/components/admin/AdminScreen';

import ManagerApprovals from '../(manager)/index';

export default function AdminApprovals() {
  return (
    <AdminScreen title="الموافقات" subtitle="الطلبات الواصلة إليك">
      <ManagerApprovals />
    </AdminScreen>
  );
}
