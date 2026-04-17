"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { getSectionVariants } from "./motion";

export function SectionPanel({
  children,
  direction,
  panelKey,
}: {
  children: ReactNode;
  direction: number;
  panelKey: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.section
      key={panelKey}
      animate="animate"
      className="space-y-5"
      custom={direction}
      exit="exit"
      initial="initial"
      variants={getSectionVariants(Boolean(reducedMotion))}
    >
      {children}
    </motion.section>
  );
}
