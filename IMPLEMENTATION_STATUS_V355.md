# v3.55 — UX polish
- Presentation-only changes: first unlock notices, explicit navigation/skip, progress glow, growth rings, feedback pulses, state-aware guide, actual convergence intervals, optional feedback sound.
- Existing save schema 31 and engine economics retained. A default-off presentation preference is normalized by the existing settings migration.
- Test: npm test, tests/v355_ux_polish_browser.mjs, existing regression and published verification workflows.
- CI/publication status must be verified separately. No iOS device verification claim.

## Additional UX polish (approved follow-up)
- Time/Source notices provide independent destinations; full-sheet controls retain priority.
- Optional next-step actions in the guide use real unlocks and convergence eligibility; they never execute a purchase or convergence.
- Actual tap rewards are grouped in a short display-only window, with static text retained in reduced-motion/low-power mode. State replacement and convergence clear the transient feedback.
- New regression checks are integrated into the existing v355 unit/browser tests. All economy, thresholds and save schema remain unchanged.
