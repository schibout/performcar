"use client";

import { useTranslation } from "react-i18next";

const TAG_KEYS = [
  "marquee.tag1",
  "marquee.tag2",
  "marquee.tag3",
  "marquee.tag4",
  "marquee.tag5",
  "marquee.tag6",
  "marquee.tag7",
  "marquee.tag8",
] as const;

interface MarqueeRowProps {
  tags: string[];
  reverse?: boolean;
}

// One seamless loop row: two identical halves, the animation slides exactly
// one half width (-50%), so the loop point is pixel-perfect. Each half
// repeats the tags twice to stay wider than ultra-wide viewports.
function MarqueeRow({ tags, reverse = false }: MarqueeRowProps) {
  return (
    <div
      className={`flex w-max group-hover:[animation-play-state:paused] ${
        reverse ? "animate-marquee-reverse" : "animate-marquee"
      }`}
    >
      {[0, 1].map((half) => (
        <div key={half} aria-hidden={half === 1} className="flex w-max">
          {[...tags, ...tags].map((tag, index) => (
            <span
              // eslint-disable-next-line react/no-array-index-key -- list is static and repeated
              key={index}
              className="mr-4 inline-flex shrink-0 items-center rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// Two infinite topic-tag rows drifting in opposite directions; hovering the
// band pauses both.
export function HomeMarquee() {
  const { t } = useTranslation("home");

  const tags = TAG_KEYS.map((key) => t(key));
  // Offset ordering so the same tag doesn't align across the two rows.
  const reversedTags = [...tags].reverse();

  return (
    <div className="group relative space-y-3 overflow-hidden border-y border-border/60 bg-muted/30 py-5">
      {/* Edge fade so tags dissolve instead of clipping hard */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent"
      />

      <MarqueeRow tags={tags} />
      <MarqueeRow tags={reversedTags} reverse />
    </div>
  );
}
