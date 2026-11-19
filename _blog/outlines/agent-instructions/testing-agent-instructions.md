# Outline: How to test whether your AGENTS.md does anything

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

**Type.** Methodology guide with results. Target 3,000 to 3,300 words plus
tables.

**Title.** "How to test whether your AGENTS.md does anything" (48
characters). Alternative: "Testing agent instructions: most of my tests
could not fail".

## Sources

Public, in `joeharris76/skill-sync-skills` under `evals/ablation/`:

| Tag | File |
|---|---|
| PILOT | `results/2026-11-15-pilot.md` |
| MAP | `results/loading-map.md` |
| P2 | `results/2026-11-17-phase-2.md` |
| P3 | `results/2026-11-18-phase-3.md` |
| README | `README.md` |
| AMEND | `prereg/phase3-amendments.md` |

Unpublished, from the author's own notes and session logs: the line-reading
study (STUDY), the phase 2 plan (PLAN2), the sample of subagent briefs
(BRIEFS), and the follow-up test of skill loading (TRIGGER). A figure from
these carries its tag below so it can be rechecked.

## Sections

### TL;DR (90 words)

What was run, the two checks, and the outcome: one sentence added, two rules
reworded, nothing deleted.

### 1. Reading a rule does not show whether it works (200 words)

- The reading study judged 6,201 lines and rated 65% of instruction lines
  "keep" (STUDY). It could not say whether any rule changed behavior.
- One example of a reading verdict the experiment reversed: the writing
  standard looked unnecessary on Sonnet (5/5 with and without) and Opus
  needed it (5/5 with, 0/5 without) (PILOT, "The models behave differently").

### 2. Check one: does the text reach the agent? (350 words)

- Method: a unique marker per source, each role asked to quote what it holds,
  a control file nothing loads. Control quoted in 0 of 45 answers (MAP,
  "Method").
- Table: source by role for omp and Claude Code, reduced to four sources.
- omp: the discovered global file reached the main session 3/3 and both
  subagent roles 0/3; repository `AGENTS.md` reached subagents 0/3 in every
  configuration (MAP, "Direct answers").
- Claude Code never loaded `AGENTS.md`; a `CLAUDE.md` holding `@AGENTS.md`
  loaded it 3/3, a prose pointer 0/3 (P2, "Where instructions load").
- Skill bodies reach no role until the skill loads (MAP, recommendation 7).
- Scale: subagent sessions held 756,000 messages against 734,000 in main
  sessions (PLAN2).
- Cost: 0.93 USD for 15 sessions (MAP, "Cost").

### 3. The harness (250 words)

- One headless session per scenario, arm and repeat, in a throwaway
  repository with a local bare remote and a stub GitHub CLI (README, "How a
  session runs").
- Arms remove one section, keep one section, or supply no file (README,
  "Arms"). Checks are shell commands.
- The sandbox hides other copies of the files under test. One agent searched
  the disk and read a real copy before that was added (PILOT limits; the
  README's filesystem profile).
- Guards: pinned baseline, pre-registration, spend ledger, model check
  (README, "Guards").

### 4. Five repeats: large effects and broken graders (350 words)

- 1,390 sessions on three Claude models, 141.82 USD (PILOT, opening).
- Table of three contrasts by model: review-only, commit labels, close-out
  (PILOT, "The models behave differently").
- Wording: "Reviews produce findings only" 0/5; naming the tempting situation
  15/15 (PILOT, "Rewordings tested and adopted").
- A hook beat text for a mechanical rule: the written identity rule held in
  5/15 Sonnet sessions; a pre-commit hook blocked 5/5 (PILOT, "Global file,
  section by section", "Commit-identity hook").
- Four grader and sandbox faults found only by reading transcripts, one of
  which had produced a false p = 0.008.
- What five repeats can show: 5/5 against 0/5 is p = 0.008; 5/5 against 1/5
  is p = 0.048 (README, "Reading the results"). One p = 0.049 finding
  weakened to noise on rerun (PILOT, "Follow-up experiments").

### 5. Thirty repeats: most tests could not fail (500 words)

- Rules fixed before the runs: pre-registration, decision bands in code, a
  spend ceiling (README, "Guards", "Decisions").
- 3,173 sessions, 623 USD (P2, run table and total).
- The central table: rule, with/without on Sonnet in omp, the no-file column,
  decision (P2, "Rules in the global file").
- Two rules showed large effects. Seven showed no difference, and in each the
  arm with no file passed too. The pre-registered delete rule was not
  applied; state the deviation once, here (P2, "Decision rule and one
  deviation").
- Skill sections: 11 removed in turn over 600 sessions, 28 to 30 of 30 in
  every arm (P2, "Skill sections").
- The one adopted sentence, quoted, with its three-row result (P2, "New rules
  tried"). Supporting observation: the identity rule was missing from 39% of
  100 sampled briefs (BRIEFS).
- Claims without checks: 60 of 60 wrong status reports; 25 of 30 false
  completion claims with the candidate sentence; the 5/30 against 0/30 result
  (p = 0.052) shown as inconclusive and not acted on (P2, "New rules tried",
  "Failures no tested text fixed"). These were also the largest class of real
  corrections, 21% of 298 (PLAN2).

### 6. Check two: build tests that can fail (550 words)

- Three arms per family: full, whole skill removed, candidate sections
  removed. The second arm is the sensitivity control (P3, opening).
- Difficulty set in a pilot with the skill removed, choosing the level
  nearest a 50% pass rate; those sessions are discarded (AMEND, "Dial levels").
  They were 2,814 of the phase's sessions and 205 USD (P3, run table).
- 36 sessions per arm, a 20-point margin, one Holm correction over 244 tests
  (P3, "Decision rule").
- Result: 17 "keep" comparisons in nine families. Table of five rows (P3,
  "Sections that matter").
- Families where removing the skill changed nothing stay unjudged (P3,
  "Families where removing the skill changed nothing").
- The full skill is not always followed: 0.39 on one check (P3, "The full
  skill is not always followed").
- No deletions: the sample cannot show equivalence, and the model that loads
  these skills most in real use was unavailable (P3, "What changed",
  "Decision rule", "Not run").
- Cost: 1,007 USD (P3, run table).

### 7. Text that matters still has to load (300 words)

- Trigger evaluation: 180 prompts, 540 Sonnet sessions. Table of four skills
  (P3, "Trigger evaluation").
- The skill that holds the force-push and identity rules, both "keep",
  loaded in 1 of 18 explicit prompts.
- Follow-up (TRIGGER): a rewritten description changed nothing on Sonnet
  (0/18 before and after); a harness rule that fires at the first source edit
  made every Sonnet session that edited a source file read the skill (24 of
  24).

### 8. The recipe (300 words)

Eight steps: map loading; sandbox reads and writes; always run a
no-instructions arm; tune difficulty until that arm fails about half the
time; fix decision bands and a spend ceiling first; shell checks before
judged checks; replicate across models before deleting; read transcripts.

### 9. Limits (150 words)

One person's configuration; small repositories built for the test; one
scenario family per rule; one provider's models for every decision; dated
harness versions; macOS only.

### Reproduce and references

Commands from P2 and P3 "Reproduce". Links to the four reports, the README
and the one external paper.

## Left out

- Skill names and section names beyond the examples in the tables.
- Replays of real sessions, beyond one sentence.
- Judge calibration, beyond the recipe step.
- The GPT pilot tables and the outcomes study.
- How the work was organised and what went wrong in organising it.

## Open questions for the author

1. The follow-up loading test (section 7, last bullet) is not in a public
   report. Publish its table in `skill-sync-skills` first, or cut the
   paragraph?
2. The pilot report says omp's commit helper skips config-defined hooks. A
   later test showed that it runs them. The draft cites only the hook result
   for `git commit`. Should the pilot report get a correction note before the
   post links to it?
3. Labels for the post. The site has no label for agent tooling yet.
4. Is a chart of pass rates with no instructions wanted, or do the tables
   carry it?
