import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Fuel, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import logo from '@/assets/logo.png';
import sonapLogo from '@/assets/sonap.jpeg';
import authBg from '@/assets/auth-bg.png';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, resetPasswordForEmail, updatePassword, user, hasProfile, hasRole, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auth view state
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [isSuccess, setIsSuccess] = useState(false);

  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  useEffect(() => {
    // Si l'utilisateur est connecté ET que la vérification du profil est terminée
    if (user && !authLoading && view !== 'reset') {
      if (hasProfile && hasRole) {
        // Check for saved redirect path
        const savedRedirect = sessionStorage.getItem('redirectAfterLogin');
        if (savedRedirect) {
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(savedRedirect);
        } else {
          navigate('/panel');
        }
      }
    }
  }, [user, hasProfile, hasRole, authLoading, navigate, view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const result = loginSchema.safeParse({ email, password });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Erreur de connexion',
            description: 'Email ou mot de passe incorrect',
            variant: 'destructive',
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast({
            title: 'Email non confirmé',
            description: 'Veuillez vérifier votre email pour confirmer votre compte',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erreur',
            description: error.message,
            variant: 'destructive',
          });
        }
      }
      // Note: Le succès est géré par la redirection automatique dans useEffect
      // car fetchUserData mettra à jour hasProfile/hasRole
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur inattendue est survenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show "unauthorized" AFTER auth is fully loaded (prevents flash during login redirect)
  const isUnauthorized = user && !authLoading && (!hasProfile || !hasRole);

  // If user is logged in and we are still loading OR about to redirect, show a spinner
  // This prevents any UI flashes (unauthorized card or login form)
  if (user && (authLoading || (hasProfile && hasRole && view !== 'reset'))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 animate-in zoom-in-95 duration-500">
            <img src={logo} alt="SIHG" className="h-16 w-16 drop-shadow-lg" />
            <div className="h-10 w-[1px] bg-border" />
            <img src={sonapLogo} alt="SONAP" className="h-12 w-12 drop-shadow-lg" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
              Sécurisation de la session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        <div className="absolute top-8 left-8">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Retour à l'accueil
          </Link>
        </div>
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center items-center gap-3 mb-4 scale-110">
              <img src={logo} alt="SIHG" className="h-16 w-16" />
              <div className="h-10 w-[1px] bg-slate-200"></div>
              <img src={sonapLogo} alt="SONAP" className="h-12 w-12" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {view === 'login' && 'Connexion'}
              {view === 'forgot' && 'Mot de passe oublié'}
              {view === 'reset' && 'Réinitialisation'}
            </h1>
            {reason === 'expired' && (
              <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                <ShieldAlert className="h-5 w-5 text-orange-600 shrink-0" />
                <p className="text-xs text-orange-800 font-medium text-left">
                  Votre session a expiré pour inactivité. Veuillez vous identifier pour continuer vos travaux.
                </p>
              </div>
            )}
          </div>

          {isUnauthorized && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-red-700">
                  <ShieldAlert className="h-5 w-5" />
                  Accès restreint
                </div>
                <p className="text-sm leading-relaxed">
                  Votre compte Google/Email est bien authentifié, mais il n'est pas encore enregistré dans la base de données officielle du SIHG.
                </p>
                <div className="text-xs space-y-1 opacity-80 border-t border-red-200 pt-2">
                  <p>• Contactez votre administrateur pour obtenir un rôle.</p>
                  <p>• Email détecté : <span className="font-mono">{user?.email}</span></p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-red-200 hover:bg-red-100 hover:text-red-900"
                  asChild
                >
                  <Link to="/">Quitter</Link>
                </Button>
              </div>
            </div>
          )}

          {!isUnauthorized && !isSuccess ? (
            <>
              {view === 'login' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password">Mot de passe</Label>
                      <button
                        type="button"
                        onClick={() => setView('forgot')}
                        className="text-xs text-primary hover:underline"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? (
                      'Chargement...'
                    ) : (
                      <>
                        Se connecter
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : view === 'forgot' ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!email) return;
                    setLoading(true);
                    try {
                      await resetPasswordForEmail(email);
                      setIsSuccess(true);
                    } catch (err: any) {
                      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? 'Envoi...' : 'Envoyer le lien'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mx-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour à la connexion
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (password !== confirmPassword) {
                      toast({ variant: 'destructive', title: 'Erreur', description: 'Les mots de passe ne correspondent pas' });
                      return;
                    }
                    if (password.length < 6) {
                      toast({ variant: 'destructive', title: 'Erreur', description: '6 caractères minimum' });
                      return;
                    }
                    setLoading(true);
                    try {
                      await updatePassword(password);
                      setIsSuccess(true);
                    } catch (err: any) {
                      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nouveau mot de passe</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
                  </Button>
                </form>
              )}
            </>
          ) : (
            <div className="text-center space-y-6 py-4">
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">
                  {view === 'forgot' ? 'Email envoyé' : 'Mot de passe mis à jour'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {view === 'forgot'
                    ? "Veuillez vérifier votre boîte de réception pour continuer."
                    : "Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter."}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setView('login');
                  setIsSuccess(false);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
              >
                Retour à la connexion
              </Button>
            </div>
          )}

          {view === 'login' && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Accès restreint
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Les inscriptions sont réservées aux administrateurs. Si vous avez besoin d'un compte, contactez les services officiels du Ministère de l'Énergie.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Branding with Petroleum Image */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center p-12 overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0"
          style={{ 
            backgroundImage: `url(${authBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>

        <div className="relative z-10 text-center text-white max-w-lg px-6">
          <div className="mb-10 inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl transition-transform hover:scale-105 duration-500">
            <Fuel className="h-10 w-10 text-primary opacity-90" />
          </div>
          
          <h2 className="text-3xl lg:text-5xl font-black mb-6 tracking-tighter leading-[0.9] uppercase">
            Souveraineté <br/>
            <span className="text-primary italic">Énergétique</span>
          </h2>
          
          <p className="text-base opacity-70 font-medium text-slate-200 leading-relaxed tracking-wide">
            Plateforme de surveillance stratégique en temps réel. <br className="hidden lg:block"/> 
            Pilotage intelligent des flux d'hydrocarbures en République de Guinée.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
              <p className="text-3xl font-black text-primary">5</p>
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Marques</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
              <p className="text-3xl font-black text-primary">148</p>
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Stations</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
              <p className="text-3xl font-black text-primary">24/7</p>
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Service</p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-xs text-slate-400 font-medium tracking-wide">
            MINISTÈRE DE L'ÉNERGIE, DE L'HYDRAULIQUE ET DES HYDROCARBURES
          </div>
        </div>
      </div>
    </div>
  );
}
