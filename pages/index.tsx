import React from 'react';
import { signIn, useSession } from 'next-auth/react';
import Websites from './websites';
import { ShieldCheck } from 'lucide-react';

const HomePage = () => {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (session) {
    return <Websites />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6">
      {/* Header Title */}
      <div className="mb-10 text-center">
        <h1 className="font-display text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-2">
          UCC Dashboard
        </h1>
      </div>

      {/* Simplified Login Card */}
      <main className="w-full max-w-[480px] glass-card rounded-3xl p-12 transition-all duration-300">
        <div className="text-center mb-10">
          <h2 className="text-xl font-semibold text-white">Sign in</h2>
        </div>

        {/* Azure AD Login Action */}
        <div className="flex flex-col items-center">
          <button
            id="login-azure-ad-btn"
            onClick={() => signIn('azure-ad')}
            className="btn-azure group flex flex-col items-center justify-center p-8 rounded-2xl border border-transparent hover:border-zinc-800 bg-[var(--bg-elevated)]/40 w-full transition-all"
          >
            <svg className="w-12 h-12 mb-4" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            <span className="text-zinc-400 text-sm group-hover:text-white transition-colors">
              Click to authenticate with Microsoft
            </span>
          </button>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="mt-16 flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity duration-500">
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <ShieldCheck className="text-base text-blue-500" size={16} />
          <span>Secure SSO Authentication</span>
        </div>
        <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em] font-medium">
          &copy; 2024 UCC System
        </p>
      </footer>
    </div>
  );
};

export default HomePage;
