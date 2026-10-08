# DynamoDB quest scenes

Animated, trace-driven visuals for the `/dynamodb` quests. Plan, PRD and backlog live in the
"Interactive DynamoDB Exercises — Visualization Plan" Claude Doc.

## How it fits together

| Piece | File | Role |
| --- | --- | --- |
| Trace contract | `lib/dynamodb/trace.ts` | `TraceEvent`, `Failure`, teaching hash and 4-partition model |
| Exercise traces | `lib/dynamodb/quest-traces.ts`, `emulator-traces.ts` | Success, failure and "what if I skipped this?" traces per quest |
| Lesson traces | `lib/dynamodb/lesson-traces.ts` | Failure-then-fix sequences and predict-the-outcome questions |
| Captions | `lib/dynamodb/captions.ts` | One sentence per event; failure titles |
| Player | `components/dynamodb/scene/use-trace-player.ts` | Play, pause, step, skip, speed; reduced motion jumps to the end |
| 2D renderer | `scene/trace-scene-2d.tsx` | SVG, works everywhere; the fallback for 3D |
| 3D renderer | `scene/trace-scene-3d.tsx` | Three.js, lazy-loaded; used by Quest 1, 3, 4, 9, 10 |
| Exercise replay | `scene/trace-replay.tsx` | Under every code editor; Quest 16 shows `architecture-board.tsx` |
| Lesson scene | `scene/lesson-scene.tsx` | Autoplays once when scrolled into view |
| Quest 1 lab | `scene/partition-lab.tsx` | Partition-key picker (A/B tested) |
| API panel | `scene/wire-view.tsx`, `lib/dynamodb/wire.ts` | The step's request/response in DynamoDB's JSON wire format (simulated) |
| Timeline | `scene-controls.tsx` (`SceneTimeline`) | Seekable scrubber; Space plays/pauses, ← → step, Home/End jump |
| Pokédex | `lib/dynamodb/pokedex.ts`, `pokedex-data.ts` | Real national numbers, types and base stats (Kanto CSV + Johto species used) |
| Data Critters (2D) | `scene/critter-svg.tsx` | Vector versions with moods (idle, happy, worried, curious); used in 2D chips, the caption guide, the Pokédex, the course hero and the badge parade |
| Data Critters | `scene/creatures.ts` | Original 3D cast, one per type (Wick, Bloop, Sprig, Amp, Orbi, Crate, Cairn, Kite, Mote), riding on item cards |

API routes (`simulate-quest`, `emulate-get-item`, `emulate-scan`) add `trace`, `failure` and
`counterfactual` to every response without changing existing fields. `npm run test:dynamodb`
(against a running server) checks the contract.

3D is used only when the viewport is at least 768 px, WebGL is available and the learner has not
asked for reduced motion; it drops to 2D if the frame rate stays under 30 fps for 3 seconds.

## Adding a scene to a quest

1. Add a scenario to `scenarios` in `quest-traces.ts` (`success`, `counterfactual`, `classify`).
2. Add labels to `WITHOUT_WITH` in `lesson-traces.ts`, and optionally a prediction.
3. Add `visual: <LessonScene questId="…" />` to the section in `lib/dynamodb/quest-content.tsx`.
4. Add a failure case to `scripts/check-dynamodb.mjs`.

## Lesson layout and design system

Every quest page renders `components/learn/lesson/lesson-page.tsx` (the engine shared with Learn S3 — see `docs/s3-course.md`):

- **Hero**: breadcrumb, quest number/difficulty/time, title, intro, and a mission card with the quest's guide critter (`guideFor` in `lib/dynamodb/course.ts`) and Learn → Practice → Check progress.
- **Outline**: sticky "On this page" rail on desktop, a sticky collapsible bar on mobile. Labels come from `section.label`, which `quest-content.tsx` fills on the server from each title (client-side text extraction fails once RSC has serialised the titles).
- **Sections** (`lesson-section.tsx`): editorial prose (`.sc-prose`), notes, lists, tables, static highlighted code (`code-block.tsx`, no Monaco), then the scene.
- **Practice** (`workbench.tsx` + `code-input.tsx`): a light editor (textarea over highlighted code) that works on phones, supports locked lines (`editableLine`), Ctrl/⌘+Enter to run, Reset, and a structured result panel. `SimulateCodeEditor`, `CodeEditor` (Quest 3) and `GetItemCodeEditor` (Quest 4) all use it; the Quest 5–8 editors are thin wrappers over `SimulateCodeEditor`.
- **Check** (`quiz-card.tsx`) and the reward (`badge-dialog.tsx`). The badge needs the check, plus the code challenge when the quest has one.

Tokens live at the end of `app/globals.css` (`--sc-*`: paper, ink, one teal accent, region hues). Keep new UI on those tokens. Modals that open from inside animated elements must portal to `document.body`: an element with a running or filled `transform` animation becomes the containing block for `position: fixed` children.

## Configuration

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Loads cookieless Plausible and sends quest/scene/quiz events (see `lib/analytics.ts`) |
| `NEXT_PUBLIC_PLAUSIBLE_SRC` | Optional custom Plausible script URL |
| `NEXT_PUBLIC_EXPERIMENT_QUEST1_SCENE=on` | 50/50 split on Quest 1 (lab vs original lesson); variant sent as `exp_quest1_scene` |

## Pokémon artwork and 3D models

The scenes use real Pokédex data but no Pokémon artwork: cards are type-coloured and carry an
original "Data Critter" for their type — Fire → Wick (lantern), Water → Bloop (jellyfish),
Grass → Sprig (potted sprout), Electric → Amp (battery), Psychic → Orbi (floating orb),
Normal → Crate (box), Rock → Cairn (stacked stones), Flying → Kite, anything else → Mote
(puffball in the type colour). They are Serverless Creed's own designs, built from primitives
(no model files), and each has an idle animation in `update(t)`.

Micro-animations: in 3D, critters hop with squash-and-stretch when their item lands, cheer on a
successful response, shake when data is lost or a condition fails, glance when read, and
fidget on hot partitions. In 2D they bob, blink and change mood per step (CSS in
`app/globals.css`, prefixed `sc-critter`). Everything respects `prefers-reduced-motion`. If you license official 3D models, put the `.glb` files in
`public/models/` and map names in `lib/dynamodb/pokemon-models.json`
(`{ "Pikachu": "/models/pikachu.glb" }`); the 3D scene loads them in place of the critter.
Only add assets you hold a licence for.

## AWS icons

Download the Icon package from https://aws.amazon.com/architecture/icons/, then run
`node scripts/import-aws-icons.mjs ~/Downloads/Icon-package_*.zip`. Icons are copied unmodified to
`public/aws-icons/` and picked up automatically; until then scenes use neutral stand-ins.

## Pilot readout (Quest 1)

After two weeks or 1,000 quest views per arm (whichever is later), compare by `exp_quest1_scene`:
quiz first-try accuracy (`quiz_answer` with `attempt = 1`, `correct = true`), quest completion
(`quest_complete` / `quest_view`), and LCP. Ship to all if accuracy improves and LCP p75 stays ≤ 2.5 s.
