import Link from "next/link";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { Sun, Moon, Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import type { Session } from "@/types";
import Logo from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  currentPage?: "dashboard" | "monitors" | "admin" | "history" | "audit" | "edit";
}

function navLinkClass(active: boolean, mobile = false): string {
  const base =
    "rounded-full text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ukad-magenta)_40%,transparent)]";

  if (mobile) {
    return active
      ? `${base} bg-[color-mix(in_srgb,var(--ukad-magenta)_12%,transparent)] text-[var(--ukad-magenta)] px-3 py-2`
      : `${base} text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] px-3 py-2`;
  }

  return active
    ? `${base} bg-[color-mix(in_srgb,var(--ukad-magenta)_12%,transparent)] text-[var(--ukad-magenta)] px-3 py-1.5`
    : `${base} text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] px-3 py-1.5`;
}

export default function Header({ currentPage = "dashboard" }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const typedSession = session as Session | null;
  const isAdmin = typedSession?.user?.isAdmin || false;
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdminSection =
    currentPage === "admin" ||
    currentPage === "history" ||
    currentPage === "audit";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--border-color)] bg-[var(--bg-primary)]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--bg-primary)]/75">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/websites" className="flex items-center gap-2">
              <Logo size="md" variant="full" />
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/websites"
              className={navLinkClass(
                currentPage === "monitors" || currentPage === "edit",
              )}
            >
              Monitors
            </Link>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`inline-flex items-center gap-1 cursor-pointer ${navLinkClass(
                    isAdminSection,
                  )}`}
                >
                  Admin
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="z-[100] min-w-[12rem] border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-lg"
                >
                  <DropdownMenuItem asChild>
                    <Link
                      href="/admin"
                      className={
                        currentPage === "admin"
                          ? "font-semibold text-[var(--text-primary)]"
                          : undefined
                      }
                    >
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/admin/messages"
                      className={
                        currentPage === "history"
                          ? "font-semibold text-[var(--text-primary)]"
                          : undefined
                      }
                    >
                      Notifications history
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/admin/audit"
                      className={
                        currentPage === "audit"
                          ? "font-semibold text-[var(--text-primary)]"
                          : undefined
                      }
                    >
                      Audit log
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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
              className="text-sm cursor-pointer font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Sign Out
            </button>
          </div>

          <div className="md:hidden flex items-center gap-2">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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
              className="p-2 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border-color)] py-3">
            <div className="flex flex-col gap-1">
              <Link
                href="/websites"
                onClick={() => setMobileMenuOpen(false)}
                className={navLinkClass(
                  currentPage === "monitors" || currentPage === "edit",
                  true,
                )}
              >
                Monitors
              </Link>
              {isAdmin && (
                <>
                  <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Admin
                  </div>
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={navLinkClass(currentPage === "admin", true)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className={navLinkClass(currentPage === "history", true)}
                  >
                    Notifications history
                  </Link>
                  <Link
                    href="/admin/audit"
                    onClick={() => setMobileMenuOpen(false)}
                    className={navLinkClass(currentPage === "audit", true)}
                  >
                    Audit log
                  </Link>
                </>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="mt-1 rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
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
