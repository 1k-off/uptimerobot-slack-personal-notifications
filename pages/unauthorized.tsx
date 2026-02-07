import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ShieldOff, LayoutDashboard, Mail } from 'lucide-react';

export default function UnauthorizedPage() {
    const { data: session } = useSession();

    return (
        <div 
            className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
            style={{
                background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.08) 0%, transparent 70%), #000000'
            }}
        >
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-30"></div>

            <div className="error-card relative z-10 w-full max-w-[500px] text-center">
                {/* Icon Container */}
                <div className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20">
                    <ShieldOff className="w-12 h-12 text-red-500" />
                </div>

                {/* Heading */}
                <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">
                    Access Denied
                </h1>
                
                <p className="text-xl font-medium text-white mb-4">
                    You don't have permission to access this page
                </p>

                <div className="bg-[var(--bg-elevated)] border border-zinc-800 rounded-2xl p-8 mb-8 shadow-2xl">
                    <p className="text-zinc-400 leading-relaxed mb-6">
                        {session 
                            ? `This area of the UptimeRobot Dashboard is restricted to administrative accounts only, ${session.user?.name || 'user'}. If you believe this is a mistake, please verify your account permissions or contact your system administrator.`
                            : 'This area of the UptimeRobot Dashboard is restricted to administrative accounts only. Please log in with an admin account to access this page or contact your system administrator.'
                        }
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            href="/websites"
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                        >
                            <LayoutDashboard className="w-5 h-5" />
                            Return to Dashboard
                        </Link>
                        <Link 
                            href="mailto:admin@example.com"
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[var(--bg-deepest)] border border-zinc-800 text-white font-semibold rounded-xl hover:bg-[var(--bg-subtle)] transition-all active:scale-95"
                        >
                            <Mail className="w-5 h-5" />
                            Contact Admin
                        </Link>
                    </div>
                </div>

                {/* Meta Info */}
                <div className="flex flex-col items-center gap-2 opacity-50">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono uppercase tracking-widest text-white">
                        Error 403: Forbidden
                    </span>
                    <p className="text-xs text-zinc-400">
                        Resource: {typeof window !== 'undefined' ? window.location.pathname : '/admin'}
                    </p>
                </div>
            </div>
        </div>
    );
}
