// Shared motion vocabulary for the "Derin Su" design language. Pages compose
// these instead of declaring ad-hoc variants so timing and easing stay
// consistent app-wide.

import type { Transition, Variants } from "motion/react";

// Expressive ease-out curve used for entrances (fast start, soft landing).
export const EASE_OUT: Transition["ease"] = [0.16, 1, 0.3, 1];

export const SPRING_SOFT: Transition = { type: "spring", stiffness: 260, damping: 24 };

export const SPRING_SNAPPY: Transition = { type: "spring", stiffness: 360, damping: 22 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: SPRING_SOFT },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

// Word-by-word headline reveal: wrap each word in an overflow-hidden span and
// let it rise out of the mask. Parent uses wordStagger, words use wordRise.
export const wordStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

export const wordRise: Variants = {
  hidden: { y: "110%" },
  visible: { y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

// Parent wrapper that reveals its children one after another. Children should
// use fadeUp/scaleIn (they inherit hidden/visible from the parent).
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

// whileHover target for cards and tiles.
export const hoverLift = { y: -6, transition: SPRING_SNAPPY } as const;
