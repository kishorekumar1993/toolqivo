"use client";

import React, { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";

export function AppClientLayout({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
        <Header onOpenSearch={() => setIsSearchOpen(true)} />
        <main className="flex-1">{children}</main>
        <Footer />
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      </div>
    </ThemeProvider>
  );
}
