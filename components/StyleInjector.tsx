"use client";

import { useEffect } from "react";
import { criticalStyles } from "@/app/critical-styles";

export function StyleInjector() {
  useEffect(() => {
    const id = "clearspeak-critical-styles";
    const existing = document.getElementById(id);
    if (existing) {
      existing.textContent = criticalStyles;
      return;
    }

    const style = document.createElement("style");
    style.id = id;
    style.textContent = criticalStyles;
    document.head.appendChild(style);
  }, []);

  return null;
}
