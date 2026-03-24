import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import { User, Session, createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logLogin } from '@/lib/auditLog';

// Types de rôles disponibles dans l'application - Alignés avec Supabase enum app_role
import { AppRole, ROLE_HIERARCHY, ROLE_LABELS, ROLE_DESCRIPTIONS, READ_ONLY_ROLES, USER_MANAGEMENT_ROLES, OBSERVATION_ROLES, DATA_MODIFY_ROLES } from '@/types/roles';
import { Profile, CreateUserParams, AuthContextType } from '@/types/auth';

// Types de rôles et profils importés directement depuis leurs sources
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // Prevent duplicate fetchUserData calls
  const fetchingRef = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);
  const isLoggingIn = useRef(false);

  useEffect(() => {
    console.log(`[AUTH-CORE] Loading state changed to: ${loading}`);
  }, [loading]);

  const hasProfile = !!profile;
  const hasRole = !!role;

  const fetchUserData = useCallback(async (userId: string) => {
    // Skip if already fetching and no new user
    if (fetchingRef.current && lastFetchedUserId.current === userId) {
      console.log(`[AUTH] Already fetching for ${userId}, skipping.`);
      return;
    }

    console.log(`[AUTH] Starting fetch for ${userId}...`);
    fetchingRef.current = true;
    lastFetchedUserId.current = userId;
    setLoading(true);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 8000)
    );

    try {
      console.log(`[AUTH] Metadata Check:`, user?.user_metadata);
      
      const fetchData = async () => {
        // Robust fetching: Use limit(1) instead of maybeSingle to avoid crash on duplicates
        const profileRequest = supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .limit(1);
          
        const roleRequest = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .limit(1);

        const [pRes, rRes] = await Promise.all([profileRequest, roleRequest]);
        return [
          { data: pRes.data?.[0] || null, error: pRes.error },
          { data: rRes.data?.[0] || null, error: rRes.error }
        ];
      };

      const [profileResult, roleResult] = await Promise.race([
        fetchData(),
        timeoutPromise
      ]) as any;

      if (profileResult.error) console.error('[AUTH] Profile error:', profileResult.error);
      if (roleResult.error) console.error('[AUTH] Role error:', roleResult.error);

      let profileData = profileResult.data;
      let roleData = roleResult.data;

      // ---- AUTO-RECOVERY HACK FOR ADMIN ----
      // If admin@nexus.com successfully authenticates but has no profile/role, forcibly create them client-side.
      // This works because the backend RLS allows authenticated users to insert.
      if (user?.email === 'admin@nexus.com' && (!profileData || !roleData)) {
        console.warn('[AUTH] Auto-recovering admin@nexus.com profile via client side...');
        // Insert missing profile
        if (!profileData) {
          await supabase.from('profiles').insert([{
             user_id: userId,
             email: 'admin@nexus.com',
             full_name: 'Super Administrateur',
             organisation: 'Direction Générale',
             poste: 'Directeur Général'
          }]);
          const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).limit(1);
          profileData = data?.[0] || null;
        }
        // Insert missing role
        if (!roleData) {
          await supabase.from('user_roles').insert([{
             user_id: userId,
             role: 'super_admin'
          }]);
          roleData = { role: 'super_admin' };
        }
      }
      // ----------------------------------------

      console.log(`[AUTH] DB Results for ${userId}:`, { profile: !!profileData, role: roleData?.role });

      // Role Fallback logic
      if (roleData?.role) {
        setRole(roleData.role as AppRole);
      } else if (user?.user_metadata?.role) {
        console.warn(`[AUTH] Role fallback to metadata for ${userId}:`, user.user_metadata.role);
        setRole(user.user_metadata.role as AppRole);
      } else {
        setRole(null);
      }

      // Profile Fallback logic
      if (profileData) {
        setProfile(profileData as Profile);
      } else if (user?.user_metadata) {
        setProfile({
          user_id: userId,
          email: user.email || '',
          full_name: user.user_metadata.full_name || user.email || '',
          organisation: user.user_metadata.organisation,
          poste: user.user_metadata.poste,
        } as Profile);
      } else {
        setProfile(null);
      }

      console.log(`[AUTH] Load finished for ${userId}. Role:`, roleData?.role || user?.user_metadata?.role);

      // Concurrent Session Check
      if (profileData?.last_session_id && !isLoggingIn.current) {
        const localToken = localStorage.getItem('sihg_current_session_token');
        if (localToken && profileData.last_session_id !== localToken) {
          console.warn('[SECURITY] Modern session conflict detected for user:', userId);
          console.warn('[SECURITY] Database Token:', profileData.last_session_id.substring(0, 10) + '...');
          console.warn('[SECURITY] Local Token:', localToken.substring(0, 10) + '...');
          
          alert("Votre compte a été ouvert sur un autre appareil. Vous allez être déconnecté par mesure de sécurité.");
          await supabase.auth.signOut();
          window.location.href = '/auth?reason=multi_session';
          return;
        }
      }
    } catch (err) {
      if ((err as Error).message === 'TIMEOUT') {
        console.error('[AUTH] Request timed out. Using metadata fallback only.');
        // If timeout, try metadata as ultimate fallback
        if (user?.user_metadata?.role) {
          setRole(user.user_metadata.role as AppRole);
        }
      } else {
        console.error('[AUTH] Critical error in fetchUserData:', err);
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [user?.id, user?.email]); // Minimal stable dependencies

  // Use ref for fetchUserData to avoid re-registering listener
  const fetchUserDataRef = useRef(fetchUserData);
  useEffect(() => {
    fetchUserDataRef.current = fetchUserData;
  }, [fetchUserData]);

  useEffect(() => {
    console.log('[AUTH-CORE] Registering Auth Listener');
    
    // IMPORTANT: Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[AUTH-CORE] Event: ${event}`);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use ref to avoid dependency on fetchUserData recreation
          setTimeout(() => fetchUserDataRef.current(session.user.id), 0);
          
          if (event === 'SIGNED_IN') {
            setTimeout(() => logLogin(), 500);
          }
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Initial session check
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        setUser(session.user);
        await fetchUserDataRef.current(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initSession();

    return () => {
      console.log('[AUTH-CORE] Unsubscribing Auth Listener');
      subscription.unsubscribe();
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []); // NO DEPENDENCIES -> REGISTER ONCE

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) console.error('[AUTH-CORE] Supabase check error:', error);
        else console.log('[AUTH-CORE] Supabase connection is OK');
      } catch (e) {
        console.error('[AUTH-CORE] Supabase connectivity failed:', e);
      }
    };
    checkSupabase();
  }, []);
  // Temporarily disabled inactivity timer to debug "not responding" issues
  /*
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (user && !loading) {
      inactivityTimer.current = setTimeout(async () => {
        console.log('Session expirée pour inactivité (5 min). Déconnexion...');
        await supabase.auth.signOut();
        window.location.href = '/auth?reason=inactivity';
      }, 5 * 60 * 1000); // 5 minutes
    }
  }, [user, loading]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => resetInactivityTimer();

    events.forEach(event => window.addEventListener(event, handler));
    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handler));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivityTimer]);
  */

  const lockSession = useCallback(() => setIsSessionLocked(true), []);

  const unlockSession = useCallback(async (password: string) => {
    if (!user?.email) return { error: new Error("Utilisateur non identifié") };
    isLoggingIn.current = true;
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });
      if (!error && data.session) {
        setIsSessionLocked(false);
        // Register this as the latest valid session
        await supabase.from('profiles').update({ last_session_id: data.session.access_token }).eq('user_id', user.id);
        localStorage.setItem('sihg_current_session_token', data.session.access_token);
      }
      return { error };
    } finally {
      setTimeout(() => { isLoggingIn.current = false; }, 2000);
    }
  }, [user?.id, user?.email]);

  const signIn = useCallback(async (email: string, password: string) => {
    isLoggingIn.current = true;
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.session && data.user) {
        // Register this as the latest valid session in DB
        await supabase.from('profiles').update({ last_session_id: data.session.access_token }).eq('user_id', data.user.id);
        // Store locally to compare later
        localStorage.setItem('sihg_current_session_token', data.session.access_token);
      }
      if (error) {
        // Log failed login attempt
        try {
          await (supabase as any).from('audit_logs').insert([{
            user_email: email,
            action_type: 'LOGIN',
            status: 'failed',
            error_message: error.message,
            details: { login_timestamp: new Date().toISOString() },
          }]);
        } catch { /* ignore */ }
      }
      return { error };
    } finally {
      setTimeout(() => { isLoggingIn.current = false; }, 2000);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('sihg_current_session_token');
    localStorage.removeItem('sihg_last_active');
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    lastFetchedUserId.current = null;
  }, []);

  const canAccess = useCallback((requiredRole: AppRole): boolean => {
    if (!role) return false;
    return ROLE_HIERARCHY[role] <= ROLE_HIERARCHY[requiredRole];
  }, [role]);

  const hasAnyRole = useCallback((roles: AppRole[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  }, [role]);

  const getDashboardRoute = useCallback((): string => {
    if (!role) return '/auth';
    switch (role) {
      case 'super_admin':
        return '/dashboard/admin';
      case 'directeur_general':
      case 'directeur_adjoint':
      case 'admin_etat':
      case 'secretariat_direction':
        return '/dashboard/admin-etat';
      case 'admin_central':
      case 'chef_regulation':
      case 'analyste_regulation':
        return '/dashboard/admin-central';
      case 'inspecteur':
        return '/dashboard/inspecteur';
      case 'service_it':
        return '/dashboard/service-it';
      case 'directeur_aval':
      case 'directeur_adjoint_aval':
      case 'chef_division_distribution':
      case 'chef_service_aval':
      case 'agent_technique_aval':
      case 'controleur_distribution':
      case 'technicien_support_dsa':
      case 'technicien_flux':
      case 'technicien_aval':
        return '/dashboard/dsa';
      case 'directeur_juridique':
      case 'juriste':
      case 'charge_conformite':
      case 'assistant_juridique':
        return '/dashboard/juridique';
      case 'directeur_importation':
      case 'chef_service_importation':
      case 'agent_suivi_cargaison':
      case 'analyste_approvisionnement':
        return '/dashboard/importation';
      case 'agent_reception_port':
        return '/accueil/reception'; // Or a specific port reception page if created
      case 'directeur_administratif':
      case 'chef_service_administratif':
      case 'gestionnaire_documentaire':
        return '/dashboard/administratif';
      case 'directeur_logistique':
      case 'agent_logistique':
      case 'responsable_depots':
      case 'responsable_transport':
      case 'operateur_logistique':
        return '/dashboard/logistique';
      case 'agent_reception':
        return '/accueil/reception';
      case 'responsable_entreprise':
      case 'gestionnaire_station':
        return '/entreprise-info';
      case 'analyste':
      case 'directeur_financier':
        return '/dashboard/admin-central';
      case 'gestionnaire':
      case 'personnel_admin':
      case 'superviseur_aval':
        return '/dashboard/administratif';
      default:
        return '/profil';
    }
  }, [role]);

  // Calculs RBAC (memoized)
  const isReadOnly = role ? READ_ONLY_ROLES.includes(role) : true;
  const canManageUsers = role ? USER_MANAGEMENT_ROLES.includes(role) : false;
  const canAddObservation = role ? OBSERVATION_ROLES.includes(role) : false;
  const canModifyData = role ? DATA_MODIFY_ROLES.includes(role) : false;
  
  const canManageEntreprises = role ? ['super_admin', 'admin_etat', 'admin_central', 'directeur_general'].includes(role) : false;
  const canManageStations = role ? ['super_admin', 'admin_etat', 'admin_central', 'directeur_general', 'directeur_aval', 'chef_service_aval'].includes(role) : false;


  /**
   * CREATE USER: 
   * Uses signUp then immediately restores current admin session.
   * This prevents the admin from being logged out.
   */
  const createUser = useCallback(async (params: CreateUserParams): Promise<{ error: Error | null; userId?: string }> => {
    const {
      email, password, fullName, role: newUserRole,
      entreprise_id, station_id
    } = params;
    
    if (!canManageUsers) return { error: new Error('Permissions insuffisantes') };

    try {
      // On repasse sur un signUp client car la Edge Function n'est pas déployée chez l'utilisateur.
      // Le script SQL 'FIX_TRIGGER_AND_ROLES.sql' doit être exécuté pour que ce signUp fonctionne
      // sans l'erreur "DATABASE ERREUR SAVING NEW USER".
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      const effectivePassword = (password && password.length >= 8) ? password : 'SIHG' + Math.random().toString(36).slice(-4) + '!2024';
      
      const { data: authData, error: signUpError } = await tempSupabase.auth.signUp({
        email,
        password: effectivePassword,
        options: {
          data: {
            full_name: fullName,
            prenom: params.prenom || '',
            role: newUserRole,
            organisation: params.organisation || '',
            direction: params.direction || '',
            poste: params.poste || '',
            matricule: params.matricule || '',
            phone: params.phone || '',
            sexe: params.sexe || 'M',
            date_naissance: params.dateNaissance || null,
            adresse: params.adresse || '',
            region: params.region || '',
            prefecture: params.prefecture || '',
            commune: params.commune || '',
            entreprise_id: entreprise_id || '',
            station_id: station_id || ''
          }
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Utilisateur non créé');

      const newUserId = authData.user.id;

      // On laisse le trigger 'handle_new_user' (mis à jour par le script SQL) faire le travail
      // d'insertion du profil et du rôle de manière sécurisée (SECURITY DEFINER).
      
      return { error: null, userId: newUserId };
    } catch (error: any) {
      console.error('Create user technical error:', error);
      const detailedMessage = error.message || error.details || (typeof error === 'string' ? error : JSON.stringify(error));
      
      // Message d'erreur plus convivial si c'est une erreur de fonction non trouvée (souvent signe d'un déploiement manquant)
      if (detailedMessage.toLowerCase().includes('not found') || detailedMessage.toLowerCase().includes('failed to fetch')) {
        return { error: new Error(`Erreur technique : La fonction de création (Edge Function) n'est pas déployée ou est inaccessible. Veuillez vous assurer que 'create-user' est déployée sur votre projet Supabase.`) };
      }

      return { error: new Error(`Erreur technique de création : ${detailedMessage} (Code: ${error.code || 'N/A'})`) };
    }
  }, [canManageUsers]);

  /**
   * UPDATE USER:
   * Updates the profile and role of an existing user.
   */
  const updateUser = useCallback(async (userId: string, params: Partial<CreateUserParams>): Promise<{ error: Error | null }> => {
    if (!canManageUsers) return { error: new Error('Permissions insuffisantes') };

    try {
      // Update profile
      const profileUpdates: Record<string, unknown> = {};
      if (params.fullName) profileUpdates.full_name = params.fullName;
      if (params.prenom) profileUpdates.prenom = params.prenom;
      if (params.email) profileUpdates.email = params.email;
      if (params.region) profileUpdates.region = params.region;
      if (params.prefecture) profileUpdates.prefecture = params.prefecture;
      if (params.commune) profileUpdates.commune = params.commune;
      if (params.organisation) profileUpdates.organisation = params.organisation;
      if (params.direction) profileUpdates.direction = params.direction;
      if (params.poste) profileUpdates.poste = params.poste;
      if (params.sexe) profileUpdates.sexe = params.sexe;
      if (params.dateNaissance) profileUpdates.date_naissance = params.dateNaissance;
      if (params.adresse) profileUpdates.adresse = params.adresse;
      if (params.matricule) profileUpdates.matricule = params.matricule;
      if (params.forcePasswordChange !== undefined) profileUpdates.force_password_change = params.forcePasswordChange;
      if (params.entreprise_id !== undefined) profileUpdates.entreprise_id = params.entreprise_id;
      if (params.station_id !== undefined) profileUpdates.station_id = params.station_id;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('user_id', userId);

        if (profileError) throw profileError;
      }

      // Update role if specified
      if (params.role) {
        // Try update first
        const { error: roleUpdateError, count } = await (supabase as any)
          .from('user_roles')
          .update({ role: params.role })
          .eq('user_id', userId);

        if (roleUpdateError) {
          // Fallback: delete and re-insert
          await (supabase as any).from('user_roles').delete().eq('user_id', userId);
          const { error: roleInsertError } = await (supabase as any)
            .from('user_roles')
            .insert({ user_id: userId, role: params.role });
          if (roleInsertError) throw roleInsertError;
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [canManageUsers]);

  /**
   * DELETE USER:
   * Deletes the user's profile and role from the database.
   * Note: Cannot delete auth.users from client-side; only profile + role are removed.
   */
  const deleteUser = useCallback(async (userId: string): Promise<{ error: Error | null }> => {
    if (!canManageUsers) return { error: new Error('Permissions insuffisantes') };

    try {
      // Delete role first (no FK constraint issues)
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) {
        console.warn('Error deleting user role:', roleError);
      }

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [canManageUsers]);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    session,
    profile,
    role,
    loading,
    hasProfile,
    hasRole,
    signIn,
    signUp,
    signOut,
    isSessionLocked,
    lockSession,
    unlockSession,
    canAccess,
    hasAnyRole,
    createUser,
    updateUser,
    deleteUser,
    resetPasswordForEmail,
    updatePassword,
    getDashboardRoute,
    isReadOnly,
    canManageUsers,
    canAddObservation,
    canModifyData,
    canManageEntreprises,
    canManageStations,
  }), [
    user, session, profile, role, loading, hasProfile, hasRole,
    signIn, signUp, signOut, isSessionLocked, unlockSession,
    canAccess, hasAnyRole, createUser,
    updateUser, deleteUser, resetPasswordForEmail, updatePassword,
    getDashboardRoute, isReadOnly, canManageUsers, canAddObservation, canModifyData, lockSession,
    canManageEntreprises, canManageStations
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


