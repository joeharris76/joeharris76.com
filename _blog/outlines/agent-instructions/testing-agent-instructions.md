# Outline: Testing agent instructions: most tests could not fail

Draft: `_blog/drafts/agent-instructions/testing-agent-instructions.md`.

## Reader, problem and thesis

**Reader.** An engineer who maintains instruction files and skills for coding
agents and wants to know which parts work.

**Problem.** Instruction files grow one rule at a time, each added after
something went wrong. Reading the file cannot show which rules still change
what the agent does.

**Thesis.** You can measure whether an instruction changes agent behavior.
Two checks decide whether the measurement means anything, and both come
before the measurement itself: does the text reach the agent, and can the
test fail without it?

**Type.** Results with method. The results come from one person's files and
will not transfer; the two checks will. The post leads with the checks and
uses the results as illustration.

**Length.** 3,000 to 3,300 words plus tables.

**Title.** "Testing agent instructions: most tests could not fail" (53
characters). It names the finding. A "how to test your AGENTS.md" title would
promise a tool that takes the reader's own file, and the test rig does not do
that yet.

## Terms

- "Harness" means omp or Claude Code only. The evaluation runner is "the test
  rig".
- Define on first use: instruction file, skill, harness, subagent, brief,
  arm, pre-registration, band (keep, within, inconclusive), judged check,
  Holm correction.

## Sources

Public, in `joeharris76/skill-sync-skills` under `evals/ablation/`:

| Tag | File |
|---|---|
| PILOT | `results/2026-11-15-pilot.md` |
| MAP | `results/loading-map.md` |
| P2 | `results/2026-11-17-phase-2.md` |
| P3 | `results/2026-11-18-phase-3.md` |
| README | `README.md` |
| PREREG | `prereg/subagent-briefs.md`, `prereg/phase3-amendments.md` |

Unpublished, from the author's own notes and session logs: the line-reading
study (STUDY), the phase 2 plan (PLAN2), the sample of subagent briefs
(BRIEFS), the per-run phase 2 reports (RUNS), and the follow-up test of skill
loading (TRIGGER). A figure from these carries its tag below so it can be
rechecked.

## Sections

### TL;DR

What was run and when, the two checks, and the full list of outcomes: one
sentence, two reworded rules, three reworded descriptions, two commit hooks,
one omp rule, no deletions.

### 1. Reading a rule does not show whether it works

- The reading study rated 65% of instruction lines "keep" (STUDY). It judged
  text and could not judge behavior.
- No example here. The model-by-model contrast belongs to section 4.

### 2. Check one: does the text reach the agent?

- Method: a unique marker per source, each role asked to quote what it holds,
  a control file nothing loads. Control quoted in 0 of 45 answers (MAP,
  "Method").
- Table with the condition for each row stated in the row label, and a note
  that rows come from more than one omp configuration (MAP, "Result").
- Four results, each with its condition (MAP, "Result", "Direct answers";
  P2, "Where instructions load"):
  - omp: a discovered global file stops at the main session;
    `contextFiles.extra` delivers it to subagents 3/3.
  - omp subagents never receive the repository `AGENTS.md`.
  - omp loads one project file; `.claude/CLAUDE.md` shadows `AGENTS.md`.
  - Claude Code loads `AGENTS.md` only through an `@AGENTS.md` import (3/3
    against 0/3 for a prose pointer).
- The message counts (756,000 against 734,000) cover every harness, so they
  size delegation in general and say nothing about omp alone (PLAN2).
- Limits beside the table: 3 sessions per cell, almost all on one model, dated
  versions.

### 3. The test rig

- One headless session per scenario, arm and repeat; checks are shell
  commands (README, "How a session runs").
- Four guards in one paragraph (README, "Guards").
- Two limits: macOS only with a fixed list of hidden folders; sessions read
  the user's own omp settings (P3, "Limits").

### 4. Five repeats: large effects and broken graders

- 1,390 sessions, 141.82 USD, plus 370 follow-up sessions with no recorded
  cost (PILOT, opening, "Follow-up experiments").
- Table of three contrasts by model (PILOT, "The models behave differently").
- Wording: 0/5 against 15/15 (PILOT, "Rewordings tested and adopted").
- The identity rule and the hook as two separate results: 5/15 as first
  worded; a hook with no instruction file blocked 5/5 (PILOT, "Global file,
  section by section", "Commit-identity hook"). Two hooks were installed.
- One grader fault as the example, of four.
- What five repeats can show (README, "Reading the results").

### 5. Thirty repeats: most tests could not fail

- Pre-registration and bands defined (README, "Guards", "Decisions").
- 3,173 sessions; 623 USD from the ledger; about 5 USD to test one rule in
  two arms on Sonnet (P2, run table).
- The central table with a single "with and without" column and the no-file
  column (P2, "Rules in the global file").
- The deviation from the pre-registered delete rule, stated once (P2,
  "Decision rule and one deviation").
- The adopted sentence (P2, "New rules tried"), with three cautions:
  - the "keep" came from the brief check; the scored commit check did not
    reach the bar on any row (RUNS; PREREG);
  - Opus could not show an effect;
  - the rig supplies the global file by the route that reaches subagents
    (MAP, third column), so the test does not reproduce the loading gap.
- Why an addition was adopted on one model while deletions need two.
- Real briefs: 20 of 56 implementer briefs left the identity rule out, 7
  more in part (BRIEFS).
- Claims without checks: 60 of 60; 5/30 against 0/30 (p = 0.052) shown as
  inconclusive and not acted on (P2). Largest class of real corrections, 21%
  of 298 (PLAN2).

### 6. Check two: build tests that can fail

- Three arms; `minus-skill` is the sensitivity control (P3, opening).
- Temptation levels, the Sonnet tuning pilot, and its coarseness: scored
  `minus-skill` arms often passed under 10%, far from the 50% target (PREREG,
  "Dial levels"; P3 table).
- Answer the circularity objection before the table.
- Sample: 36 per arm, cut from 70; some arms 19 to 30 (PREREG, "Sample"; P3,
  opening).
- Table: one row from each of five families, including one where
  `minus-skill` stayed at 0.56 (P3, "Sections that matter").
- Insensitive families; the full skill not always followed; no filler-text
  arm; no deletions (P3).

### 7. Text that matters still has to load

- Trigger evaluation table for four skills (P3, "Trigger evaluation").
- The force-push rule was scored on Opus and Fable, so its effect on Sonnet
  is inference.
- Follow-up table for all three models and three arms (TRIGGER). The omp
  rule fires on the edit and write tools only: 24 of 24 Sonnet sessions that
  used them read the skill. Five changed source only through the shell; four
  of those never read it and one read it unprompted.

### 8. The recipe

Eight steps. Lead the commands with the loading probe, which runs unchanged.
State that the rig runs the author's scenarios and fixtures.

### 9. Limits

One person's configuration; the most-used models were not the ones tested;
built-for-test repositories; temptation levels set on one model; a thin
loading probe; dated versions; same-family labels; private sources.

### 10. Where to start

The loading probe, then one rule with a no-instructions arm.

## Left out

- Replays of real sessions.
- Judge calibration, beyond one sentence.
- The GPT pilot tables and the outcomes study.
- A combined total for sessions or cost.
- How the work was organised.

## Open questions for the author

1. The follow-up loading results (section 7) are not in a public report. The
   draft says so. Publish the table in `skill-sync-skills` before the post
   goes out?
2. Two public reports need a note before the post links to them. The pilot
   report says omp's commit helper skips config-defined hooks, and a later
   test showed it runs them. The phase 2 report presents the brief-sentence
   result without the three cautions in section 5.
3. Labels for the post. The site has no label for agent tooling yet.
4. The loading probe ran on omp 18.22. omp is now at version 19. Rerun the
   probe before publishing?
