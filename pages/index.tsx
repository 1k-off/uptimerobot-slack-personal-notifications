import { signIn, useSession } from "next-auth/react";
import Websites from "./websites";

const HomePage = () => {
  const { data: session, status } = useSession();
  const loading = status === "loading";

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
        <h1 className="font-display text-5xl md:text-6xl font-extrabold tracking-tight mb-2">
          UCC Dashboard
        </h1>
      </div>

      {/* Simplified Login Card */}
      <main className="w-full max-w-[480px] glass-card rounded-3xl p-12 transition-all duration-300">
        <div className="text-center mb-10">
          <h2 className="text-xl font-semibold">Sign in</h2>
        </div>

        {/* Azure AD Login Action */}
        <div className="flex flex-col items-center">
          <button
            id="login-azure-ad-btn"
            onClick={() => signIn("azure-ad")}
            className="btn-azure group cursor-pointer flex flex-col items-center justify-center p-8 rounded-2xl border border-transparent hover:border-zinc-800 bg-[var(--bg-elevated)]/40 w-full transition-all"
          >
            <svg
              className="w-12 h-12 mb-4"
              viewBox="0 0 23 23"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            <span className="text-sm transition-colors">
              Click to authenticate with Microsoft
            </span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
