import * as THREE from "three";
import { TYPE_COLORS } from "@/lib/dynamodb/pokedex";

/**
 * The Serverless Creed "Data Critters": an original cast, one per type, built from
 * primitives so they stay light (no model files) and brandable. They are deliberately
 * object-and-critter designs (lantern, jellyfish, potted sprout, battery…), not animals
 * that echo any Pokémon.
 *
 * Every creature is ~0.6 units tall, stands on y = 0 and exposes update(t) for idle motion.
 */

export type Creature = { name: string; group: THREE.Group; update: (t: number) => void };

type Mat = THREE.MeshStandardMaterial;
const mat = (color: string | number, o: Partial<THREE.MeshStandardMaterialParameters> = {}): Mat =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, ...o });

const INK = 0x1c1917;

/** Two friendly eyes with highlights; returns the group and a blink function. */
function eyes(spacing: number, size: number, z: number) {
  const g = new THREE.Group();
  const white = mat(0xffffff, { roughness: 0.2 });
  const pupil = mat(INK, { roughness: 0.2 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lids: THREE.Object3D[] = [];
  [-1, 1].forEach((side) => {
    const eye = new THREE.Group();
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), white);
    sclera.scale.z = 0.55;
    const p = new THREE.Mesh(new THREE.SphereGeometry(size * 0.58, 14, 10), pupil);
    p.position.z = size * 0.32;
    p.scale.z = 0.5;
    const s = new THREE.Mesh(new THREE.SphereGeometry(size * 0.2, 8, 6), shine);
    s.position.set(size * 0.22, size * 0.25, size * 0.55);
    eye.add(sclera, p, s);
    eye.position.set(side * spacing, 0, z);
    g.add(eye);
    lids.push(eye);
  });
  const blink = (t: number, seed: number) => {
    const phase = (t * 0.35 + seed) % 4;
    const sy = phase < 0.12 ? Math.max(0.1, Math.abs(phase - 0.06) / 0.06) : 1;
    lids.forEach((l) => (l.scale.y = sy));
  };
  return { g, blink };
}

function feet(color: string | number, spacing: number, y = 0.035) {
  const g = new THREE.Group();
  const m = mat(color);
  [-1, 1].forEach((side) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), m);
    f.scale.set(1, 0.6, 1.3);
    f.position.set(side * spacing, y, 0.03);
    g.add(f);
  });
  return g;
}

/** Fire — "Wick": a little brass lantern with a flame inside and stubby feet. */
function wick(): Creature {
  const g = new THREE.Group();
  const brass = mat(0xb45309, { metalness: 0.6, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.06, 20), brass);
  base.position.y = 0.1;
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.26, 20, 1, true), mat(0xfff7ed, { transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide }));
  glass.position.y = 0.26;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.12, 20), brass);
  cap.position.y = 0.45;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16), brass);
  ring.position.y = 0.54;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 12), mat(0xfb923c, { emissive: 0xf97316, emissiveIntensity: 1.4 }));
  flame.position.y = 0.25;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), mat(0xfde047, { emissive: 0xfde047, emissiveIntensity: 1.6 }));
  core.position.y = 0.21;
  const e = eyes(0.06, 0.035, 0.19);
  e.g.position.y = 0.13;
  g.add(base, glass, cap, ring, flame, core, e.g, feet(0x92400e, 0.1));
  return {
    name: "Wick",
    group: g,
    update: (t) => {
      const f = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.05;
      flame.scale.set(1 / f, f, 1 / f);
      (flame.material as Mat).emissiveIntensity = 1.2 + (f - 1) * 4;
      e.blink(t, 0.3);
    },
  };
}

/** Water — "Bloop": a soft jellyfish dome with swaying ribbon tentacles. */
function bloop(): Creature {
  const g = new THREE.Group();
  const body = mat(0x60a5fa, { transparent: true, opacity: 0.85, roughness: 0.15, emissive: 0x1d4ed8, emissiveIntensity: 0.15 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), body);
  dome.position.y = 0.34;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 32), body);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.34;
  const tentacles: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.2, 4, 8), mat(0x93c5fd, { transparent: true, opacity: 0.8 }));
    t.position.set(Math.cos(a) * 0.11, 0.2, Math.sin(a) * 0.11);
    tentacles.push(t);
    g.add(t);
  }
  const e = eyes(0.07, 0.035, 0.16);
  e.g.position.y = 0.41;
  g.add(dome, rim, e.g);
  return {
    name: "Bloop",
    group: g,
    update: (t) => {
      tentacles.forEach((m, i) => (m.rotation.z = Math.sin(t * 2.4 + i) * 0.3));
      dome.scale.y = 1 + Math.sin(t * 2.4) * 0.05;
      e.blink(t, 1.1);
    },
  };
}

/** Grass — "Sprig": a terracotta pot with a face and a two-leaf sprout. */
function sprig(): Creature {
  const g = new THREE.Group();
  const clay = mat(0xc2410c, { roughness: 0.8 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.26, 20), clay);
  pot.position.y = 0.13;
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 20), clay);
  lip.position.y = 0.27;
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 20), mat(0x44403c, { roughness: 1 }));
  soil.position.y = 0.295;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.16, 8), mat(0x16a34a));
  stem.position.y = 0.37;
  const sprout = new THREE.Group();
  sprout.position.y = 0.44;
  [-1, 1].forEach((side) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 10), mat(side < 0 ? 0x4ade80 : 0x22c55e));
    leaf.scale.set(1.3, 0.25, 0.7);
    leaf.position.x = side * 0.08;
    leaf.rotation.z = side * 0.4;
    sprout.add(leaf);
  });
  const e = eyes(0.06, 0.032, 0.155);
  e.g.position.y = 0.15;
  g.add(pot, lip, soil, stem, sprout, e.g);
  return {
    name: "Sprig",
    group: g,
    update: (t) => {
      sprout.rotation.z = Math.sin(t * 1.8) * 0.15;
      sprout.rotation.y = Math.sin(t * 0.9) * 0.4;
      e.blink(t, 2.2);
    },
  };
}

/** Electric — "Amp": a battery cell with a + cap, little arms and crackling sparks. */
function amp(): Creature {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.36, 24), mat(0x1c1917, { metalness: 0.4, roughness: 0.3 }));
  body.position.y = 0.24;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.142, 0.14, 24), mat(0xfacc15, { metalness: 0.3, roughness: 0.3 }));
  band.position.y = 0.33;
  const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16), mat(0xd6d3d1, { metalness: 0.8, roughness: 0.2 }));
  nub.position.y = 0.445;
  const plusMat = mat(0x1c1917);
  const plusA = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.01), plusMat);
  const plusB = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.07, 0.01), plusMat);
  [plusA, plusB].forEach((m) => m.position.set(0, 0.34, 0.143));
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true });
  const sparks: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), sparkMat);
    s.position.set(Math.cos(i * 2.1) * 0.2, 0.46 + i * 0.02, Math.sin(i * 2.1) * 0.2);
    sparks.push(s);
    g.add(s);
  }
  const arms = [-1, 1].map((side) => {
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.08, 4, 8), mat(0x44403c));
    a.position.set(side * 0.17, 0.22, 0);
    a.rotation.z = side * 0.6;
    g.add(a);
    return a;
  });
  const e = eyes(0.055, 0.03, 0.135);
  e.g.position.y = 0.2;
  g.add(body, band, nub, plusA, plusB, e.g, feet(0x44403c, 0.08));
  return {
    name: "Amp",
    group: g,
    update: (t) => {
      sparks.forEach((s, i) => {
        s.visible = Math.sin(t * 17 + i * 3) > 0.2;
        s.rotation.y = t * 6;
      });
      arms.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * (0.6 + Math.sin(t * 3 + i) * 0.25)));
      e.blink(t, 0.7);
    },
  };
}

/** Psychic — "Orbi": a floating pearl with one big eye and a slow halo ring. */
function orbi(): Creature {
  const g = new THREE.Group();
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 20), mat(0xf5d0fe, { roughness: 0.15, metalness: 0.15, emissive: 0xc026d3, emissiveIntensity: 0.12 }));
  pearl.position.y = 0.32;
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.014, 8, 48), mat(0xf472b6, { emissive: 0xdb2777, emissiveIntensity: 0.6 }));
  halo.position.y = 0.32;
  halo.rotation.x = 1.2;
  const eye = new THREE.Group();
  const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 14), mat(0xffffff, { roughness: 0.2 }));
  sclera.scale.z = 0.5;
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), mat(0x7c3aed, { roughness: 0.2 }));
  iris.position.z = 0.025;
  iris.scale.z = 0.5;
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), mat(INK));
  pupil.position.z = 0.04;
  eye.add(sclera, iris, pupil);
  eye.position.set(0, 0.34, 0.15);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.12 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  g.add(pearl, halo, eye, shadow);
  return {
    name: "Orbi",
    group: g,
    update: (t) => {
      const lift = Math.sin(t * 1.6) * 0.04;
      pearl.position.y = 0.32 + lift;
      halo.position.y = 0.32 + lift;
      eye.position.y = 0.34 + lift;
      halo.rotation.z = t * 0.8;
      eye.rotation.y = Math.sin(t * 0.7) * 0.4;
      eye.scale.y = (t * 0.35 + 1.7) % 4 < 0.12 ? 0.15 : 1;
    },
  };
}

/** Normal — "Crate": a cheerful cardboard box with a taped lid and waving flaps. */
function crate(): Creature {
  const g = new THREE.Group();
  const card = mat(0xd6b370, { roughness: 0.9 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.26), card);
  box.position.y = 0.17;
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.005, 0.265), mat(0xfef3c7, { roughness: 0.4 }));
  tape.position.y = 0.302;
  const flaps = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.15, 0.3, 0);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.26), card);
    flap.position.x = side * 0.05;
    pivot.add(flap);
    g.add(pivot);
    return pivot;
  });
  const e = eyes(0.06, 0.032, 0.13);
  e.g.position.y = 0.19;
  const blush = mat(0xfca5a5, { roughness: 0.6 });
  [-1, 1].forEach((side) => {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), blush);
    b.position.set(side * 0.1, 0.14, 0.131);
    g.add(b);
  });
  g.add(box, tape, e.g, feet(0xa16207, 0.09));
  return {
    name: "Crate",
    group: g,
    update: (t) => {
      flaps.forEach((f, i) => (f.rotation.z = (i ? -1 : 1) * (0.25 + Math.max(0, Math.sin(t * 2.2 + i)) * 0.5)));
      e.blink(t, 3.1);
    },
  };
}

/** Rock — "Cairn": three stacked stones that wobble, with a face on the middle stone. */
function cairn(): Creature {
  const g = new THREE.Group();
  const stones = [
    { r: 0.17, y: 0.1, c: 0x78716c },
    { r: 0.14, y: 0.27, c: 0xa8a29e },
    { r: 0.09, y: 0.41, c: 0x57534e },
  ].map(({ r, y, c }) => {
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat(c, { roughness: 0.95, flatShading: true }));
    s.scale.y = 0.62;
    s.position.y = y;
    g.add(s);
    return s;
  });
  const e = eyes(0.05, 0.028, 0.125);
  e.g.position.y = 0.28;
  g.add(e.g);
  return {
    name: "Cairn",
    group: g,
    update: (t) => {
      stones.forEach((s, i) => (s.rotation.z = Math.sin(t * 1.3 + i * 0.9) * 0.05 * (i + 1)));
      e.g.rotation.z = stones[1].rotation.z;
      e.blink(t, 2.8);
    },
  };
}

/** Flying — "Kite": a diamond paper kite with a face and a fluttering ribbon tail. */
function kite(): Creature {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.2);
  shape.lineTo(0.15, 0);
  shape.lineTo(0, -0.24);
  shape.lineTo(-0.15, 0);
  shape.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat(0xa5b4fc, { side: THREE.DoubleSide, roughness: 0.6 }));
  const spar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.008, 0.008), mat(0x78350f));
  const spar2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.44, 0.008), spar.material);
  spar2.position.y = -0.02;
  const body = new THREE.Group();
  body.add(sail, spar, spar2);
  body.position.y = 0.4;
  const e = eyes(0.045, 0.026, 0.01);
  e.g.position.y = 0.02;
  body.add(e.g);
  const bows = Array.from({ length: 4 }, (_, i) => {
    const bow = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), mat(i % 2 ? 0xf472b6 : 0xfacc15));
    bow.scale.set(1.4, 0.6, 0.4);
    g.add(bow);
    return bow;
  });
  g.add(body);
  return {
    name: "Kite",
    group: g,
    update: (t) => {
      body.rotation.z = Math.sin(t * 1.7) * 0.12;
      body.position.y = 0.4 + Math.sin(t * 2.1) * 0.03;
      bows.forEach((b, i) => b.position.set(Math.sin(t * 3 - i * 0.8) * 0.04 * (i + 1), 0.15 - i * 0.045, 0));
      e.blink(t, 1.9);
    },
  };
}

/** Other types — "Mote": a round, softly glowing puffball tinted with the type colour. */
function mote(type: string): Creature {
  const g = new THREE.Group();
  const color = TYPE_COLORS[type] ?? "#fde68a";
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 2), mat(color, { roughness: 0.7, flatShading: true, emissive: color, emissiveIntensity: 0.12 }));
  ball.position.y = 0.2;
  const e = eyes(0.06, 0.032, 0.15);
  e.g.position.y = 0.22;
  g.add(ball, e.g, feet(color, 0.08));
  return {
    name: "Mote",
    group: g,
    update: (t) => {
      const s = 1 + Math.sin(t * 2.6) * 0.04;
      ball.scale.set(s, 2 - s, s);
      e.blink(t, 0.5);
    },
  };
}

const BY_TYPE: Record<string, () => Creature> = {
  Fire: wick,
  Water: bloop,
  Grass: sprig,
  Electric: amp,
  Psychic: orbi,
  Normal: crate,
  Rock: cairn,
  Flying: kite,
};

export function makeCreature(type: string): Creature {
  const c = (BY_TYPE[type] ?? (() => mote(type)))();
  c.group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
  });
  return c;
}

/** The cast, in lineup order, for previews and docs. */
export const CREATURE_TYPES = ["Fire", "Water", "Grass", "Electric", "Psychic", "Normal", "Rock", "Flying", "Bug"] as const;
