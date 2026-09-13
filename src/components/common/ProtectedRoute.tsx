import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRole: 'student' | 'resolver';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole }) => {
  const { user, loading } = useAuth();

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
    const redirectUrl = allowedRole === 'student' ? '/student/login' : '/resolver/login';
    return <Navigate to={redirectUrl} replace />;
  }

  const hasAccess =
    user.role === allowedRole || (allowedRole === 'resolver' && user.role === 'admin');

  if (!hasAccess) {
    const fallbackUrl = user.role === 'student' ? '/student/dashboard' : '/resolver/dashboard';
    return <Navigate to={fallbackUrl} replace />;
  }

  return <Outlet />;
};
