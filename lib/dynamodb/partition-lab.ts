import { hashHex, partitionFor, type TraceEvent } from "./trace";

/** Sample data for the Quest 1 partition-key lab: 24 Kanto and Johto Pokémon, 8 of them Water. */
export type LabPokemon = { name: string; type: string; region: "Kanto" | "Johto" };

export const labPokemon: LabPokemon[] = [
  { name: "Squirtle", type: "Water", region: "Kanto" },
  { name: "Charmander", type: "Fire", region: "Kanto" },
  { name: "Bulbasaur", type: "Grass", region: "Kanto" },
  { name: "Pikachu", type: "Electric", region: "Kanto" },
  { name: "Meowth", type: "Normal", region: "Kanto" },
  { name: "Mew", type: "Psychic", region: "Kanto" },
  { name: "Totodile", type: "Water", region: "Johto" },
  { name: "Cyndaquil", type: "Fire", region: "Johto" },
  { name: "Oddish", type: "Grass", region: "Kanto" },
  { name: "Pichu", type: "Electric", region: "Johto" },
  { name: "Psyduck", type: "Water", region: "Kanto" },
  { name: "Jigglypuff", type: "Normal", region: "Kanto" },
  { name: "Lugia", type: "Psychic", region: "Johto" },
  { name: "Feraligatr", type: "Water", region: "Johto" },
  { name: "Typhlosion", type: "Fire", region: "Johto" },
  { name: "Chikorita", type: "Grass", region: "Johto" },
  { name: "Magikarp", type: "Water", region: "Kanto" },
  { name: "Mareep", type: "Electric", region: "Johto" },
  { name: "Snorlax", type: "Normal", region: "Kanto" },
  { name: "Quagsire", type: "Water", region: "Johto" },
  { name: "Abra", type: "Psychic", region: "Kanto" },
  { name: "Ho-Oh", type: "Fire", region: "Johto" },
  { name: "Chinchou", type: "Water", region: "Johto" },
  { name: "Lanturn", type: "Water", region: "Johto" },
];

export type LabKey = "name" | "type" | "region";

export const labKeys: Record<LabKey, { attr: string; label: string; hint: string; value: (p: LabPokemon) => string; sortKey: boolean }> = {
  name: { attr: "Name", label: "Name", hint: "simple key", value: (p) => p.name, sortKey: false },
  type: { attr: "Type1", label: "Type1", hint: "+ Name as sort key", value: (p) => p.type, sortKey: true },
  region: { attr: "Region", label: "Region", hint: "+ Name as sort key", value: (p) => p.region, sortKey: true },
};

/** Share of writes above which a partition is drawn as hot. */
export const HOT_SHARE = 0.3;

/** 24 PutItem requests for the chosen key: request → hash → write → capacity → response each. */
export function labTrace(keyId: LabKey): TraceEvent[] {
  const k = labKeys[keyId];
  return labPokemon.flatMap((p) => {
    const pk = k.value(p);
    const partition = partitionFor(pk);
    const key: Record<string, unknown> = { [k.attr]: pk };
    if (k.sortKey) key.Name = p.name;
    return [
      { t: "request", op: "PutItem", table: "Pokemon", key },
      { t: "hash", key: pk, hash: hashHex(pk), partition },
      { t: "write", partition, item: p.name, mode: "put" },
      { t: "capacity", wcu: 1 },
      { t: "response", ok: true },
    ] satisfies TraceEvent[];
  });
}
