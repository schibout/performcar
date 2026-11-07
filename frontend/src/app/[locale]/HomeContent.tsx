"use client";

import { HomeCtaBand } from "@/components/home/HomeCtaBand";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeMarquee } from "@/components/home/HomeMarquee";
import { HomeShowcase } from "@/components/home/HomeShowcase";
import { HomeStats } from "@/components/home/HomeStats";
import { HomeSteps } from "@/components/home/HomeSteps";
import { ScrollProgress } from "@/components/layout/ScrollProgress";

// Landing page — a scroll story: word-reveal hero with aurora and parallax,
// a topic marquee, 3D-tilt features, a pinned horizontal showcase, counting
// stats, alternating steps and a closing CTA, with a progress bar tracking
// the journey.
export function HomeContent() {
  return (
    <div className="flex flex-col flex-1">
      <ScrollProgress />
      <HomeHero />
      <HomeMarquee />
      <HomeFeatures />
      <HomeShowcase />
      <HomeStats />
      <HomeSteps />
      <HomeCtaBand />
      <HomeFooter />
    </div>
  );
}
