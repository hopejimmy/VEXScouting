'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  fallbackPath = '/'
}) => {
  const { isAuthenticated, hasPermission, hasRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait for auth to initialize

    // Check if authentication is required
    if (requiredPermission || requiredRole) {
      if (!isAuthenticated) {
        router.push(fallbackPath);
        return;
      }

      // Check specific permission
      if (requiredPermission && !hasPermission(requiredPermission)) {
        router.push(fallbackPath);
        return;
      }

      // Check specific role
      if (requiredRole && !hasRole(requiredRole)) {
        router.push(fallbackPath);
        return;
      }
    }
  }, [isAuthenticated, hasPermission, hasRole, isLoading, requiredPermission, requiredRole, router, fallbackPath]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check permissions after loading is complete
  if (requiredPermission || requiredRole) {
    if (!isAuthenticated) {
      return null; // Will redirect in useEffect
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      return null; // Will redirect in useEffect
    }

    if (requiredRole && !hasRole(requiredRole)) {
      return null; // Will redirect in useEffect
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute; 