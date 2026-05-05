import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  const normalizeRole = (role?: string) => {
    const raw = (role || '').toLowerCase();
    if (raw.startsWith('role_')) {
      const stripped = raw.replace('role_', '');
      return stripped === 'professor' ? 'teacher' : stripped;
    }
    if (raw === 'professor') return 'teacher';
    return raw;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login${window.location.search}`} replace />;
  }

  const normalizedRole = normalizeRole(user.role);

  if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
    return <Navigate to={`/${normalizedRole || 'login'}${window.location.search}`} replace />;
  }

  return <>{children}</>;
};
