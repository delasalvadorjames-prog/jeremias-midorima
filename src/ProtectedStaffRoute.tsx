import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

type ProtectedStaffRouteProps = {
  token: string | null;
  currentRole: string | null;
};

export default function ProtectedStaffRoute({ token, currentRole }: ProtectedStaffRouteProps) {
  if (!token || currentRole !== 'staff') {
    return <Navigate to="/staff-login" replace />;
  }

  return <Outlet />;
}
