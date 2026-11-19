# Soul World specification / implementation checkpoint (Q1–262)

Date: 2026-11-19. This is **not** a claim that the full game is complete. Formal 300-item review will follow answers through question 300.

## Source of truth
- Confirmed answers in the design conversation; proposed answers to Q263–312 are **not** settled.
- Keep the standalone Soul World project inside `soulworld/` and never overwrite Kotowari files.
- Production saves use `soul_world_browser_proto_v001`; preserve original bytes when upgrading. Old schema 1 loads into current prototype.

## Implemented in gameplay prototype (current live UI)
- 5x5 test base; a main and 5-sub test simulation; actions; base construction; soul collection; a small exploration mode; simplified PvE; local save and JSON export/import.
- Mock battle: 300s timer, mana zero at start, +1/2s and a mana display. Real temple/main-base destructibility, revival, 50-unit battle, spells and summons are **not yet live**.

## Implemented as tested rule helpers only (not connected to live gameplay)
- Battle mana costs/gains and resurrection prerequisites in `battle-rules.mjs`.
- Six ability slots, locking/unlocking, normal value ranges and auto reroll scaffolding in `ability-rules.mjs`.
- Unique rarity probabilities, star boost validation, gacha pity, battle adjudication in `confirmed-rules-163-212.mjs`.
- Rarity/quality distributions, 100-unit single/1000-unit ten gacha, duplicate materials, incremental low-rarity bonuses, 1-point full reroll and auto stop, two-second revival protection in `rules-213-262.mjs`.

## Design alignment / gaps to audit at Q300
1. **BATTLE prototype differs from final:** mock uses only two HP meters and early win by one meter; confirmed rules require both the temple and main base destroyed, with timeout building percentages, kill tiebreak, draw. The separate rule engine is not yet wired into prototype.
2. **TRAINING persistence differs from final:** prototype keeps shared soul XP and spawns generic new mains; confirmed rules require persistent named hero identities, individual trained basic abilities, automatic 3 stat points/level, persistent souls collected manually, and character action mastery. Requires a careful versioned save migration and a separate roster, not silent replacement.
3. **COMMON mastery and abilities differ from final:** common skill mastery cap 100, multi-source progression, stat formula composition and 4 hero classes are confirmed; character catalog, action EXP thresholds, full stat list, and formulas have implementation gaps.
4. **RARITY and unique abilities:** confirmed ratios and buffs have isolated helpers. The actual hero registry, ability kinds, rarity draw and duplicate-handling UI, unique replacement constraints, epic/legendary probability-boost magnitudes and auto-target UX are not all implemented.
5. **SUMMONS / PvP / exploration:** full 3–5-min arena and 50 subs, 3 mains, 2 summons, automatic spells and custom trigger templates are designed but not implemented. Online remains optional and no real payment integration exists.
6. **MOBILE performance / offline:** 30fps is a target, not validated across devices. Local browser prototype and Service Worker present; iOS native build and real-device 50-character performance tests incomplete.

## Change gate
- Never delete or rewrite a player save key, nor silently invent missing rules.
- Keep new features behind separate tested modules until complete and verified; existing UI remains honest about unimplemented features.
- Each PR must pass new/old regression tests and a legacy-save round-trip, then be reviewed/merged and GitHub Pages build checked.
- Q300 checkpoint must inspect contradictions and select the next incremental UI integration milestone.
