import { kantoPokedex } from "./pokedex-data";

/**
 * Real Pokédex facts used by the scenes: national number, types and base stats.
 * Kanto comes from the course's FirstGenPokemon.csv; the Johto species used in the
 * quests are listed below (HP / Attack / Defense / Speed are the same in every generation).
 * Johto entries verified against https://pokemondb.net/pokedex on 2026-09-26.
 */
export type Pokemon = { dex: number; name: string; type1: string; type2?: string; hp: number; attack: number; defense: number; speed: number };

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const kanto: Pokemon[] = kantoPokedex.map((p, i) => ({
  dex: i + 1,
  name: p.Name,
  type1: cap(p.Type1),
  type2: p.Type2 && p.Type2 !== "None" ? cap(p.Type2) : undefined,
  hp: Number(p.HP),
  attack: Number(p.Attack),
  defense: Number(p.Defense),
  speed: Number(p.Speed),
}));

// [dex, name, type1, type2, HP, Attack, Defense, Speed]
const JOHTO: [number, string, string, string | null, number, number, number, number][] = [
  [152, "Chikorita", "Grass", null, 45, 49, 65, 45],
  [153, "Bayleef", "Grass", null, 60, 62, 80, 60],
  [154, "Meganium", "Grass", null, 80, 82, 100, 80],
  [155, "Cyndaquil", "Fire", null, 39, 52, 43, 65],
  [157, "Typhlosion", "Fire", null, 78, 84, 78, 100],
  [158, "Totodile", "Water", null, 50, 65, 64, 43],
  [160, "Feraligatr", "Water", null, 85, 105, 100, 78],
  [170, "Chinchou", "Water", "Electric", 75, 38, 38, 67],
  [171, "Lanturn", "Water", "Electric", 125, 58, 58, 67],
  [172, "Pichu", "Electric", null, 20, 40, 15, 60],
  [179, "Mareep", "Electric", null, 55, 40, 40, 35],
  [195, "Quagsire", "Water", "Ground", 95, 85, 85, 35],
  [249, "Lugia", "Psychic", "Flying", 106, 90, 130, 110],
  [250, "Ho-Oh", "Fire", "Flying", 106, 130, 90, 90],
];
const johto: Pokemon[] = JOHTO.map(([dex, name, type1, type2, hp, attack, defense, speed]) => ({ dex, name, type1, type2: type2 ?? undefined, hp, attack, defense, speed }));

const byName = new Map([...kanto, ...johto].map((p) => [p.name.toLowerCase(), p]));

/** Looks up a Pokémon by name, ignoring decorations like "Mew (BattlesWon 0)" or "Pikachu · Burn". */
export function findPokemon(label: string): Pokemon | undefined {
  const name = label.replace(/\s*\(.*\)$/, "").split(" · ")[0].trim().toLowerCase();
  return byName.get(name);
}

export const dexLabel = (p: Pokemon) => `#${String(p.dex).padStart(3, "0")}`;

/** Type colours for cards (the conventional type palette, drawn as flat colour, no artwork). */
export const TYPE_COLORS: Record<string, string> = {
  Normal: "#d6d3d1",
  Fire: "#fb923c",
  Water: "#60a5fa",
  Grass: "#4ade80",
  Electric: "#facc15",
  Psychic: "#f472b6",
  Ice: "#67e8f9",
  Fighting: "#f87171",
  Poison: "#c084fc",
  Ground: "#d6b370",
  Flying: "#a5b4fc",
  Bug: "#a3e635",
  Rock: "#c8b273",
  Ghost: "#a78bfa",
  Dragon: "#818cf8",
  Fairy: "#f9a8d4",
};

export const typeColor = (label: string) => TYPE_COLORS[findPokemon(label)?.type1 ?? ""] ?? "#fde68a";
