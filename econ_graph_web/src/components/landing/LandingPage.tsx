"use client";

import { Footer } from "../chrome/Footer";
import { HeroSection } from "./HeroSection";
import { LandingTopbar } from "./LandingTopbar";

export function LandingPage() {
  return (
    <main className="bg-zinc-950 text-white">
      <LandingTopbar />
      <HeroSection />
      <Footer />
    </main>
  );
}
