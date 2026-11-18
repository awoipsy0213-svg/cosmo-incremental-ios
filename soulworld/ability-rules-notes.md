# Ability foundation — confirmed through question 162

This module is an isolated, pure rule engine. It does **not** update the
existing play UI or localStorage schema yet. No actual payments are involved.

## Confirmed and represented in code

- Breakthroughs 1–6 each unlock one ability slot (maximum six).
- An unlocked slot immediately gets a random normal ability via a provided roll function.
- Ability type and value must be drawn independently by the eventual random generator.
- Full reroll updates every unlocked/unprotected ability slot.
- Any number of slots can be protected/unprotected without consuming currency.
- Normal abilities have three quality bands: low 1–4%, medium 3–6%, high 5–10%.
- Auto-reroll has an ON/OFF setting, an objective/threshold, and a 2.75-second interval.
- Uniques can appear in ordinary slots, but their probability and effect tables are undecided.
- Dedicated reroll points can be earned during training and battles, but cost/earn rates are undecided.

## Pending integration decisions

- The exact random distributions for type, quality, value, and uniques.
- Unique ability model and probability tables.
- Defined list of ability types.
- Cost per roll, point balances, caps, and point income; never silently charge resources.
- Where to access the ability UI and how to link it to an owned named hero.
- Save schema migration of existing player data.
- Battle use of final-stat modifiers and rarity breakthrough adjustments.

Do not claim that a full gacha, rarity, or ability reroll is playable until
these integrations are added and validated. Existing prototype remains usable
without importing this module. The unrelated Kotowari game must remain untouched.
