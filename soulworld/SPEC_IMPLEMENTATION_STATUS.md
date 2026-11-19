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


## Q363–412 checkpoint (confirmed by user)
- Start with one fixed Common main hero; a built Hero House assigns one hero; maximum three completed houses, one hero per house. Other acquired heroes can wait and retain growth. Swapping in base is represented in **roster data**; field-model actor replacement is pending.
- In the current build only the original house is available. Rules for upgrading the base and resources to unlock house 2/3 remain undefined, so the UI does not pretend they are unlocked.
- Battle registration is 1-3 heroes assigned from existing houses. The current mock battle takes a snapshot of registration IDs but **does not actually spawn multiple heroes**.
- Confirmed base-ability action XP mappings: wood gathering+strength, stone gathering+durability, food gathering+stamina, building building+dexterity, crafting crafting+dexterity, survey exploration+adaptation, swimming stamina+adaptation, magic magic+intelligence, support spirit+magic, with 80% / 20% allocation. The particular melee/ranged/magic/defense training mappings still need dedicated design. Old generic fight/pray mapping is provisional.
- **Needs resolution:** Q373–381 imply basic ability growth on exploration actions, whereas Q61/Q73 prescribe XP gain only in training. Current prototype keeps personal main XP limited to base/training; later questions should explicitly separate character-level XP and basic ability XP by stage.
- Hazard warning memory uses 60-second **exponential half-life**. The actual AI hazard policy and physical balance/falling animations remain unfinished.
- The game now has a persisted roster with assignments, standby filters, deployment registration, and a basic Hero House management UI. New heroes are not yet obtainable through live gacha; UI correctly shows empty/locked availability.
- Legacy saves are migrated additively using unchanged Soul World save key and schema=1, with saveFormatRevision=2 and three-generation backup. Malformed hero IDs, growth numbers and roster references are rejected rather than silently repaired. JSON exports include ISO date/time, save schema and build version.
- Q393–402 confirmed final-stat sqrt growth, effective armor percentage reduction, hit/avoid interaction and role buffs, but exact numeric coefficients are still undecided, so the live combat stat panel remains labelled incomplete.
- Separate cosmetic RNG is a design decision only, not yet connected to the full 3D animation system.
- This review and Node CI verify rule logic and legacy round-trips; an actual iPhone Safari / PWA manual regression of the new Hero House UI has not yet been performed.


## Q413–462 checkpoint (confirmed by user; incremental implementation)
- **Q413 clarifies XP stage boundaries:** hero level XP remains restricted to training/base. Exploration-specific base attributes (currently survey: exploration/adaptation, swim: stamina/adaptation) can gain XP in exploration; full exploration action classification remains to be expanded. Battle gives neither hero level nor basic XP.
- **Hero House unlock rules confirmed:** 2nd house at base Rank 2, cost wood 50 / stone 30; 3rd at Rank 4, cost wood 150 / stone 100. Initial house stays. Current base is a **5x5 demo without rank upgrades** and has basic storage caps; these houses are **not yet constructible**. The UI lists requirements without pretending they are available.
- **Multiple independent mains:** roster assignments now synchronize with named live field actors (up to three if three houses already exist), each with independent age, remaining lifetime, per-life memory, soul experience, personal ability XP and learning. Field actors are persisted in the same game save. Missing houses or a house swap moves a main to standby with remaining lifetime, soul buffer, temporary history and individual growth retained. Reassignment restores that same life and lets AI choose a new action.
- **Multiple souls:** death still moves individual hero identity to the shared temple; bulk collection returns all recovered profiles and activates those with assigned completed houses. Recovered unassigned profiles stay in standby.
- **Per-hero preferences:** personality, up to three priorities (UI editor pending) and preferred tactical stance are persisted in named hero profiles. Current AI is still a scripted prototype and does not use all preferences to score actions.
- **Sub characters:** shared soul mastery can raise sub capabilities per confirmed design, but 17-attribute-derived sub performance remains unimplemented. Do not claim per-sub saved character growth.
- **Battle:** five-minute mock remains a prototype. Registered heroes are not yet individually represented as combat actors; formal structure HP, revival, final stat formula and real tactical AI remain pending.
- **Saved data:** original Soul World key \`soul_world_browser_proto_v001\` and schema 1 are preserved. Additive \`saveFormatRevision:3\` triggers 3-generation pre-migration backup. JSON malformed paused-life fields cause validation failure, not silent loss.
- **Testing:** automated CI tests ensure 3 independent field hero actors, pause/resume identity and lifespan, exploratory basic XP without level XP, soul recovery/standby behavior and legacy v2 migration. GitHub Pages deployment is automatically checked. Real iPhone Safari manual UX and offline tests still pending.
- **Deferred:** base rank upgrade, 10x10→30x30 map expansion, construction costs and materials needed to build houses, full AI autonomy, real multiple-combat-hero simulation, stamina recovery, physically visualized falling/walking and exact combat-stat parameters.


## Q463–512 confirmed, Q500 design-versus-implementation review (2026-11-19)

### Confirmed
- Main base rank gains XP from facility construction, upgrades and missions; the only exact rank thresholds confirmed so far are **Rank2=100 cumulative XP** and **Rank4=600 cumulative XP**.
- Base size begins **10×10**, grows to **20×20 at Rank2** and **30×30 at Rank4**. Earlier 5×5 coordinates, buildings, tiles, and actor positions must never be shifted or discarded during migration.
- 2nd Hero House requires Rank2, 50 wood +30 stone, target construction time 30s. 3rd requires Rank4, 150 wood +100 stone, target 60s. Building placement is chosen by player, and houses cannot host heroes before complete.
- Wood/stone storage can be upgraded by rank up to a capacity of 200 each. Construction/upgrade prices for the storage itself remain **undecided**.
- Sub 17 base stats are derived from shared mastery; level 100 adds approximately 500 to corresponding ability (confirmed). Detailed mapping to all 17 requires more design.
- Learned per-hero AI scores and hazard memory must be reproducible; no unattended/offline stage progression. 20Hz simulation / 30fps display are targets, not measured.
- Stat coefficients are now confirmed for base HP, physical attack/defense, magic, mitigation, hit baseline, stamina. Full combined battle stat pipeline is **not yet integrated**.

### This PR's scoped implementation
- \`base-progression.mjs\` introduces rank thresholds, map size table, safe additive grid extension, next-house and next-warehouse capacity previews.
- The existing 5×5 layout is **extended** into a 10×10 map at new-game creation or when loading a legacy game. Rank2 and Rank4 expand the map to 20×20 and 30×30 without shifting existing coordinates. Original resources, heroes, soul state and placed facilities are kept.
- The live 3D WebGL and Canvas2D compatibility renderers use the dynamic map size, preserve the camera focus around the original base and skip far-off tiles when applicable.
- Base construction awards **provisional 20 Rank XP per completed facility**. This amount, and **Rank3 at cumulative 300 XP**, are temporary tuning values, **not user-confirmed**.
- The UI shows base rank, current map size and Hero House unlock requirements; building a second house at Rank2 is possible with enough wood/stone and space. A third house requires confirmed rank/resources but presently **cannot be funded with a 50-cap storage**, since storage upgrade costs are not yet decided.
- Construction \`work\` values are 30/60 as placeholders for target *working time*, but real wall-clock completion times depend on active builders and their action timing; the exactly timed construction system is pending.
- Autosave interval changes to **15 seconds** (plus existing important-action saves).
- Save key stays \`soul_world_browser_proto_v001\`, same schema 1, additive \`saveFormatRevision:4\` triggers 3-generation raw pre-migration backups. Import validation rejects invalid resources, rank values, map sizes, and duplicate map coordinates.
- Tests cover migration, no coordinate loss, rank progression, House availability, warehouse capacity previews, malformed imports and all prior regression cases. PWA cache version and module syntax checks are updated.

### Unfinished / Q513+ review priorities
1. **Rank3 actual threshold**, source-specific Rank XP rewards, repeatable mission rules.
2. Storage upgrade construction costs and rank conditions; live ability to reach 150 wood/100 stone to build the 3rd house.
3. Exact real-time 30s/60s Hero House building method and worker coordination.
4. Real 20×20/30×30 iPhone performance and full-featured navigation and collisions.
5. Verified offline cache update only after a successful save; current update behavior is not a complete approval-flow implementation.
6. Full AI decision-making, balancing, complete final-stat formulas, genuine PvP, actual multihero battle, and native iPhone manual testing.

The unrelated Kotowari game is outside this PR; preserve \`kotowari_v31_normal\` and \`cosmo_incremental_v01\`.
