import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types';
import { useState, useEffect } from 'react';
import { 
  getPublicIP, 
  isIpAllowed, 
  ADMIN_ROLES_SUBJECT_TO_IP_WHIELISTS, 
  IS_IP_WHITELIST_ENABLED 
} from '@/lib/ipWhitelisting';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading: authLoading, canAccess, role } = useAuth();
  const [ipLoading, setIpLoading] = useState(IS_IP_WHITELIST_ENABLED);
  const [ipDenied, setIpDenied] = useState(false);

  useEffect(() => {
    if (!IS_IP_WHITELIST_ENABLED || !user || !role) {
      setIpLoading(false);
      return;
    }

    // Only apply IP whitelisting to administrative roles
    if (!ADMIN_ROLES_SUBJECT_TO_IP_WHIELISTS.includes(role)) {
      setIpLoading(false);
      return;
    }

    // Check if IP is already verified in this session
    const isIpVerified = sessionStorage.getItem('sihg_ip_verified');
    if (isIpVerified === 'true') {
      setIpLoading(false);
      return;
    }

    async function verifyIp() {
      const ip = await getPublicIP();
      if (!isIpAllowed(ip)) {
        setIpDenied(true);
      } else {
        sessionStorage.setItem('sihg_ip_verified', 'true');
      }
      setIpLoading(false);
    }

    verifyIp();
  }, [user, role]);

  if (authLoading || ipLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (ipDenied) {
    return <Navigate to="/ip-denied" replace />;
  }

  if (!user) {
    // Save current path to redirect back after login
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/auth' && currentPath !== '/') {
      sessionStorage.setItem('redirectAfterLogin', currentPath);
    }
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && !canAccess(requiredRole)) {
    return <Navigate to="/acces-refuse" replace />;
  }

  return <>{children}</>;
}
