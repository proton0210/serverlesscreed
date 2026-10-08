"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./use-trace-player";

/** "3d" only when it helps and the device can take it: no reduced motion, ≥768px wide, WebGL present. */
export function useRendererChoice(): "pending" | "2d" | "3d" {
  const reduced = usePrefersReducedMotion();
  const [capable, setCapable] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const check = () => {
      let webgl = false;
      try {
        const c = document.createElement("canvas");
        webgl = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
      } catch {
        webgl = false;
      }
      setCapable(mq.matches && webgl);
    };
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);
  return capable === null ? "pending" : capable && !reduced ? "3d" : "2d";
}

/** True once the element has come within 200px of the viewport (stays true). */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setInView(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return [ref, inView] as const;
}
