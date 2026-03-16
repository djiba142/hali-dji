import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Lock, LogOut, Loader2, Eye, EyeOff, Clock, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import sonapLogo from '@/assets/sonap.jpeg';
import logo from '@/assets/logo.png';

const INACTIVITY_MINUTES = 5;

export function SessionLockOverlay() {
  const { isSessionLocked, profile, unlockSession, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [lockTime] = useState(new Date());
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when overlay appears
  useEffect(() => {
    if (isSessionLocked && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isSessionLocked]);

  // Countdown timer for blocked state
  useEffect(() => {
    if (!blockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((blockedUntil.getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setBlockedUntil(null);
        setTimeLeft(0);
        setAttempts(0);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [blockedUntil]);

  if (!isSessionLocked) return null;

  const isBlocked = blockedUntil && Date.now() < blockedUntil.getTime();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked || !password) return;

    setLoading(true);
    const { error } = await unlockSession(password);

    if (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPassword('');

      if (newAttempts >= 3) {
        // Block for 2 minutes after 3 failed attempts
        const until = new Date(Date.now() + 2 * 60 * 1000);
        setBlockedUntil(until);
        setTimeLeft(120);
        toast({
          variant: 'destructive',
          title: '⛔ Accès bloqué temporairement',
          description: `Trop de tentatives échouées. Réessayez dans 2 minutes.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Mot de passe incorrect',
          description: `${3 - newAttempts} tentative(s) restante(s) avant blocage.`,
        });
      }
    } else {
      setPassword('');
      setAttempts(0);
    }
    setLoading(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getInitials = () => {
    if (!profile?.full_name) return '??';
    return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-auto"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f2d1a 100%)' }}
    >
      {/* Background animated pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-3xl" />
      </div>

      {/* Main Card */}
      <div className="relative w-full max-w-md">

        {/* Header: Logos */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
            <img src={logo} alt="NEXUS" className="h-8 opacity-90" />
            <div className="h-5 w-px bg-white/20" />
            <img src={sonapLogo} alt="SONAP" className="h-7 rounded opacity-80" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-4 bg-[#CE1126] rounded-sm" />
            <span className="h-2 w-4 bg-[#FCD116] rounded-sm" />
            <span className="h-2 w-4 bg-[#00944D] rounded-sm" />
          </div>
        </div>

        {/* Lock Card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

          {/* Top Security Banner */}
          <div className="bg-gradient-to-r from-red-900/40 to-orange-900/30 border-b border-red-500/20 px-6 py-3 flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black tracking-widest uppercase text-red-400">Session Verrouillée — Sécurité Système</p>
              <p className="text-[10px] text-red-300/70 truncate">
                Inactivité détectée après {INACTIVITY_MINUTES} minutes • {lockTime.toLocaleTimeString('fr-FR')}
              </p>
            </div>
            <Shield className="h-5 w-5 text-red-400/50 shrink-0" />
          </div>

          {/* User Info */}
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="relative inline-block mb-4">
              <Avatar className="h-20 w-20 ring-4 ring-white/10 shadow-xl">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-xl font-black">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 h-9 w-9 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-900">
                <Lock className="h-4 w-4 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {profile?.prenom || profile?.full_name?.split(' ')[0] || 'Utilisateur'}
            </h2>
            <p className="text-xs text-white/50 mt-1 font-medium">
              {profile?.email}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-widest font-bold">
              {profile?.poste || 'Agent SIHG'}
            </p>
          </div>

          {/* Reason Banner */}
          <div className="mx-6 mb-6 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300 font-medium leading-tight">
              Session expirée pour raison de sécurité après <strong className="text-amber-200">{INACTIVITY_MINUTES} minutes</strong> d'inactivité. Veuillez vous reconnecter pour continuer.
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8 space-y-4">
            {isBlocked ? (
              <div className="text-center py-6 space-y-3">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-red-500/20 flex items-center justify-center mb-4">
                  <Lock className="h-7 w-7 text-red-400" />
                </div>
                <p className="text-white/80 font-bold text-sm">Accès temporairement bloqué</p>
                <p className="text-white/40 text-xs">Trop de tentatives incorrectes</p>
                <div className="text-4xl font-black text-red-400 font-mono tracking-widest">
                  {formatTime(timeLeft)}
                </div>
                <p className="text-[10px] text-white/30">Réessayez dans ce délai</p>
              </div>
            ) : (
              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Input
                      ref={inputRef}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl px-4 pr-12 placeholder:text-white/20 font-mono text-base tracking-widest focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {attempts > 0 && (
                    <p className="text-[10px] text-red-400 mt-1.5 font-bold">
                      ⚠ {attempts} tentative(s) échouée(s) — {3 - attempts} restante(s) avant blocage
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-900/40 gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  {loading
                    ? <><Loader2 className="animate-spin h-4 w-4" /> Vérification...</>
                    : <><Shield className="h-4 w-4" /> Déverrouiller la session</>
                  }
                </Button>
              </form>
            )}

            {/* Separator */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-white/20 font-bold uppercase">ou</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Sign Out */}
            <Button
              variant="ghost"
              onClick={() => signOut()}
              className="w-full h-10 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-white/5 gap-2 font-bold text-xs uppercase tracking-widest transition-all"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter complètement
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center space-y-1">
          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">
            Système SIHG Certifié • République de Guinée
          </p>
          <p className="text-[8px] text-white/15 uppercase tracking-widest">
            SONAP — Société Nationale des Pétroles de Guinée
          </p>
        </div>
      </div>
    </div>
  );
}
