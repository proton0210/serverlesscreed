"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CritterIcon } from "@/components/dynamodb/scene/critter-svg";

const PARADE = ["Fire", "Water", "Grass", "Electric", "Psychic", "Normal", "Rock", "Flying"];

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

type QuestCelebrationProps = {
  active: boolean;
  onFinished?: () => void;
};

export function QuestCelebration({ active, onFinished }: QuestCelebrationProps) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setReduceMotion(motionQuery.matches);
    };

    update();
    window.addEventListener("resize", update);
    motionQuery.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      motionQuery.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => onFinished?.(), reduceMotion ? 500 : 2800);
    return () => window.clearTimeout(timeout);
  }, [active, onFinished, reduceMotion]);

  if (!active || reduceMotion || viewport.width === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden="true">
      <Confetti
        width={viewport.width}
        height={viewport.height}
        recycle={false}
        numberOfPieces={220}
        gravity={0.2}
        initialVelocityY={18}
        tweenDuration={2200}
        colors={["#10a37f", "#65d5ba", "#f4c542", "#ef5350", "#3b82f6", "#ffffff"]}
      />
      {/* The Data Critters hop across the bottom of the screen. */}
      <div className="sc-parade absolute bottom-6 left-0 flex gap-5">
        {PARADE.map((type, i) => (
          <span key={type} style={{ animationDelay: `${i * 90}ms` }} className="sc-parade-hop">
            <CritterIcon type={type} mood="happy" size={56} />
          </span>
        ))}
      </div>
    </div>
  );
}
