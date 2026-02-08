import Link from "next/link";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import type { Session } from "@/types";
import Logo from "@/components/Logo";

interface HeaderProps {
  currentPage?: "dashboard" | "monitors" | "admin" | "history" | "edit";
}

export default function Header({ currentPage = "dashboard" }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const typedSession = session as Session | null;
  const isAdmin = typedSession?.user?.isAdmin || false;
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent hydration mismatch by only rendering theme toggle after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/websites" className="flex items-center gap-2">
              <Logo size="md" variant="full" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/websites"
              className={`text-sm font-medium transition-colors ${
                currentPage === "monitors"
                  ? "text-white border-b-2 border-white pb-1"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Monitors
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/admin/messages"
                  className={`text-sm font-medium transition-colors ${
                    currentPage === "history"
                      ? "text-white border-b-2 border-white pb-1"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  History
                </Link>
                <Link
                  href="/admin"
                  className={`text-sm font-medium transition-colors ${
                    currentPage === "admin"
                      ? "text-white border-b-2 border-white pb-1"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Admin
                </Link>
              </>
            )}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 cursor-pointer text-zinc-400 hover:text-white transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            )}
            <button
              onClick={() => signOut()}
              className="text-sm cursor-pointer font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 cursor-pointer text-zinc-400 hover:text-white transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 cursor-pointer text-zinc-400 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 py-4">
            <div className="flex flex-col gap-4">
              <Link
                href="/websites"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-medium transition-colors py-2 ${
                  currentPage === "monitors"
                    ? "text-white border-l-2 border-white pl-4"
                    : "text-zinc-400 hover:text-white pl-4"
                }`}
              >
                Monitors
              </Link>
              {isAdmin && (
                <>
                  <Link
                    href="/admin/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-sm font-medium transition-colors py-2 ${
                      currentPage === "history"
                        ? "text-white border-l-2 border-white pl-4"
                        : "text-zinc-400 hover:text-white pl-4"
                    }`}
                  >
                    History
                  </Link>
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-sm font-medium transition-colors py-2 ${
                      currentPage === "admin"
                        ? "text-white border-l-2 border-white pl-4"
                        : "text-zinc-400 hover:text-white pl-4"
                    }`}
                  >
                    Admin
                  </Link>
                </>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="text-sm cursor-pointer font-medium text-zinc-400 hover:text-white transition-colors text-left py-2 pl-4"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
