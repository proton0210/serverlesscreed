"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { TEACHING_PARTITIONS, type ClientId, type TraceEvent } from "@/lib/dynamodb/trace";
import { awsIconHref } from "./aws-icon";
import { dexLabel, findPokemon, typeColor } from "@/lib/dynamodb/pokedex";
import licensedModels from "@/lib/dynamodb/pokemon-models.json";
import { makeCreature, type Creature } from "./creatures";

/**
 * Optional licensed 3D models: map a Pokémon name to a .glb under public/models/, e.g.
 * { "Pikachu": "/models/pikachu.glb" }. Only add assets you hold a licence for.
 * Without an entry, the card shows its type's original Data Critter (see creatures.ts).
 */
const MODELS = licensedModels as Record<string, string>;

export type TraceScene3DProps = {
  events: TraceEvent[];
  index: number;
  stepMs: number;
  /** Partitions to draw as hot (pulsing red). */
  hot?: number[];
  color?: (name: string) => string;
  subtitle?: (name: string) => string;
  /** Called when the frame rate stays under 30 fps for 3 s, so the parent can fall back to 2D. */
  onSlow?: () => void;
};

type Tween = { obj: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3; ms: number; arc: number; t0: number; done?: () => void };

type Shelf = { group: THREE.Group; base: THREE.Mesh; edges: THREE.LineSegments; glass: THREE.Mesh; hot: boolean; flash: number };

type Stage = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  rig: THREE.Group;
  cards: Map<string, THREE.Mesh>;
  temp: THREE.Object3D[];
  counts: number[];
  slotOf: Map<string, number>;
  shelves: Shelf[];
  clients: Record<ClientId | "app", THREE.Mesh>;
  entry: THREE.Mesh;
  hashLabel: THREE.Sprite;
  ring: THREE.Mesh;
  ring2: THREE.Mesh;
  core: THREE.Mesh;
  gate: { color: THREE.Color; strength: number };
  tweens: Tween[];
  /** Short-lived effects: hop trails and landing bursts. */
  fx: { obj: THREE.Object3D; t0: number; life: number; grow: number }[];
  /** The Data Critter (or licensed model) riding on each card, and card order per shelf. */
  emblems: Map<string, Creature>;
  /** Short-lived critter reactions: hop on landing, cheer on success, shake on lost data. */
  reactions: Map<string, { kind: "hop" | "cheer" | "shake" | "look"; t0: number }>;
  stacks: string[][];
  partitionOf: Map<string, number>;
  /** Where the camera eases its gaze (x), following the active partition. */
  focusX: number;
  spin: number;
  dispose: () => void;
};

const INK = 0x1c1917;
const HOT = 0xdc2626;
const OK = 0x16a34a;
const CLIENT_POS: Record<ClientId | "app", THREE.Vector3> = {
  app: new THREE.Vector3(-5.9, 0.6, 3.4),
  A: new THREE.Vector3(-5.9, 0.6, 4.3),
  B: new THREE.Vector3(-5.9, 0.6, 1.9),
};
const ENTRY = new THREE.Vector3(-2.9, 1.25, 3.4);
const MACHINE = new THREE.Vector3(0.6, 2.35, 3.3);
const SHELF_X = (p: number) => -4.5 + p * 3;
const SHELF_Z = -1.4;
const TYPE_DEFAULT = "#fde68a";

function textTexture(lines: string[], o: { w?: number; h?: number; bg?: string; fg?: string; size?: number; mono?: boolean } = {}) {
  const { w = 256, h = 128, bg, fg = "#1c1917", size = 34, mono = false } = o;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d")!;
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#1c1917";
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
  }
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  lines.forEach((line, i) => {
    const sz = i === 0 ? size : Math.round(size * 0.62);
    g.font = `${i === 0 ? 800 : 600} ${sz}px ${mono || i > 0 ? "ui-monospace, Menlo, monospace" : "Inter, system-ui, sans-serif"}`;
    let text = line;
    while (g.measureText(text).width > w - 24 && text.length > 4) text = text.slice(0, -2) + "…";
    g.fillText(text, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.05);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function faceMaterials(color: number | string, front?: THREE.Texture, faceIndex = 4) {
  return Array.from(
    { length: 6 },
    (_, i) => new THREE.MeshStandardMaterial({ color: i === faceIndex && front ? 0xffffff : color, map: i === faceIndex ? front ?? null : null, roughness: 0.55, metalness: 0.04 }),
  );
}

function clientsIn(events: TraceEvent[]): (ClientId | "app")[] {
  const set = new Set<ClientId | "app">();
  events.forEach((e) => (e.t === "request" || e.t === "write") && set.add(e.client ?? "app"));
  const list = Array.from(set);
  return list.length ? list : ["app"];
}

function buildStage(canvas: HTMLCanvasElement, events: TraceEvent[]): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const rig = new THREE.Group();
  scene.add(rig);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b2a6, 1.1));
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sun = new THREE.DirectionalLight(0xffffff, 0.6);
  sun.position.set(4, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(19, 11), new THREE.MeshBasicMaterial({ color: 0xd6d3d1, transparent: true, opacity: 0.35 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.01, 0.6);
  rig.add(floor);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(19, 11), new THREE.ShadowMaterial({ opacity: 0.16 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.set(0, 0, 0.6);
  shadowCatcher.receiveShadow = true;
  rig.add(shadowCatcher);

  const present = clientsIn(events);
  const clients = {} as Stage["clients"];
  (["app", "A", "B"] as const).forEach((id) => {
    const label = id === "app" ? "Your app" : id === "A" ? "Ash" : "Gary";
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.2, 1.2, 3, 0.08), faceMaterials(0xffffff, textTexture([label, "AWS SDK v3"], { bg: "#ffffff", size: 40 })));
    mesh.position.copy(CLIENT_POS[id]);
    mesh.visible = present.includes(id);
    mesh.castShadow = true;
    rig.add(mesh);
    clients[id] = mesh;
  });

  const firstReq = events.find((e) => e.t === "request") as Extract<TraceEvent, { t: "request" }> | undefined;
  const entry = new THREE.Mesh(
    new RoundedBoxGeometry(2.4, 0.9, 1.2, 3, 0.08),
    faceMaterials(0x3b48cc, textTexture(["DynamoDB", firstReq?.index ?? firstReq?.table ?? "table"], { w: 384, h: 144, bg: "#3b48cc", fg: "#ffffff", size: 42 })),
  );
  entry.position.set(-2.9, 0.45, 3.4);
  entry.castShadow = true;
  rig.add(entry);
  const iconHref = awsIconHref("dynamodb");
  if (iconHref) {
    new THREE.TextureLoader().load(iconHref, (tex) => {
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      icon.scale.set(0.7, 0.7, 1);
      icon.position.set(-2.9, 1.35, 3.4);
      rig.add(icon);
    });
  }

  // The Hash Engine: a slate pedestal holding a glass orb with a glowing crystal core and
  // gyroscope rings. It spins up while hashing and glows green/red on conditions.
  const machine = new THREE.Group();
  machine.position.set(0.6, 0, 3.3);
  machine.scale.setScalar(1.3);
  rig.add(machine);
  const slate = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.55 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.9 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.22, 1.1, 3, 0.08), slate);
  base.position.y = 0.11;
  base.castShadow = true;
  base.receiveShadow = true;
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 48), new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.2 }));
  trim.rotation.x = -Math.PI / 2;
  trim.position.y = 0.225;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.55, 32), steel);
  column.position.y = 0.5;
  column.castShadow = true;
  const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 12, 48, Math.PI), steel);
  cradle.rotation.z = Math.PI;
  cradle.position.y = 1.2;
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 40, 28),
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, emissive: 0x0e7490, emissiveIntensity: 0.12, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.2, depthWrite: false }),
  );
  orb.position.y = 1.2;
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 1.1, roughness: 0.15, flatShading: true }));
  core.position.y = 1.2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.018, 12, 64), new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x000000, roughness: 0.2, metalness: 0.6 }));
  ring.position.y = 1.2;
  ring.rotation.x = 1.1;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.014, 12, 64), new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.6 }));
  ring2.position.y = 1.2;
  ring2.rotation.z = 0.9;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.13), new THREE.MeshBasicMaterial({ map: textTexture(["HASH ENGINE"], { w: 512, h: 104, bg: "#0f172a", fg: "#67e8f9", size: 50, mono: true }), transparent: true }));
  plate.position.set(0, 0.11, 0.556);
  const glow = new THREE.PointLight(0x22d3ee, 0.9, 2.2);
  glow.position.y = 1.2;
  machine.add(base, trim, column, cradle, orb, core, ring, ring2, plate, glow);

  const hashLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(["hash(partition key)"], { w: 512, h: 96, size: 32 }), transparent: true, depthTest: false }));
  hashLabel.scale.set(3.4, 0.64, 1);
  hashLabel.position.set(3.6, 0.35, 4.4);
  hashLabel.renderOrder = 10;
  rig.add(hashLabel);

  const shelves: Shelf[] = [];
  for (let p = 0; p < TEACHING_PARTITIONS; p++) {
    const group = new THREE.Group();
    group.position.set(SHELF_X(p), 0, SHELF_Z);
    rig.add(group);
    const base = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.12, 1.5, 2, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }));
    base.receiveShadow = true;
    base.position.y = 0.06;
    group.add(base);
    const box = new THREE.BoxGeometry(2.4, 3.4, 1.5);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: INK }));
    edges.position.y = 1.7;
    group.add(edges);
    const glass = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: HOT, transparent: true, opacity: 0, depthWrite: false }));
    glass.position.y = 1.7;
    group.add(glass);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture([`P${p}`], { w: 128, h: 96, size: 54, mono: true }), transparent: true, depthTest: false }));
    label.scale.set(0.9, 0.68, 1);
    label.position.set(0, 3.85, 0);
    group.add(label);
    shelves.push({ group, base, edges, glass, hot: false, flash: 0 });
  }

  return {
    renderer,
    scene,
    rig,
    cards: new Map(),
    temp: [],
    counts: Array(TEACHING_PARTITIONS).fill(0),
    slotOf: new Map(),
    shelves,
    clients,
    entry,
    hashLabel,
    ring,
    ring2,
    core,
    gate: { color: new THREE.Color(OK), strength: 0 },
    tweens: [],
    fx: [],
    emblems: new Map(),
    reactions: new Map(),
    stacks: Array.from({ length: TEACHING_PARTITIONS }, () => []),
    partitionOf: new Map(),
    focusX: 0,
    spin: 0,
    dispose: () => {
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        mats.forEach((m) => {
          (m as THREE.MeshBasicMaterial).map?.dispose();
          m.dispose();
        });
      });
      renderer.dispose();
    },
  };
}

const keyName = (e: Extract<TraceEvent, { t: "request" }>) => String(e.key?.Name ?? Object.values(e.key ?? {})[0] ?? `__orb:${e.op}`);
const isOrb = (name: string) => name.startsWith("__orb:");
const baseName = (name: string) => name.replace(/\s*\(.*\)$/, "");

/**
 * Three.js renderer for any trace: request packets travel from the client through the
 * hash machine to partition shelves. Loaded lazily; TraceScene2D is always the fallback.
 */
export default function TraceScene3D({ events, index, stepMs, hot = [], color, subtitle, onSlow }: TraceScene3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const shownRef = useRef(-1);
  const currentRef = useRef<{ name: string; client: ClientId | "app" }>({ name: "", client: "app" });
  const propsRef = useRef({ color, subtitle, onSlow });
  propsRef.current = { color, subtitle, onSlow };

  // (Re)build the stage whenever the trace changes shape (clients, table label).
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    let stage: Stage;
    try {
      stage = buildStage(canvas, events);
    } catch {
      propsRef.current.onSlow?.();
      return;
    }
    stageRef.current = stage;
    shownRef.current = -1;
    const camera = new THREE.PerspectiveCamera(38, 16 / 10, 0.1, 100);

    let yaw = 0;
    let targetYaw = 0;
    let drag: { x: number; yaw: number } | null = null;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, yaw: targetYaw };
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (drag) targetYaw = Math.max(-0.6, Math.min(0.6, drag.yaw + (e.clientX - drag.x) * 0.004));
    };
    const up = () => (drag = null);
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") targetYaw = Math.max(-0.6, targetYaw - 0.1);
      if (e.key === "ArrowRight") targetYaw = Math.min(0.6, targetYaw + 0.1);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("keydown", key);

    let lookX = 0;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      if (!r.width) return;
      stage.renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      const narrow = camera.aspect < 1.3;
      camera.position.set(0.4, narrow ? 11 : 9, narrow ? 17.5 : 15.6);
      camera.lookAt(lookX, 1, 0.8);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    let raf = 0;
    let slowSince = 0;
    let lastFrame = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const fps = 1000 / Math.max(1, now - lastFrame);
      lastFrame = now;
      if (fps < 30 && document.visibilityState === "visible") {
        if (!slowSince) slowSince = now;
        else if (now - slowSince > 3000) {
          propsRef.current.onSlow?.();
          slowSince = Infinity;
        }
      } else if (slowSince !== Infinity) slowSince = 0;

      yaw += (targetYaw - yaw) * 0.12;
      stage.rig.rotation.y = yaw;
      stage.spin *= 0.93;
      stage.gate.strength *= 0.97;
      (stage.ring.material as THREE.MeshStandardMaterial).emissive.copy(stage.gate.color).multiplyScalar(stage.gate.strength);
      const pulse = (Math.sin(now / 260) + 1) / 2;
      stage.shelves.forEach((s) => {
        s.flash *= 0.95;
        const glass = s.glass.material as THREE.MeshBasicMaterial;
        glass.color.set(s.hot ? HOT : 0x22d3ee);
        glass.opacity = s.hot ? 0.1 + pulse * 0.14 : s.flash * 0.22;
      });
      stage.emblems.forEach((critter, key) => {
        if (!critter.group.visible) return;
        const t = now / 1000 + key.length * 0.7;
        critter.update(t);
        const g = critter.group;
        let y = 0.1;
        let sx = 1;
        let sy = 1;
        let rz = 0;
        let ry = Math.sin(t * 0.6) * 0.4;
        const r = stage.reactions.get(key);
        if (r) {
          const dur = r.kind === "cheer" ? 1100 : r.kind === "shake" ? 900 : 650;
          const k = (now - r.t0) / dur;
          if (k >= 1) stage.reactions.delete(key);
          else if (k >= 0) {
            if (r.kind === "hop" || r.kind === "cheer") {
              const hops = r.kind === "cheer" ? 2 : 1;
              const phase = (k * hops) % 1;
              y += Math.sin(Math.PI * phase) * (r.kind === "cheer" ? 0.45 : 0.32);
              // Squash on take-off and landing, stretch in the air.
              const squash = phase < 0.15 ? 1 - phase / 0.15 : phase > 0.85 ? (phase - 0.85) / 0.15 : 0;
              sx = 1 + squash * 0.18 - Math.sin(Math.PI * phase) * 0.06;
              sy = 1 - squash * 0.2 + Math.sin(Math.PI * phase) * 0.1;
              if (r.kind === "cheer") ry = k * Math.PI * 2;
            } else if (r.kind === "shake") {
              rz = Math.sin(k * Math.PI * 7) * 0.35 * (1 - k);
            } else if (r.kind === "look") {
              ry = Math.sin(k * Math.PI) * 1.1;
            }
          }
        }
        // Critters on a hot shelf fidget nervously.
        const p = stage.partitionOf.get(key);
        if (p !== undefined && stage.shelves[p].hot) rz += Math.sin(now / 55) * 0.05;
        g.position.y = y;
        g.scale.set(1.5 * sx, 1.5 * sy, 1.5 * sx);
        g.rotation.set(0, ry, rz);
      });
      // Gyroscope: rings turn on different axes and speed up while hashing.
      stage.ring.rotation.y += 0.012 + stage.spin * 0.22;
      stage.ring2.rotation.x += 0.018 + stage.spin * 0.3;
      stage.core.rotation.y += 0.02 + stage.spin * 0.25;
      stage.core.position.y = 1.2 + Math.sin(now / 500) * 0.03; // local to the scaled engine
      (stage.core.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.1 + stage.spin * 1.6;
      stage.core.scale.setScalar(1 + stage.spin * 0.25);
      for (let i = stage.tweens.length - 1; i >= 0; i--) {
        const tw = stage.tweens[i];
        const k = Math.min(1, (now - tw.t0) / tw.ms);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        tw.obj.position.lerpVectors(tw.from, tw.to, e);
        tw.obj.position.y += Math.sin(Math.PI * e) * tw.arc;
        if (k >= 1) {
          stage.tweens.splice(i, 1);
          tw.done?.();
        }
      }
      // Ease the gaze toward the active partition, and fade trails/bursts.
      lookX += (stage.focusX - lookX) * 0.04;
      camera.lookAt(lookX, 1, 0.8);
      for (let i = stage.fx.length - 1; i >= 0; i--) {
        const f = stage.fx[i];
        const k = (now - f.t0) / f.life;
        const mat = (f.obj as THREE.Mesh).material as THREE.Material & { opacity: number };
        if (k >= 1) {
          stage.rig.remove(f.obj);
          (f.obj as THREE.Mesh).geometry.dispose();
          mat.dispose();
          stage.fx.splice(i, 1);
          continue;
        }
        mat.opacity = (1 - k) * 0.85;
        if (f.grow) f.obj.scale.setScalar(1 + k * f.grow);
      }
      stage.renderer.render(stage.scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("keydown", key);
      stage.dispose();
      stageRef.current = null;
    };
  }, [events]);

  // Apply trace events: one step animates, any jump redraws instantly.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const trailColor = { current: 0x06b6d4 };
    const tween = (obj: THREE.Object3D, to: THREE.Vector3, ms: number, arc = 0, done?: () => void) => {
      stage.tweens = stage.tweens.filter((t) => t.obj !== obj);
      if (ms > 0 && obj.position.distanceTo(to) > 0.5) {
        // A glowing arc along the hop, fading out after the move.
        const from = obj.position.clone();
        const pts = Array.from({ length: 33 }, (_, j) => {
          const k = j / 32;
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          return new THREE.Vector3().lerpVectors(from, to, e).add(new THREE.Vector3(0, Math.sin(Math.PI * e) * arc, 0));
        });
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: trailColor.current, transparent: true, opacity: 0.85 }));
        stage.rig.add(line);
        stage.fx.push({ obj: line, t0: performance.now() + ms * 0.4, life: ms * 1.6 + 500, grow: 0 });
      }
      if (ms <= 0) {
        obj.position.copy(to);
        done?.();
      } else stage.tweens.push({ obj, from: obj.position.clone(), to: to.clone(), ms, arc, t0: performance.now(), done });
    };
    const burst = (at: THREE.Vector3, color: number) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(at).add(new THREE.Vector3(0, 0.02, 0));
      stage.rig.add(ring);
      stage.fx.push({ obj: ring, t0: performance.now(), life: 700, grow: 1.6 });
    };
    const makeCard = (name: string, tint?: number) => {
      const c = propsRef.current.color?.(baseName(name)) ?? typeColor(name) ?? TYPE_DEFAULT;
      const real = findPokemon(name);
      const sub = propsRef.current.subtitle?.(baseName(name)) ?? (real ? `${dexLabel(real)} · ${real.type1}` : "");
      const tex = textTexture([baseName(name), sub], { w: 256, h: 150, bg: c, size: 38 });
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.2, 1.1, 2, 0.05), faceMaterials(tint ?? c, tex, 2));
      mesh.castShadow = true;
      stage.rig.add(mesh);
      return mesh;
    };
    const card = (name: string) => {
      const key = baseName(name);
      let mesh = stage.cards.get(key);
      if (!mesh) {
        if (isOrb(name)) {
          // A request with no key (Scan): a glowing orb instead of an item card.
          mesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.9, roughness: 0.3 }));
          mesh.castShadow = true;
          stage.rig.add(mesh);
        } else {
          mesh = makeCard(name);
          const real = findPokemon(name);
          if (real) {
            const critter = makeCreature(real.type1);
            const emblem = critter.group;
            // Stand at the back-right of the card so the name stays readable.
            emblem.position.set(0.62, 0.1, -0.22);
            mesh.add(emblem);
            stage.emblems.set(key, critter);
            const model = MODELS[real.name];
            if (model) {
              void import("three/examples/jsm/loaders/GLTFLoader.js").then(({ GLTFLoader }) =>
                new GLTFLoader().load(model, (gltf) => {
                  const box = new THREE.Box3().setFromObject(gltf.scene);
                  const size = box.getSize(new THREE.Vector3()).length() || 1;
                  gltf.scene.scale.setScalar(0.6 / size);
                  emblem.clear();
                  emblem.add(gltf.scene);
                }),
              );
            }
          }
        }
        stage.cards.set(key, mesh);
      }
      return mesh;
    };
    const tint = (mesh: THREE.Mesh, hex: number) => {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      (mats as THREE.MeshStandardMaterial[]).forEach((m, i) => i !== 2 && m.color.set(hex));
    };
    const slot = (name: string, p: number) => {
      const key = baseName(name);
      if (!stage.slotOf.has(key)) {
        stage.slotOf.set(key, stage.counts[p]++);
        stage.stacks[p].push(key);
        stage.partitionOf.set(key, p);
      }
      return new THREE.Vector3(SHELF_X(p), 0.22 + stage.slotOf.get(key)! * 0.23, SHELF_Z);
    };
    const setHash = (text: string) => {
      const mat = stage.hashLabel.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.map = textTexture([text], { w: 512, h: 96, size: 30, mono: true });
      mat.needsUpdate = true;
    };
    const clientPos = (c: ClientId | "app") => CLIENT_POS[c].clone().setY(1.45);

    const apply = (e: TraceEvent, ms: number) => {
      switch (e.t) {
        case "request": {
          trailColor.current = 0x06b6d4;
          const name = keyName(e);
          currentRef.current = { name, client: e.client ?? "app" };
          const m = card(name);
          if (!stage.slotOf.has(baseName(name))) {
            m.visible = true;
            m.position.copy(clientPos(e.client ?? "app"));
            tween(m, ENTRY, ms * 0.8, 0.4);
          }
          break;
        }
        case "hash": {
          trailColor.current = 0x6366f1;
          stage.focusX = SHELF_X(e.partition) * 0.18;
          if (ms > 0) {
            setHash(`"${e.key}" → ${e.hash} → P${e.partition}`);
            stage.spin = 1;
          }
          stage.shelves[e.partition].flash = 1;
          const m = stage.cards.get(baseName(currentRef.current.name));
          if (m && !stage.slotOf.has(baseName(currentRef.current.name))) tween(m, MACHINE, ms * 0.8, 0.3);
          break;
        }
        case "condition":
          stage.gate.color.set(e.pass ? OK : HOT);
          stage.gate.strength = ms > 0 ? 1 : 0;
          if (ms > 0) stage.reactions.set(baseName(currentRef.current.name), { kind: e.pass ? "look" : "shake", t0: performance.now() });
          if (!e.pass) {
            trailColor.current = HOT;
            const m = stage.cards.get(baseName(currentRef.current.name));
            if (m && !stage.slotOf.has(baseName(currentRef.current.name))) {
              tween(m, clientPos(currentRef.current.client), ms * 0.8, 0.8, () => {
                stage.rig.remove(m);
                stage.cards.delete(baseName(currentRef.current.name));
              });
            }
          }
          break;
        case "write": {
          const m = card(e.item);
          if (e.lost || e.mode === "delete") tint(m, e.lost ? HOT : 0xa8a29e);
          // Keep the type colour; the trail and landing burst carry the write colour.
          trailColor.current = e.lost ? HOT : e.mode === "delete" ? 0x78716c : 0xf59e0b;
          const target = slot(e.item, e.partition);
          tween(m, target, ms * 0.85, 1.4, () => {
            if (e.mode === "delete" && !e.lost) m.visible = false;
            // Only the top card on a shelf shows its emblem, so stacks stay readable.
            const stack = stage.stacks[e.partition];
            stack.forEach((k, i) => {
              const critter = stage.emblems.get(k);
              if (critter) critter.group.visible = i === stack.length - 1;
            });
            if (ms > 0) stage.reactions.set(baseName(e.item), { kind: e.lost || e.mode === "delete" ? "shake" : "hop", t0: performance.now() });
            if (ms > 0) burst(target, e.lost ? HOT : e.mode === "delete" ? 0x78716c : 0xf59e0b);
          });
          stage.focusX = SHELF_X(e.partition) * 0.18;
          stage.shelves[e.partition].flash = 1;
          break;
        }
        case "read": {
          trailColor.current = 0x3b82f6;
          stage.focusX = SHELF_X(e.partition) * 0.18;
          stage.shelves[e.partition].flash = 1;
          const orb = isOrb(currentRef.current.name) ? stage.cards.get(currentRef.current.name) : undefined;
          // A Scan visits each partition in turn.
          if (orb) tween(orb, new THREE.Vector3(SHELF_X(e.partition), 3.9, SHELF_Z), ms * 0.7, 0.6);
          e.items.forEach((name) => ms > 0 && stage.reactions.set(baseName(name), { kind: "look", t0: performance.now() }));
          e.items.forEach((name, i) => {
            const m = makeCard(name, 0x93c5fd);
            m.scale.setScalar(0.7);
            m.position.set(SHELF_X(e.partition), 0.4 + i * 0.2, SHELF_Z);
            stage.temp.push(m);
            tween(m, clientPos(currentRef.current.client).add(new THREE.Vector3(0, 0.3 + i * 0.18, 0)), ms * 0.9, 1.2);
          });
          break;
        }
        case "expire": {
          const m = stage.cards.get(baseName(e.item));
          if (m) {
            if (e.visible) tint(m, 0xa8a29e);
            else m.visible = false;
          }
          break;
        }
        case "rollback":
          e.items.forEach((n) => {
            const m = stage.cards.get(baseName(n));
            if (m) tint(m, HOT);
          });
          break;
        case "response": {
          if (ms > 0) {
            const lost = events.slice(0, index).some((x) => x.t === "write" && x.lost);
            stage.reactions.set(baseName(currentRef.current.name), { kind: e.ok && !lost ? "cheer" : "shake", t0: performance.now() + 150 });
          }
          const orb = isOrb(currentRef.current.name) ? stage.cards.get(currentRef.current.name) : undefined;
          if (orb) {
            trailColor.current = e.ok ? 0x16a34a : HOT;
            tween(orb, clientPos(currentRef.current.client), ms * 0.8, 0.8, () => {
              orb.visible = false;
            });
          }
          const c = stage.clients[currentRef.current.client];
          (c.material as THREE.MeshStandardMaterial[]).forEach((m, i) => i !== 4 && m.color.set(e.ok ? 0xbbf7d0 : 0xfecaca));
          break;
        }
        default:
          break;
      }
    };

    // The player resets its index one render after a new trace arrives, so clamp.
    const upto = Math.min(index, events.length);
    if (upto > 0 && upto === shownRef.current + 1) {
      apply(events[upto - 1], stepMs);
    } else if (upto !== shownRef.current) {
      [...Array.from(stage.cards.values()), ...stage.temp].forEach((c) => {
        stage.rig.remove(c);
        c.traverse((o) => {
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
          mats.forEach((mm) => {
            (mm as THREE.MeshStandardMaterial).map?.dispose();
            mm.dispose();
          });
        });
      });
      stage.cards.clear();
      stage.temp = [];
      stage.slotOf.clear();
      stage.emblems.clear();
      stage.reactions.clear();
      stage.partitionOf.clear();
      stage.stacks.forEach((st) => (st.length = 0));
      stage.tweens = [];
      stage.fx.forEach((f) => {
        stage.rig.remove(f.obj);
        const m = f.obj as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      stage.fx = [];
      stage.focusX = 0;
      stage.counts.fill(0);
      Object.values(stage.clients).forEach((c) => (c.material as THREE.MeshStandardMaterial[]).forEach((m, i) => i !== 4 && m.color.set(0xffffff)));
      setHash("hash(partition key)");
      for (let i = 0; i < upto; i++) apply(events[i], 0);
    }
    shownRef.current = upto;
  }, [events, index, stepMs]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.shelves.forEach((s, p) => {
      const on = hot.includes(p);
      s.hot = on;
      (s.edges.material as THREE.LineBasicMaterial).color.set(on ? HOT : INK);
      (s.base.material as THREE.MeshStandardMaterial).color.set(on ? 0xfecaca : 0xffffff);
    });
  }, [hot, events]);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas ref={canvasRef} tabIndex={0} className="block h-full w-full touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0e7c6b]" aria-label="3D view of the request. Drag or use the arrow keys to rotate." />
      <span className="pointer-events-none absolute bottom-2 left-3 text-[11px] font-semibold text-stone-500">Drag or use ← → to rotate</span>
    </div>
  );
}
