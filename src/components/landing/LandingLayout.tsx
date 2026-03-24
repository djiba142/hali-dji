import React from 'react';
import { LandingNavbar } from './LandingNavbar';
import { LandingFooter } from './LandingFooter';

interface LandingLayoutProps {
    children: React.ReactNode;
}

export const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans overflow-x-hidden">
            <LandingNavbar />
            <main className="pt-20">
                {children}
            </main>
            <LandingFooter />
        </div>
    );
};
