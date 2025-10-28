SMT-lite Battle Simulator

Open `main.html` in a browser to run this prototype of a Shin Megami Tensei style battle simulator.

Status: this repository contains a working prototype engine and UI with the following implemented features (as of this build):

Implemented features
- Basic actor model (`src/engine.js`): HP/MP, stats (atk/def), skills list, affinities map, origin/passive key.
- Damage calculation (`damage()`): uses attacker ATK + skill power − defender DEF, includes small random variance.
- Affinity resolution (`resolveAffinity()` / `getMultiplier()`): per-actor affinity tables override default (neutral) multipliers.
- MP resource fields on actors (MP/MaxMP) and MP consumption on MP-cost skills (main.js checks and deducts MP).
- Skill schema and central move table (`src/moves.js`): structured move objects with fields like name, element, power, type, costType, costAmount, accuracy, flags, and description.
- Origin/passive skills (`src/originskills.js`) and basic passive handler (`runPassiveEvent()`): supports simple passive actions such as HP/MP regen, reflect, and drain for events like `turn` or `onDamageTaken`.
- Demon templates (`src/demons.js`): stat blocks and skill keys referencing `moves.js` and origin skills; templates include affinities, ailmentResists, proficiencies, and originSkill.
- UI (`main.html` + `src/main.js`):
  - DOM caching for performance and clarity
  - Enemy selection dropdown (starts battle immediately when chosen)
  - Rendered player move buttons and enemy move list (shows MP costs and dims unavailable moves)
  - HP/MP bars and numeric readouts for player and enemy
  - Turn locking so player cannot queue multiple actions
  - Support for several skill types: `attack`, `heal`, `support`, and `status` (with simple handling for each)
  - Accuracy checks for skills (misses logged)
  - Buff tracking (stages + durations) for support skills (basic implementation; stages recorded and decremented each turn)
  - Typed battle log (player/enemy/info) with color coding
  - Basic AI (`aiChooseMove()`): chooses the highest-declared-power skill and respects MP availability when selecting moves

Files and responsibilities
- `main.html` — UI and entry point. Open in a modern browser (module-supporting) to run the simulator.
- `src/main.js` — UI wiring, DOM cache, battle loop, move rendering, input handling, player/enemy turn logic.
- `src/engine.js` — core game logic: `Actor` model, `damage()`, affinity resolution, passive event runner, and `aiChooseMove()`.
- `src/moves.js` — master table of moves (keys → move objects).
- `src/originskills.js` — origin/passive skills referenced by demon templates (contains `passive` descriptors).
- `src/demons.js` — demon templates (stats, skills, affinities, originSkill, proficiency/ailment metadata).
- `REFACTOR_NOTES.md` — developer notes describing refactor choices and suggested next steps.

How to run
- Clone or open this folder locally and open `main.html` in a browser that supports ES modules (Chrome, Firefox, Edge).
- The UI is intentionally simple; choose an enemy from the dropdown and start a battle. Use the DevTools console to inspect `player`, `enemy`, and helper functions.

Design notes / constraints
- The code intentionally keeps actor objects mutable so the UI can update instances in-place (convenient for this prototype).
- Move keys are resolved at runtime via a `masterMoves` merge (moves + origin skills) so origin/passive skills are available by key.

Referenced but not implemented features (observations)
The codebase references several features in comments, passive descriptors, and data structures that are not yet implemented or are only partially implemented. These are collected here for tracking — no changes were made to implement them in this pass.

1) Critical hits
	- Passives and origin skills (e.g., `Deathly Affliction`) reference `critMultiplier` and improved crit/accuracy, but there is no critical-hit calculation or crit multiplier application in `damage()`.

2) Buff/debuff stage multipliers
	- The code records buff stages and durations (e.g., `player.buffs[key] = { stages, turns }`) but there is no system that maps stages to numeric damage/defense modifiers when computing damage.

3) Proficiencies and stat mapping
	- Demon templates include `Proficiencies` and extra stat fields (`str`, `mag`, `vit`, ...), but these are not used by the current damage calculation (which uses `atk` and `def`). Mapping from SMT-style stats to engine stats is unimplemented.

4) Ailment system completeness
	- Skills set status flags (e.g., `poison`, `mirage`) but there is no duration system or concrete per-ailment effects implemented (e.g., poison damage over time).

5) Negotiation / demon recruitment
	- `originskills.js` notes "No effect (negotiation not implemented)" — negotiation mechanics are not present.

6) Passive actions not implemented
	- Some passive descriptors (for example `boost_accuracy_crit`) are present in `originskills.js` but `runPassiveEvent()` does not implement that action.

7) Skill targeting beyond single-target
	- Move metadata supports targets like `all_enemies`, `ally`, `all_allies`, but main.js currently implements single-target logic only.

8) Status durations and per-turn effects
	- Status entries are created (e.g., `enemy.status[statusName] = true`) but durations, stacking, and their impacts on behavior are not implemented.

9) More advanced AI
	- AI picks the highest-power skill; it does not consider affinities, resistances, or tactical MP/HP considerations.

10) Passive application at battle start
	- `applyPassiveEffects()` returns a passive object for display but does not currently modify actor state in a broad way (the passive event system is partial).

11) Animation / UI polish
	- The UI is intentionally minimal. Animations, better layout, and richer visuals are not implemented here.

12) TP system, level-up, and move learning
	- Data structures (e.g., `level` on moves) exist but no progression mechanics, TP usage, or learning system are implemented.

13) Full move lists & data completeness
	- `REFACTOR_NOTES.md` suggests populating `src/moves.js` with a more extensive move list (SMT V), but only a small set of moves are present.

14) Passive triggers/events coverage
	- `runPassiveEvent()` implements a small set of passive actions. Other event types (e.g., `onAttack` with conditional behavior) are defined in data but not fully supported by the runner.

Suggested next steps (non-blocking)
- Add a small README section documenting how to add new moves and demons (key naming and fields).
- Implement critical-hit handling and map buff stages to numeric multipliers in `damage()`.
- Wire `Proficiencies` and SMT-style stats into damage formula or create a conversion helper.
- Add durations/turn counters for status ailments and expand the passive/event system to support more passive actions.
- Expand AI to consider affinities and MP constraints when selecting moves.

If you want, I can now (pick one):
- implement a single referenced feature (e.g., critical hits) and tests, or
- add a `UNIMPLEMENTED.md` file listing the items separately, or
- keep the README as the single source of truth and additionally open issues for each unimplemented item.

License / note
- This is a prototype project for experimentation and learning. It is intentionally minimal and structured to make it easy to extend.

Enjoy exploring the code — tell me which unimplemented item you'd like prioritized next.
