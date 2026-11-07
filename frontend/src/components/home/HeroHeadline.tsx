"use client";

import { motion } from "motion/react";

import { EASE_OUT, wordRise, wordStagger } from "@/lib/motion/variants";
import { cn } from "@/lib/utils";

// Word containing the site name gets the gradient + hand-drawn underline.
function isAccentWord(word: string, appName: string): boolean {
  if (!appName) return false;
  return word.toLocaleLowerCase().includes(appName.toLocaleLowerCase());
}

interface HeroHeadlineProps {
  title: string;
  // Site name (from branding) used to highlight the matching word in the title.
  appName: string;
}

// Word-by-word masked rise; the accent word is gradient-filled and underlined
// by a self-drawing stroke once the words have settled.
export function HeroHeadline({ title, appName }: HeroHeadlineProps) {
  return (
    <motion.h1
      variants={wordStagger}
      className="text-balance text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-foreground"
    >
      {title.split(" ").map((word, index, words) => {
        const accent = isAccentWord(word, appName);
        return (
          <span
            // eslint-disable-next-line react/no-array-index-key -- words can repeat; order is stable
            key={index}
            className={cn(
              "inline-block overflow-hidden align-bottom",
              index < words.length - 1 && "mr-[0.28em]",
            )}
          >
            <motion.span
              variants={wordRise}
              className={cn(
                "relative inline-block pb-2",
                accent &&
                  "bg-gradient-to-r from-primary to-primary/65 bg-clip-text text-transparent",
              )}
            >
              {word}
              {accent ? (
                <motion.svg
                  aria-hidden
                  viewBox="0 0 120 8"
                  preserveAspectRatio="none"
                  className="absolute bottom-0 left-0 h-2 w-full"
                >
                  <motion.path
                    d="M2 6 C 30 2, 90 2, 118 5"
                    stroke="var(--primary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 1, duration: 0.7, ease: EASE_OUT }}
                  />
                </motion.svg>
              ) : null}
            </motion.span>
          </span>
        );
      })}
    </motion.h1>
  );
}
