import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileQuestion, LayoutDashboard, List, AlertCircle } from 'lucide-react';
import Logo from '@/components/Logo';

const NotFoundPage = () => {
  const [pathname, setPathname] = useState('/unknown');

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gradient-radial">
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <span className="font-display text-[20rem] font-black opacity-[0.04] select-none tracking-tighter text-[var(--text-primary)]">
          404
        </span>
      </div>

      <div className="w-full max-w-[500px] flex flex-col items-center text-center z-10 space-y-8">
        <div className="animate-slide-up opacity-0">
          <div className="w-24 h-24 rounded-full bg-[color-mix(in_srgb,var(--ukad-magenta)_12%,transparent)] border border-[color-mix(in_srgb,var(--ukad-magenta)_25%,transparent)] flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full blur-xl bg-[color-mix(in_srgb,var(--ukad-magenta)_20%,transparent)] animate-pulse"></div>
            <FileQuestion className="w-12 h-12 text-[var(--ukad-magenta)] relative" />
          </div>
        </div>

        <div className="space-y-4 animate-slide-up opacity-0 animation-delay-100">
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Page Not Found
          </h1>
          <p className="text-xl text-[var(--text-secondary)] font-medium">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="w-full p-6 rounded-2xl glass-card animate-slide-up opacity-0 animation-delay-200">
          <p className="text-[var(--text-secondary)] leading-relaxed text-sm md:text-base">
            It may have been removed or the URL might be incorrect. Please check the address bar or use the navigation below to get back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full animate-slide-up opacity-0 animation-delay-200">
          <Link
            href="/websites"
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold rounded-full hover:bg-[var(--ukad-magenta-hover)] transition-all active:scale-[0.98]"
          >
            <LayoutDashboard className="w-5 h-5" />
            Return to Dashboard
          </Link>
          <Link
            href="/websites"
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold rounded-full hover:bg-[var(--bg-subtle)] transition-all active:scale-[0.98]"
          >
            <List className="w-5 h-5" />
            Go to Website List
          </Link>
        </div>

        <footer className="pt-12 text-[var(--text-secondary)] text-xs font-mono uppercase tracking-widest flex flex-col items-center gap-2 animate-slide-up opacity-0 animation-delay-200">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" />
              Error 404: Not Found
            </span>
            <span className="h-3 w-[1px] bg-[var(--border-color)]"></span>
            <span>
              Resource: <span className="text-[var(--text-primary)]">{pathname}</span>
            </span>
          </div>
        </footer>
      </div>

      <div className="absolute bottom-8 left-8 hidden lg:flex opacity-40">
        <Logo size="lg" variant="full" />
      </div>
    </div>
  );
};

export default NotFoundPage;
