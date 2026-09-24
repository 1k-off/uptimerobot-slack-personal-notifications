import { signIn, useSession } from "next-auth/react";
import Websites from "./websites";
import Logo from "@/components/Logo";

const HomePage = () => {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-radial flex items-center justify-center text-[var(--text-secondary)]">
        Loading...
      </div>
    );
  }

  if (session) {
    return <Websites />;
  }

  return (
    <div className="min-h-screen bg-gradient-radial flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center animate-slide-up">
        <div className="flex justify-center mb-6">
          <Logo size="lg" variant="icon" />
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-3 text-[var(--text-primary)]">
          UCC Dashboard
        </h1>
        <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-md mx-auto">
          Monitor uptime and route Slack alerts for your sites.
        </p>
      </div>

      <main className="w-full max-w-[440px] glass-card rounded-3xl p-10 md:p-12 transition-all duration-300 animate-slide-up animation-delay-100">
        <div className="text-center mb-8">
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Use your Microsoft work account
          </p>
        </div>

        <button
          id="login-azure-ad-btn"
          onClick={() => signIn("azure-ad")}
          className="btn-azure group cursor-pointer flex flex-col items-center justify-center p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)]/60 w-full transition-all"
        >
          <svg
            className="w-11 h-11 mb-4"
            viewBox="0 0 23 23"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path fill="#f35325" d="M1 1h10v10H1z" />
            <path fill="#81bc06" d="M12 1h10v10H12z" />
            <path fill="#05a6f0" d="M1 12h10v10H1z" />
            <path fill="#ffba08" d="M12 12h10v10H12z" />
          </svg>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Continue with Microsoft
          </span>
        </button>
      </main>
    </div>
  );
};

export default HomePage;
