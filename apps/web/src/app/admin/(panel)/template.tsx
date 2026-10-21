"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Re-mounts on every admin navigation: fade with a slight slide. */
export default function AdminTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
