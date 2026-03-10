"use client";

import { Footer } from "../chrome/Footer";
import { HeroSection } from "./HeroSection";
import { HowItWorksLinear } from "./HowItWorksLinear";
import { LandingTopbar } from "./LandingTopbar";
import { UseCasesSection } from "./UseCasesSection";
import { LandingBackground } from "./LandingBackground";
import { ScrollProgress } from "./ScrollProgress";

export function LandingPage() {
  return (
    <main className="relative bg-white text-zinc-900 selection:bg-violet-500/20 overflow-x-hidden">
      <LandingBackground />
      <ScrollProgress />
      
      <div className="relative z-10 flex flex-col">
        <LandingTopbar />
        <HeroSection />
        <UseCasesSection />
        <HowItWorksLinear />
        <Footer />
      </div>
    </main>
  );
}
