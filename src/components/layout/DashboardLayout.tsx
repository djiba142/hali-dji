import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 rounded-full -mr-[25%] -mt-[15%] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-accent/5 rounded-full -ml-[20%] -mb-[10%] blur-[100px] pointer-events-none" />
      
      <Sidebar />
      <div className="pl-0 md:pl-[260px] transition-all duration-300 relative z-10">
        <Header title={title} subtitle={subtitle} />
        <main className="p-4 md:p-8 animate-in fade-in duration-700 max-w-[1700px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
