# Soul World: Q300 consistency review and Q1–312 implementation checkpoint

Date: 2026-11-19. Q1–312 decisions have been confirmed in the design conversation. This file summarizes the implementation inspected on this branch. Do not infer that all confirmed features are playable.

## 1. Confirmed high-priority boundaries
- Main and sub share a common catalog of **17 basic attributes**, capped at 1,000: 筋力・体力・耐久・敏捷・器用・知力・精神・魔力・採集・建築・製作・探索・適応・発想・忍耐・持久力・学習力.
- Shared soul skills are a separate growth domain with maximum level 100.
- Action XP assigns 80% to primary basic ability, 20% to secondary; less when failing. The exact action/attribute mapping and XP formula are not finalized.
- Main characters earn individual leveling XP in the **training/base stage only**, not from the battle stage or exploration. Shared soul contributions from subs and mains remain separate.
- A main hero retains personal abilities and learned-action flags across lives, **not detailed behavior histories**. Death places that hero's soul in temple custody, and collection restores that *same* hero.
- Every new game begins with a temple; existing saves are augmented at an unoccupied location, never overwriting a built structure.
- Low-rarity characters can eventually compete through training and breakthrough bonuses; obtaining high rarity does not instantly grant high combat stats.
- Combat's definitive victory: opposing temple AND main base destroyed. At 300 seconds compare summed remaining HP ratios, then defeated main/sub, then draw; simultaneous full destruction draws.

## 2. Confirmed design discrepancies / implementation risks
1. **Training vs old prototype** (highest priority): the original game used generic auto-respawn and only world-level XP. This branch introduces a persistent starter hero profile, 17 ability data fields, personal XP, learned-action flags, hero soul custody and temple-based reincarnation; these are foundational, not full AI learning.
2. **Temple placement:** before this change, temple was a player-built structure. Initial placement and legacy-save insertion now follow Q281, without changing the other game's assets.
3. **Save protection:** the old save key \`soul_world_browser_proto_v001\` is retained; old schema 1 is loaded and missing fields are added. The UI makes a one-time \`_before_hero_progression\` backup before rewriting older game state. If backup fails or original data is unreadable, automatic writes are disabled. The player should still export JSON backups separately.
4. **Lifespan and AI:** current game still has a fixed 300s lifecycle, immediately walks with pre-authored autonomous logic, and has a fixed 5x5 test base. Confirmed adaptive walking from zero, 5–15m adjustable lifespan, and 10x10→30x30 growth are not live yet.
5. **Combat and gacha:** original PvE uses mock 2-meter HP; the formal 5-minute outcome, revive, mana and gacha helpers are stand-alone. Full 3-main/50-sub/2-summon battles, split structure HP, trigger-based magic, unique roll interaction and full hero roster remain unimplemented.
6. **Balancing:** rarity probabilities and low-rarity breakthrough distribution are coded. The 1.5x high-quality perk and 2x top-20%-value perk from Q285–286 are not yet wired to rerolls. Their normalized probability distributions, sample tables, game UI and balance QA remain a separate task.
7. **Mobile QA:** 30fps target and iPhone compatibility remain targets; no broad real-device stress test was conducted in this review.

## 3. Status labels
- **Confirmed design:** all user answers through Q312, without overwriting old decisions.
- **Implemented core:** base/explore mock, world soul, one named hero progression scaffold, temple-revival lifecycle and legacy save migration.
- **Tested standalone rules only:** mana, resurrection cost, ability slots, rarity odds, gacha pity and draw, stat bonuses, final battle outcome.
- **Unimplemented:** production-ready hero roster / 4 classes / skills / universal skill-tree, full map, spells and summons, true AI learning, real PvP and native mobile validation.
- **Provisional:** exact XP curves, action-to-attribute mapping, starter hero catalog/name, render assets for the new hero, final-stat formulas, reward rates not explicitly decided.

## 4. Change safety / next milestone
- Never change Kotowari root files or touch Kotowari save keys \`cosmo_incremental_v01\` or \`kotowari_v31_normal\`.
- Reuse the original Soul World save key; new fields must be additive and migration idempotent.
- Block overwriting an old save without an available backup; test round-trip serialization.
- Implement in feature branches, pass all regressions + compatibility tests, merge only when green.
- Next: Q313–362 clarifies hero experience, learning/action mastery, individual roles and detailed reincarnation UX. These questions are **proposals** until answered.


## Q313–362 checkpoint (confirmed by user)
- Individual hero level cap is 200. Level XP grows smoothly, although the current coefficient remains provisional.
- Training success grants base 10XP, difficulty multiplier 0.5–2.0, failure gives 25%. The 80/20 basic-ability allocation remains.
- A given action is marked learned only after three successful attempts (old earned flags stay preserved during migration).
- The field actor retains at most 20 short-lived attempts and fading hazard memory, which resets with its life; hero keeps long-term learned actions and walking mastery.
- Walking learning is targeted at ~30 attempts in five stages; the current implementation provides milestone counters and persistence. The **animation/behavior** still uses the old movement algorithm and does not yet show autonomous falling/standing trials.
- The temple panel now shows pending heroes even if soul XP is zero, and bulk recovery can revive them. Hero detail tabs show basic abilities, growth, skills, and a clearly labelled unimplemented final-stat panel.
- Three rolling legacy save backups before a format transition plus write protection and JSON export remain separate from Kotowari. Browser JavaScript parse checks were added to CI. Soul World Service Worker precaches the imported modules for offline operation.
- Final-stat formulas, exact AI learning policy, full multi-hero roster, full battle, exact walking difficulty, broad iPhone QA are not completed. This does not constitute a fully playable release for these planned features.
