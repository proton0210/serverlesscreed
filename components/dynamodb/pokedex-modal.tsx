"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/dynamodb/ui/tooltip";
import { FiDatabase, FiX } from "react-icons/fi";
import { kantoPokedex, type PokemonData } from "@/lib/dynamodb/pokedex-data";
import { CritterIcon } from "@/components/dynamodb/scene/critter-svg";



const pokemonData: PokemonData[] = kantoPokedex;

export function PokedexModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--sc-line)] bg-white px-5 text-sm font-semibold text-[var(--sc-ink)] shadow-[var(--sc-shadow-sm)] transition hover:-translate-y-px hover:border-[#d6cfbf] hover:shadow-[var(--sc-shadow-md)]"
            >
              <FiDatabase className="h-4 w-4" />
              Open the Pokédex
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Our DynamoDB table</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/[0.5] backdrop-blur-sm px-4 py-6"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-7xl rounded-2xl border border-stone-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <FiDatabase className="h-6 w-6 text-stone-900" />
                <h2 className="text-2xl font-semibold text-stone-900">
                  The Pokemon table
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                aria-label="Close Pokedex modal"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            {/* Table Container */}
            <div className="max-h-[70vh] overflow-auto p-6">
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full border-collapse tabular-nums">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50 [&_th]:bg-stone-50 shadow-[inset_0_-1px_0_0_rgb(226,232,240)]">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-stone-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-stone-900">Type1</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-stone-900">Type2</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-stone-900">HP</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-stone-900">Attack</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-stone-900">Defense</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-stone-900">Speed</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-stone-900">Base Total</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-stone-900">Height (m)</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-stone-900">Weight (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pokemonData.map((pokemon, index) => (
                      <tr
                        key={index}
                        className="group border-b border-stone-100 transition-colors hover:bg-stone-50"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-stone-900">
                          <span className="inline-flex items-center gap-2">
                            <span className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110">
                              <CritterIcon type={pokemon.Type1.charAt(0).toUpperCase() + pokemon.Type1.slice(1)} size={22} />
                            </span>
                            {pokemon.Name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-md bg-stone-100 px-2 py-1 text-xs font-medium capitalize text-stone-700">
                            {pokemon.Type1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {pokemon.Type2 !== "None" ? (
                            <span className="inline-block rounded-md bg-stone-100 px-2 py-1 text-xs font-medium capitalize text-stone-700">
                              {pokemon.Type2}
                            </span>
                          ) : (
                            <span className="text-sm text-stone-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-stone-700">{pokemon.HP}</td>
                        <td className="px-4 py-3 text-right text-sm text-stone-700">{pokemon.Attack}</td>
                        <td className="px-4 py-3 text-right text-sm text-stone-700">{pokemon.Defense}</td>
                        <td className="px-4 py-3 text-right text-sm text-stone-700">{pokemon.Speed}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-stone-900">{pokemon.BaseTotal}</td>
                        <td className="px-4 py-3 text-right text-sm text-stone-700">{pokemon.Height}</td>
                        <td className="px-4 py-3 text-right text-sm text-stone-700">{pokemon.Weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm font-medium text-stone-700">
                Showing all {pokemonData.length} Pokémon from the Pokemon table
              </p>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
