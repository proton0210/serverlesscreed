import type { ReactNode } from "react";
import { TYPE_COLORS } from "@/lib/dynamodb/pokedex";

/**
 * Flat vector Data Critters, matching the 3D cast in creatures.ts. Drawn in a 64×64 box.
 * Micro-animations (bob, blink, flicker, sway, hop, shake) live in app/globals.css and
 * switch off automatically for reduced motion.
 */
export type CritterMood = "idle" | "happy" | "worried" | "curious";

const INK = "#1c1917";

function Eyes({ y, gap = 7, r = 3.4 }: { y: number; gap?: number; r?: number }) {
  return (
    <g>
      {[-1, 1].map((s) => (
        <g key={s} className="sc-c-eye">
          <ellipse cx={32 + s * gap} cy={y} rx={r} ry={r * 1.1} fill="#fff" />
          <circle cx={32 + s * gap} cy={y + 0.4} r={r * 0.62} fill={INK} />
          <circle cx={32 + s * gap + r * 0.3} cy={y - r * 0.35} r={r * 0.22} fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Mouth({ y, mood }: { y: number; mood: CritterMood }) {
  if (mood === "happy") return <path d={`M28 ${y} Q32 ${y + 5} 36 ${y}`} fill="#7f1d1d" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />;
  if (mood === "worried") return <path d={`M28 ${y + 2} q2 -2 4 0 t4 0`} fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />;
  if (mood === "curious") return <circle cx="32" cy={y + 1} r="1.6" fill={INK} />;
  return <path d={`M29.5 ${y} Q32 ${y + 2.4} 34.5 ${y}`} fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />;
}

function Feet({ color, y = 58, gap = 8 }: { color: string; y?: number; gap?: number }) {
  return (
    <g>
      {[-1, 1].map((s) => (
        <ellipse key={s} cx={32 + s * gap} cy={y} rx="5" ry="3" fill={color} />
      ))}
    </g>
  );
}

function Sweat({ x, y }: { x: number; y: number }) {
  return <path className="sc-c-sweat" d={`M${x} ${y} q2 3 0 5 q-2 -2 0 -5`} fill="#7dd3fc" />;
}

type Parts = { body: ReactNode; faceY: number; eyeGap?: number; sweat: [number, number] };

function parts(type: string, mood: CritterMood): Parts {
  switch (type) {
    case "Fire": // Wick — lantern
      return {
        faceY: 50,
        sweat: [46, 30],
        body: (
          <>
            <Feet color="#92400e" y={60} />
            <rect x="18" y="47" width="28" height="11" rx="4" fill="#b45309" />
            <rect x="21" y="24" width="22" height="23" rx="3" fill="#fff7ed" stroke="#b45309" strokeWidth="1.5" />
            <path className="sc-c-flame" d="M32 27 C27 34 28 42 32 44 C36 42 37 34 32 27 Z" fill="#fb923c" />
            <path className="sc-c-flame" d="M32 34 C30 38 30 42 32 43 C34 42 34 38 32 34 Z" fill="#fde047" />
            <path d="M16 25 L32 13 L48 25 Z" fill="#b45309" />
            <circle cx="32" cy="10" r="3.2" fill="none" stroke="#b45309" strokeWidth="1.8" />
          </>
        ),
      };
    case "Water": // Bloop — jellyfish
      return {
        faceY: 28,
        sweat: [46, 14],
        body: (
          <>
            <g className="sc-c-sway">
              {[22, 28, 34, 40].map((x, i) => (
                <path key={x} d={`M${x} 36 q${i % 2 ? 3 : -3} 8 0 14 q${i % 2 ? -3 : 3} 5 0 9`} fill="none" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
              ))}
            </g>
            <path d="M12 37 C12 18 52 18 52 37 Z" fill="#60a5fa" />
            <rect x="11" y="34" width="42" height="5" rx="2.5" fill="#3b82f6" />
            <ellipse cx="24" cy="24" rx="5" ry="2.5" fill="#fff" opacity=".35" />
          </>
        ),
      };
    case "Grass": // Sprig — potted sprout
      return {
        faceY: 44,
        sweat: [48, 34],
        body: (
          <>
            <g className="sc-c-leaf">
              <path d="M32 30 L32 20" stroke="#16a34a" strokeWidth="2.2" />
              <ellipse cx="25" cy="17" rx="8" ry="3.4" transform="rotate(-22 25 17)" fill="#4ade80" />
              <ellipse cx="39" cy="17" rx="8" ry="3.4" transform="rotate(22 39 17)" fill="#22c55e" />
            </g>
            <path d="M18 34 L46 34 L42 58 L22 58 Z" fill="#c2410c" />
            <rect x="15" y="30" width="34" height="6" rx="2" fill="#ea580c" />
            <rect x="18" y="29" width="28" height="2.4" rx="1.2" fill="#44403c" />
          </>
        ),
      };
    case "Electric": // Amp — battery
      return {
        faceY: 42,
        sweat: [48, 22],
        body: (
          <>
            <Feet color="#44403c" y={60} />
            <path d="M16 36 q-6 2 -7 8" stroke="#44403c" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M48 36 q6 2 7 8" stroke="#44403c" strokeWidth="3" fill="none" strokeLinecap="round" />
            <rect x="26" y="10" width="12" height="5" rx="1.5" fill="#d6d3d1" />
            <rect x="17" y="14" width="30" height="44" rx="6" fill="#1c1917" />
            <rect x="17" y="18" width="30" height="13" fill="#facc15" />
            <path d="M32 21 v7 M28.5 24.5 h7" stroke="#1c1917" strokeWidth="2" />
            <path className="sc-c-spark" d="M50 12 l3 4 -3 0 3 5" stroke="#facc15" strokeWidth="1.8" fill="none" />
            <path className="sc-c-spark" style={{ animationDelay: ".6s" }} d="M12 14 l-3 4 3 0 -3 5" stroke="#facc15" strokeWidth="1.8" fill="none" />
          </>
        ),
      };
    case "Psychic": // Orbi — floating pearl with one eye
      return {
        faceY: -1,
        sweat: [48, 18],
        body: (
          <>
            <ellipse cx="32" cy="60" rx="10" ry="2" fill={INK} opacity=".12" />
            <circle cx="32" cy="30" r="17" fill="#f5d0fe" />
            <ellipse cx="32" cy="30" rx="26" ry="7" fill="none" stroke="#f472b6" strokeWidth="2.4" transform="rotate(-12 32 30)" />
            <g className="sc-c-eye">
              <ellipse cx="32" cy="29" rx="8" ry="8.5" fill="#fff" />
              <circle cx="32" cy="30" r="5" fill="#7c3aed" />
              <circle cx="32" cy="30" r="2.4" fill={INK} />
              <circle cx="34" cy="27.5" r="1.2" fill="#fff" />
            </g>
            {mood !== "idle" && <Mouth y={41} mood={mood} />}
          </>
        ),
      };
    case "Normal": // Crate — cardboard box
      return {
        faceY: 38,
        sweat: [50, 26],
        body: (
          <>
            <Feet color="#a16207" y={60} />
            <path className="sc-c-leaf" d="M14 26 L4 20 L14 22 Z" fill="#c9a45c" />
            <path className="sc-c-leaf" style={{ animationDelay: ".4s" }} d="M50 26 L60 20 L50 22 Z" fill="#c9a45c" />
            <rect x="14" y="24" width="36" height="34" rx="3" fill="#d6b370" />
            <rect x="29" y="24" width="6" height="8" fill="#fef3c7" />
            <circle cx="21" cy="44" r="2.6" fill="#fca5a5" />
            <circle cx="43" cy="44" r="2.6" fill="#fca5a5" />
          </>
        ),
      };
    case "Rock": // Cairn — stacked stones
      return {
        faceY: 38,
        sweat: [46, 26],
        body: (
          <>
            <ellipse cx="32" cy="53" rx="18" ry="7.5" fill="#78716c" />
            <ellipse cx="32" cy="38" rx="14" ry="7.5" fill="#a8a29e" />
            <ellipse cx="33" cy="24" rx="9" ry="5" fill="#57534e" />
          </>
        ),
      };
    case "Flying": // Kite
      return {
        faceY: 26,
        sweat: [46, 18],
        body: (
          <>
            <g className="sc-c-sway" style={{ transformOrigin: "50% 0%" }}>
              <path d="M32 44 q-4 4 0 8 q4 4 0 8" fill="none" stroke="#f472b6" strokeWidth="1.5" />
              <path d="M29 50 l3 -2 3 2 -3 2 Z" fill="#facc15" />
              <path d="M29 58 l3 -2 3 2 -3 2 Z" fill="#f472b6" />
            </g>
            <path d="M32 6 L48 26 L32 46 L16 26 Z" fill="#a5b4fc" stroke="#6366f1" strokeWidth="1.2" />
            <path d="M32 6 V46 M16 26 H48" stroke="#78350f" strokeWidth="1" />
          </>
        ),
      };
    default: {
      // Mote — puffball in the type colour
      const color = TYPE_COLORS[type] ?? "#a3e635";
      return {
        faceY: 34,
        sweat: [48, 20],
        body: (
          <>
            <Feet color={color} y={58} gap={9} />
            <circle cx="32" cy="36" r="19" fill={color} />
            <circle cx="25" cy="28" r="5" fill="#fff" opacity=".3" />
          </>
        ),
      };
    }
  }
}

export const CRITTER_NAMES: Record<string, string> = {
  Fire: "Wick",
  Water: "Bloop",
  Grass: "Sprig",
  Electric: "Amp",
  Psychic: "Orbi",
  Normal: "Crate",
  Rock: "Cairn",
  Flying: "Kite",
};
export const critterName = (type: string) => CRITTER_NAMES[type] ?? "Mote";

/** The critter as an SVG <g> in a 64×64 box, for use inside other SVGs. */
export function CritterGlyph({ type, mood = "idle", x = 0, y = 0, size = 64 }: { type: string; mood?: CritterMood; x?: number; y?: number; size?: number }) {
  const p = parts(type, mood);
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 64})`}>
      <g className={`sc-critter is-${mood}`}>
        <g className="sc-c-body">
          {p.body}
          {p.faceY > 0 && (
            <>
              <Eyes y={p.faceY - 3} gap={p.eyeGap} />
              <Mouth y={p.faceY + 3} mood={mood} />
            </>
          )}
          {mood === "worried" && <Sweat x={p.sweat[0]} y={p.sweat[1]} />}
        </g>
      </g>
    </g>
  );
}

/** Standalone critter icon for HTML contexts. */
export function CritterIcon({ type, mood = "idle", size = 32, className = "", title }: { type: string; mood?: CritterMood; size?: number; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`shrink-0 overflow-visible ${className}`} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <CritterGlyph type={type} mood={mood} />
    </svg>
  );
}
