export type EmulatedPokemon = {
  Name: string;
  PokedexNumber: number;
  Type1: string;
  Type2?: string;
  HP: number;
  Attack: number;
};

/** Stable, non-sensitive fixtures used by the learning emulators. */
export const emulatedPokemon: readonly EmulatedPokemon[] = [
  { Name: "Bulbasaur", PokedexNumber: 1, Type1: "grass", Type2: "poison", HP: 45, Attack: 49 },
  { Name: "Charmander", PokedexNumber: 4, Type1: "fire", HP: 39, Attack: 52 },
  { Name: "Squirtle", PokedexNumber: 7, Type1: "water", HP: 44, Attack: 48 },
  { Name: "Pikachu", PokedexNumber: 25, Type1: "electric", HP: 35, Attack: 55 },
  { Name: "Jigglypuff", PokedexNumber: 39, Type1: "normal", Type2: "fairy", HP: 115, Attack: 45 },
  { Name: "Meowth", PokedexNumber: 52, Type1: "normal", HP: 40, Attack: 45 },
  { Name: "Psyduck", PokedexNumber: 54, Type1: "water", HP: 50, Attack: 52 },
  { Name: "Mew", PokedexNumber: 151, Type1: "psychic", HP: 100, Attack: 100 },
] as const;

export const starterNames = ["Bulbasaur", "Charmander", "Squirtle"] as const;

export function findEmulatedPokemon(name: string) {
  return emulatedPokemon.find((pokemon) => pokemon.Name === name) ?? null;
}
