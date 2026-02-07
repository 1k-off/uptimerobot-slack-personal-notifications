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
    <div 
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.05) 30%, transparent 70%), #000000'
      }}
    >
      {/* Giant 404 watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <span className="font-display text-[20rem] font-black opacity-[0.02] select-none tracking-tighter">
          404
        </span>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[500px] flex flex-col items-center text-center z-10 space-y-8">
        {/* Icon with glow */}
        <div className="animate-slide-up opacity-0">
          <div className="w-24 h-24 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/20 animate-pulse"></div>
            <FileQuestion className="w-12 h-12 text-blue-500 relative" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-4 animate-slide-up opacity-0 animation-delay-100">
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Page Not Found
          </h1>
          <p className="text-xl text-zinc-400 font-medium">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Info Card */}
        <div className="w-full p-6 rounded-2xl bg-[var(--bg-elevated)] border border-zinc-800 animate-slide-up opacity-0 animation-delay-200">
          <p className="text-zinc-500 leading-relaxed text-sm md:text-base">
            It may have been removed or the URL might be incorrect. Please check the address bar or use the navigation below to get back on track.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full animate-slide-up opacity-0 animation-delay-200">
          <Link 
            href="/websites"
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98]"
          >
            <LayoutDashboard className="w-5 h-5" />
            Return to Dashboard
          </Link>
          <Link 
            href="/websites"
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--bg-elevated)] border border-zinc-800 text-white font-semibold rounded-xl hover:bg-[var(--bg-subtle)] transition-all active:scale-[0.98]"
          >
            <List className="w-5 h-5" />
            Go to Website List
          </Link>
        </div>

        {/* Footer */}
        <footer className="pt-12 text-zinc-600 text-xs font-mono uppercase tracking-widest flex flex-col items-center gap-2 animate-slide-up opacity-0 animation-delay-200">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" />
              Error 404: Not Found
            </span>
            <span className="h-3 w-[1px] bg-[var(--bg-subtle)]"></span>
            <span>
              Resource: <span className="text-zinc-400">{pathname}</span>
            </span>
          </div>
        </footer>
      </div>

      {/* Branding Logo (Bottom Left) */}
      <div className="absolute bottom-8 left-8 hidden lg:flex opacity-40">
        <Logo size="lg" variant="full" />
      </div>
    </div>
  );
};

export default NotFoundPage;
