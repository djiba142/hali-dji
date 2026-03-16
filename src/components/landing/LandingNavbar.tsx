import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, ExternalLink } from 'lucide-react';
import logo from '@/assets/logo.png';
import sonapLogo from '@/assets/sonap.jpeg';
import { cn } from '@/lib/utils';

export const LandingNavbar = () => {
    const { user } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { href: '/', label: 'Accueil', external: false },
        { href: '#features', label: 'Fonctionnalités', external: false, scroll: true },
        { href: '#services', label: 'Services', external: false, scroll: true },
        { href: '/documentation', label: 'Documentation', external: false },
        { href: '/soutien', label: 'Support', external: false },
    ];

    return (
        <nav className={cn(
            "fixed top-0 w-full z-50 transition-all duration-300",
            scrolled
                ? "bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm"
                : "bg-transparent"
        )}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-1 shrink-0" aria-label="SIHG - Accueil">
                        <img
                            src={logo}
                            alt="SIHG Logo"
                            className="h-20 w-auto"
                        />
                        <div className="h-10 w-[1px] bg-slate-300 mx-2 hidden sm:block" />
                        <img
                            src={sonapLogo}
                            alt="SONAP Logo"
                            className="h-12 w-auto hidden sm:block"
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            link.scroll ? (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200",
                                        scrolled
                                            ? "text-slate-600 hover:text-[#f97316] hover:bg-orange-50"
                                            : "text-white/80 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <Link
                                    key={link.href}
                                    to={link.href}
                                    className={cn(
                                        "px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200",
                                        scrolled
                                            ? "text-slate-600 hover:text-[#f97316] hover:bg-orange-50"
                                            : "text-white/80 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            )
                        ))}
                    </div>

                    {/* CTA Button */}
                    <div className="hidden md:flex items-center gap-4">
                        {user && (
                            <Link
                                to="/panel"
                                className={cn(
                                    "text-sm font-semibold transition-colors",
                                    scrolled ? "text-slate-600 hover:text-[#f97316]" : "text-white/80 hover:text-white"
                                )}
                            >
                                Tableau de bord
                            </Link>
                        )}
                        <Button
                            className={cn(
                                "rounded-full px-8 shadow-md transition-all hover:scale-105",
                                scrolled
                                    ? "bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white shadow-blue-900/20"
                                    : "bg-[#f97316] hover:bg-orange-600 text-white shadow-orange-500/30"
                            )}
                            asChild
                        >
                            <Link to={user ? "/panel" : "/auth"}>
                                {user ? "Mon Espace" : "Se connecter"}
                            </Link>
                        </Button>
                    </div>

                    {/* Mobile menu toggle */}
                    <button
                        className={cn(
                            "md:hidden p-2 rounded-xl transition-colors",
                            scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"
                        )}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                    >
                        {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {menuOpen && (
                <div className="md:hidden bg-white border-b border-slate-200 shadow-xl">
                    <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
                        {navLinks.map((link) => (
                            link.scroll ? (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="flex items-center justify-between py-3 px-4 rounded-xl text-slate-700 font-semibold hover:bg-orange-50 hover:text-[#f97316] transition-colors"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <Link
                                    key={link.href}
                                    to={link.href}
                                    className="flex items-center justify-between py-3 px-4 rounded-xl text-slate-700 font-semibold hover:bg-orange-50 hover:text-[#f97316] transition-colors"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            )
                        ))}
                        <div className="pt-4 border-t border-slate-100">
                            <Button className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white rounded-xl h-12" asChild>
                                <Link to={user ? "/panel" : "/auth"} onClick={() => setMenuOpen(false)}>
                                    {user ? "Mon Tableau de bord" : "Se connecter au Portail"}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};
