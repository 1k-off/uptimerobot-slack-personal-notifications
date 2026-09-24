"use client";

import { ArrowUp } from "lucide-react";

interface ScrollToTopButtonProps {
  visible?: boolean;
  onClick: () => void;
}

/**
 * Theme-aware floating action button — visible in both light and dark without relying on hover.
 */
export default function ScrollToTopButton({
  visible = true,
  onClick,
}: ScrollToTopButtonProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-40">
      <button
        type="button"
        onClick={onClick}
        aria-label="Scroll to top"
        className="w-12 h-12 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-lg hover:bg-[var(--bg-subtle)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <ArrowUp className="w-5 h-5" strokeWidth={2.25} />
      </button>
    </div>
  );
}
