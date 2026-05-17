import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default AdminProtectedRoute;
