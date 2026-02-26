"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Star } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
            <Star className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-lg font-bold text-white">
            Five Star <span className="gradient-text">Reply</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden md:flex items-center gap-8">
          <li>
            <Link
              href="#features"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Features
            </Link>
          </li>
          <li>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              How It Works
            </Link>
          </li>
          <li>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Pricing
            </Link>
          </li>
          <li>
            <Link
              href="#demo"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Demo
            </Link>
          </li>
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" className="text-muted-foreground hover:text-white" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button
            className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white border-0"
            asChild
          >
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-muted-foreground hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-background/95 backdrop-blur-xl px-6 py-6 flex flex-col gap-4">
          <Link
            href="#features"
            className="text-muted-foreground hover:text-white transition-colors py-2"
            onClick={() => setMobileOpen(false)}
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-muted-foreground hover:text-white transition-colors py-2"
            onClick={() => setMobileOpen(false)}
          >
            How It Works
          </Link>
          <Link
            href="#pricing"
            className="text-muted-foreground hover:text-white transition-colors py-2"
            onClick={() => setMobileOpen(false)}
          >
            Pricing
          </Link>
          <Link
            href="#demo"
            className="text-muted-foreground hover:text-white transition-colors py-2"
            onClick={() => setMobileOpen(false)}
          >
            Demo
          </Link>
          <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
            <Button variant="outline" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button
              className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-0"
              asChild
            >
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
