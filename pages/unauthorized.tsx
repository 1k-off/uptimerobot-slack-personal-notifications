import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ShieldOff, LayoutDashboard } from "lucide-react";

export default function UnauthorizedPage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-30"></div>

      <div className="error-card relative z-10 w-full max-w-[500px] text-center">
        {/* Icon Container */}
        <div className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20">
          <ShieldOff className="w-12 h-12 text-red-500" />
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Access Denied
        </h1>

        <p className="text-xl font-medium mb-4">
          You don&apos;t have permission to access this page
        </p>

        <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-2xl p-8 mb-8 shadow-2xl">
          <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
            {session
              ? `This area of the UCC Dashboard is restricted to administrative accounts only, ${session.user?.name || "user"}. If you believe this is a mistake, please verify your account permissions or contact your system administrator.`
              : "This area of the UCC Dashboard is restricted to administrative accounts only. Please log in with an admin account to access this page or contact your system administrator."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/websites"
              className="flex-1 border border-[var(--border-color)] flex items-center justify-center gap-2 px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold rounded-xl hover:bg-[var(--ukad-magenta-hover)] transition-all active:scale-95 cursor-pointer"
            >
              <LayoutDashboard className="w-5 h-5" />
              Return to Dashboard
            </Link>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-col items-center gap-2 opacity-50">
          <span className="px-3 py-1 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-full text-xs font-mono uppercase tracking-widest text-[var(--text-secondary)]">
            Error 403: Forbidden
          </span>
          <p className="text-xs text-[var(--text-secondary)]">Resource: {router.asPath}</p>
        </div>
      </div>
    </div>
  );
}
