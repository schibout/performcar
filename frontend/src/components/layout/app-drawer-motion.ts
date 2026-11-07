// Motion variants for the mobile drawer. Kept in a non-component module so
// the component files stay fast-refresh friendly.

import { EASE_OUT } from "@/lib/motion/variants";

import type { Variants } from "motion/react";

// Drawer contents remount on every open (destroyOnHidden), so this stagger
// replays each time the menu slides in.
export const drawerList: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

export const drawerItem: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};
