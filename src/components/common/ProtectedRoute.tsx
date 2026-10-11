import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRole: 'student' | 'resolver' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#ff3b00] animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Checking campus authentication...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirectUrl =
      allowedRole === 'admin'
        ? '/admin/login'
        : allowedRole === 'student'
        ? '/student/login'
        : '/resolver/login';
    return <Navigate to={redirectUrl} replace />;
  }

  if (user.role !== allowedRole) {
    // Redirect based on actual role
    const fallbackUrl =
      user.role === 'admin' ? '/admin/dashboard'
      : user.role === 'resolver' ? '/resolver/dashboard'
      : '/student/dashboard';
    return <Navigate to={fallbackUrl} replace />;
  }

  if (
    allowedRole === 'resolver' &&
    user.mustChangePassword &&
    location.pathname !== '/resolver/change-password'
  ) {
    return <Navigate to="/resolver/change-password" replace />;
  }

  return <Outlet />;
};
