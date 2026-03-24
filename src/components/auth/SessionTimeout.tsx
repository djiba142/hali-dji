import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const WARNING_BEFORE = 60 * 1000; // 1 minute warning before logout

export const SessionTimeout = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    // Save current path to redirect back after login
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/auth' && currentPath !== '/') {
      sessionStorage.setItem('redirectAfterLogin', currentPath);
    }

    // CLEAR LAST ACTIVE TO PREVENT INFINITE LOCKOUT LOOP
    localStorage.removeItem('sihg_last_active');

    await supabase.auth.signOut();
    toast({
      title: "Session expirée",
      description: "Vous avez été déconnecté pour inactivité par mesure de sécurité.",
      variant: "destructive",
    });
    navigate('/auth?reason=expired');
  }, [navigate, toast]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    if (profile) {
      // Save last activity to localStorage
      localStorage.setItem('sihg_last_active', Date.now().toString());

      warningRef.current = setTimeout(() => {
        toast({
          title: "Alerte de sécurité",
          description: "Votre session va expirer dans 1 minute suite à votre inactivité.",
        });
      }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

      timeoutRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    }
  }, [profile, logout, toast]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'scroll', 'click'];
    
    if (profile) {
      // Check for existing activity on mount (prevents bypass via refresh)
      const lastActive = localStorage.getItem('sihg_last_active');
      if (lastActive) {
        const elapsed = Date.now() - parseInt(lastActive, 10);
        if (elapsed >= INACTIVITY_TIMEOUT) {
          console.log('[SECURITY] Persistent timeout detected. Logging out.');
          logout();
          return;
        }
      }

      events.forEach(event => window.addEventListener(event, resetTimer));
      
      // Listen for activity in other tabs
      const crossTabSync = (e: StorageEvent) => {
        if (e.key === 'sihg_last_active' && e.newValue) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (warningRef.current) clearTimeout(warningRef.current);
          
          const newLastActive = parseInt(e.newValue, 10);
          const remaining = INACTIVITY_TIMEOUT - (Date.now() - newLastActive);
          
          if (remaining > 0) {
            timeoutRef.current = setTimeout(logout, remaining);
          } else {
            logout();
          }
        }
      };
      window.addEventListener('storage', crossTabSync);
      
      resetTimer();

      return () => {
        events.forEach(event => window.removeEventListener(event, resetTimer));
        window.removeEventListener('storage', crossTabSync);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);
      };
    }
  }, [profile, resetTimer, logout]);

  return null;
};
