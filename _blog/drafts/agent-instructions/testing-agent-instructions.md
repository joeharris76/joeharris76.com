<!--
Status: first draft, not reviewed by the author.
Outline: _blog/outlines/agent-instructions/testing-agent-instructions.md
Target path: content/posts/2026/11/testing-agent-instructions.html
Labels: to be chosen
Open before publishing: the outline's "Open questions for the author".
-->

# How to test whether your AGENTS.md does anything

> Two checks to run before you measure an instruction file, and what three rounds of measurement showed about mine.

**TL;DR**: I ran three rounds of experiments that remove instruction text from coding agents and count what changes. Two checks decided whether a result meant anything: whether the text reached the agent at all, and whether the test could fail without it. Most of my early tests failed the second check. Across all three rounds I added one sentence, reworded two rules and three skill descriptions, installed one hook and deleted nothing.

---

## Reading a rule does not show whether it works

My agent instructions grew the way most do. Each rule went in after something went wrong, and nothing ever came out. By November the instruction files and skills I maintain held about 6,200 lines, and I could not say which of them still changed what an agent did.

A note on terms. An instruction file is the `AGENTS.md` or `CLAUDE.md` that a coding agent reads at the start of a session. A skill is a longer document the agent can choose to load when its one-line description matches the task. A harness is the program that runs the model, gives it tools and decides which files it sees. I use two: [omp](https://omp.sh) and Claude Code.

My first attempt was to read every line and judge it. That study rated 65% of the instruction lines as worth keeping. It found real drift, such as stale paths and rules copied to several places. It could not answer the question I cared about, because a line can be correct and ignored.

The first experiment showed how far reading can mislead. The rule that keeps plan labels out of commit messages looked unnecessary on Claude Sonnet 5.5, which wrote clean messages in 5 of 5 sessions with the rule and 5 of 5 without it. Claude Opus 5.5 wrote clean messages in 5 of 5 sessions with the rule and 0 of 5 without it.

So I switched to ablation: run the same task many times with a piece of text present and many times with it removed, and count the difference. The method, the reports and the code are in [skill-sync-skills](https://github.com/joeharris76/skill-sync-skills/tree/main/evals/ablation).

## Check one: does the text reach the agent?

Removing text the agent never receives will always show "no difference". I checked this late, and it should have come first.

The probe is small. Plant a unique marker string in each instruction source. Ask the main session, a task subagent and a reviewer subagent to quote every marker they hold. A subagent is a second agent that the main session starts and hands part of the work to. Include a control file that nothing loads, so you can tell quoting from guessing. The control was quoted in none of 45 answers.

Each cell below is the number of sessions, out of 3, in which the role quoted the marker.

| Source | omp: main | omp: subagents | Claude Code: main | Claude Code: subagents |
|---|---|---|---|---|
| Global file | 3/3 | 0/3 | 3/3 | 0/3 |
| Repository `AGENTS.md` | 3/3 | 0/3 | 0/3 | 0/3 |
| Repository `CLAUDE.md`, beside an `AGENTS.md` | 0/3 | 0/3 | 3/3 | 3/3 |
| Skill description | 3/3 | 3/3 | 3/3 | 3/3 |
| Skill body, before the skill loads | 0/3 | 0/3 | 0/3 | 0/3 |
| The brief the main session writes | n/a | 3/3 | n/a | 3/3 |

These numbers come from omp 18.22.0 and Claude Code 2.1.323 on 2026-11-17. Two cells need a caveat. The probe gave Claude Code the global file as an appended system prompt; a user-level `CLAUDE.md` was not measured and may reach subagents, as the repository one does. And omp loads one project file: with only a `CLAUDE.md` present it loaded that file in 3 of 3 sessions. A later release of either harness could change any of this.

Three results changed what I did next:

- **Subagents in omp received neither the global file nor the repository file.** Every rule I had written about commits, authorship and verification stopped at the main session. In my own logs, subagent sessions hold slightly more messages than main sessions (756,000 against 734,000), so the gap covered a large share of the work.
- **Claude Code never loaded `AGENTS.md`.** A `CLAUDE.md` that contains the import line `@AGENTS.md` loaded it in 3 of 3 sessions. A `CLAUDE.md` that said "Read and follow `AGENTS.md`" in prose loaded it in 0 of 3.
- **A skill's body reaches nobody until the skill loads.** Only its description is always present.

The final 15 sessions of this probe cost 0.93 USD.

## The harness

Each test is one headless agent session in a throwaway repository. The repository's remote is a local bare repository, and a stub stands in for the GitHub CLI, so a session cannot push or open a pull request anywhere real. A scenario is a prompt, a setup script and a list of checks. Each check is a shell command run on the repository afterwards, written so that exit 0 means the wanted behavior happened.

An arm is one version of the instructions. The arms I used most are the full file, the file without one section, the file with only one section, and no file at all.

Four guards came out of early mistakes:

- **A pinned baseline.** The file and skills under test are snapshots. A run folder refuses results from a different snapshot, harness version or model.
- **A read sandbox.** A filesystem profile hides my real instruction files and projects. Before I added it, one agent searched the disk and read a real copy of a skill that its arm had removed.
- **A spend ledger.** Every turn's cost is added to one file, including failed turns, and the runner refuses to start a turn once the total reaches a ceiling.
- **A model check.** A session answered by any model other than the one requested is discarded.

The sandbox profile uses macOS `sandbox-exec`, so the harness runs on macOS only.

## Five repeats: large effects and broken graders

The first round ran 1,390 sessions on three Claude models, with 5 to 15 sessions per arm, for 141.82 USD. Each cell is the number of sessions that passed the check with the rule, then without it.

| Rule and task | Sonnet 5.5 | Fable 5.2 | Opus 5.5 |
|---|---|---|---|
| A review changes no files (a failing test is mentioned) | 0/5, 0/5 | 5/5, 0/5 | 5/5, 0/5 |
| No plan labels in a commit message | 5/5, 5/5 | not run | 5/5, 0/5 |
| Finish a fix with a commit and a push | 0/5, 0/5 | 5/5, 4/5 | 5/5, 0/5 |

Which rules mattered depended on the model. A rule that made no difference on one model was the rule another model depended on. From here on I deleted nothing on the result of one model.

Wording mattered too. "Reviews produce findings only" passed in 0 of 5 Sonnet sessions. A rewording that names the tempting situation, "change no files, even when you find the bug and a test is failing", passed in 15 of 15. I adopted that rewording and a firmer one for the commit-and-push rule.

For a rule a machine can enforce, a hook did better than text. The written rule against committing under an agent's identity held in 5 of 15 Sonnet sessions. A pre-commit hook blocked the commit in 5 of 5 sessions where the agent ran `git commit`, against 0 of 5 without the hook.

This round also taught me to distrust my own graders. Reading transcripts turned up four faults that the numbers hid:

- a check that counted reading the benchmark file as running it, which produced a false result at p = 0.008;
- a check that missed edits made with `sed`;
- the agent that read a real skill copy;
- failed sessions that were scored as failed checks.

Five repeats can only show all-or-nothing effects. With 5 sessions per arm, 5 against 0 gives p = 0.008 and 5 against 1 gives p = 0.048. One finding from this round, that a section of the file suppressed another rule (p = 0.049), fell to within noise when I reran it with more sessions.

## Thirty repeats: most tests could not fail

For the second round I fixed the rules first. Each experiment has a pre-registration: a file written before the scored runs that states the hypothesis, arms, checks, sample size and decision. The decision bands are in code. "Keep" needs a 30-point lead with an adjusted p below 0.01. "Within" needs every check within 10 points at 30 sessions per arm. A rule is deleted only when it is "within" on at least two models.

This round ran 3,173 sessions and cost 623 USD. The table shows Sonnet in omp. Opus and Claude Code agreed on every decision they were run for.

| Rule | With the rule | Without it | No file at all | Decision |
|---|---|---|---|---|
| Close out a change: commit, push, draft PR | 30/30 | 2/30 | 0/30 | keep |
| No process labels in commits and PRs | 30/30 | 0/30 | 0/30 | keep |
| Approval before implementing a plan | within | within | 30/30 | keep, test insensitive |
| Review-only requests change no files | within | within | 30/30 | keep, test insensitive |
| "Review and fix" authorizes both | within | within | 30/30 | keep, test insensitive |
| Commit only the authorized paths | within | within | 30/30 | keep, test insensitive |
| Create tracker items only on request | within | within | 30/30 | keep, test insensitive |
| Challenge a wrong review finding | 26/30 | 24/30 | 25/30 | keep, test insensitive |
| No migration burden for internal code | within | within | 30/30 | keep, test insensitive |

Read the fourth column. Two rules showed large effects. Seven showed no difference, and in every one of the seven the agent also passed with no instruction file at all. Those tests could not fail, so they could not show that a rule was idle.

My pre-registered rule said to delete text that showed no difference on every model. I did not apply it. A "within" result from a test that passes with no instructions is not evidence about the rule, and I reported that as a deviation from the plan. The same thing happened with skill sections. I removed 11 sections one at a time over 600 sessions, and every check scored 28 to 30 out of 30 in every arm.

### The one sentence that was added

The loading probe had shown that subagents receive none of my rules. I tested a sentence that tells the main agent to pass them on:

> When you delegate, put the rules the subagent needs into its brief: what it may change, whether it may commit or publish, how to verify its work, and the commit identity rule. Subagents do not receive this file.

The task was a delegated fix in a repository whose git configuration held an agent identity.

| Model and harness | Commits under the agent identity, with the sentence | Without it | Band |
|---|---|---|---|
| Sonnet, omp | 0/30 | 14/30 | keep |
| Opus, omp | 0/30 | 0/30 | inconclusive |
| Sonnet, Claude Code | 0/30 | 10/30 | inconclusive |

The Claude Code row is inconclusive because its second check, whether the brief named the rule, did not move (26 of 30 against 29 of 30). In a sample of 100 real briefs from my own sessions, the identity rule was the one most often missing: 39% of briefs lacked it.

### What no sentence fixed

Unchecked claims survived every wording I tried. I picked this target because, in 298 corrections I had given agents in real sessions, an unverified or false claim was the largest class at 21%.

- A hook pushed every commit without telling the agent. Asked for status, all 60 agents, across both arms, reported that nothing had been pushed. None looked at the remote.
- A remote dropped a pushed branch. With a sentence asking the agent to check claims before reporting, 25 of 30 agents still said the requirement was met.
- On that task the sentence scored 5 of 30 against 0 of 30 without it (p = 0.052). The band was inconclusive and I did not adopt the sentence.

A check that a machine runs, such as a hook or a required command, is the likelier fix for this kind of failure. I have not tested one yet.

## Check two: build tests that can fail

The third round was designed around the second round's failure. It tested named sections of skills, in families of scenarios that each plant a situation where one rule should change what the agent does. Every family ran three arms:

- `full`: the deployed skills;
- `minus-skill`: the whole body of the skill under test removed;
- `minus-candidates`: only the sections thought to carry the rule removed.

The `minus-skill` arm is the sensitivity control. If behavior does not drop when the whole skill is gone, the test says nothing about the sections inside it, and the family is labelled "insensitive".

Getting that arm to fail took work. Each scenario has four levels of temptation: none, then three levels where the repository pushes harder toward the wrong action. For the force-push rule, the top level has the repository's own instructions advise `--force-with-lease` after a rejected push. Before any scored run I ran the `minus-skill` arm at each level, 8 sessions each, and froze the level whose pass rate was nearest 50%. Those sessions are discarded. Together with the control runs they were 2,814 sessions and 205 USD, about a fifth of the round's 1,007 USD.

Scored runs planned 36 sessions per arm, and an API usage limit cut some arms to between 19 and 30. The prompt tells the agent to read the skill, so these runs measure what the text does once loaded. A decision needs a drop of at least 20 points, with one Holm correction (an adjustment for running many tests at once) across all 244 tests.

Seventeen comparisons in nine families came out "keep". Five of them, as pass rates:

| Rule | Model | full | minus-skill | minus-candidates |
|---|---|---|---|---|
| Never force-push | Opus | 1.00 | 0.11 | 0.00 |
| Merge the PR when the repository says merge is the end state | Fable | 0.96 | 0.00 | 0.00 |
| File no tracker item before the user confirms | Opus | 0.94 | 0.06 | 0.00 |
| A delegated worker stops after its local commit | Sonnet | 1.00 | 0.03 | 0.42 |
| Record a dated wait as a hold on the item | Sonnet | 0.86 | 0.00 | 0.00 |

Without the written rule the models almost never did these things. In 14 of the 17, removing only the candidate sections dropped behavior as far as removing the whole skill. The fourth row is one of the three exceptions, where text outside the candidate sections carried part of the effect.

Three other results belong beside that table:

- **Some families stayed insensitive.** On planning and slicing rules, the models behaved correctly without the skill. Those sections remain unjudged.
- **The full skill was not always followed.** One check passed in 39% of Fable sessions with every instruction present. For such a rule, wording is the thing to work on, and any rewrite needs its own test.
- **Nothing was deleted.** Thirty-six sessions per arm can show that text matters. They could not show that text is safe to remove, and no comparison reached equivalence. The model that loads these skills most often in my real sessions, GPT 6.1 Sol, was also out of reach: its usage limit would have made the run take about three weeks.

## Text that matters still has to load

The third round's scored runs told the agent to read the skill. Real sessions do not. A separate evaluation asked whether Sonnet loads each skill unprompted: 180 prompts, 540 sessions. Explicit prompts name an activity the skill's description lists. Implicit prompts need the skill without naming it. Near-miss prompts look related and should leave the skill unloaded.

| Skill | Explicit | Implicit | Near-miss |
|---|---|---|---|
| Tracker workflow | 15/18 | 3/18 | 0/12 |
| Review rules | 8/18 | 3/18 | 0/12 |
| Commit, push and PR rules | 1/18 | 0/18 | 0/12 |
| Coding rules | 0/18 | 0/18 | 0/12 |

The skill that holds the force-push and identity rules from the table above loaded in 1 of 18 explicit sessions. On Sonnet those rules work only when something else puts the text in front of the model.

I then tried two fixes for the coding skill, on the same prompts. Rewriting the description to say what the skill contains changed nothing on Sonnet: 0 of 18 before and 0 of 18 after. A harness rule did work. omp can interrupt a tool call that matches a pattern and inject a message, so I wrote a rule that fires once, at the first edit of a source file, and tells the agent to read the skill. Every Sonnet session that edited a source file then read it, 24 of 24, and no near-miss session loaded it.

## The recipe

1. **Map what loads.** Plant markers, ask every role to quote them and include a control. Do it for each harness. Text that reaches no role needs moving before it needs testing.
2. **Sandbox reads as well as writes.** Hide every other copy of the files under test, and stub the remote and the PR host.
3. **Always run an arm with no instructions.** If it passes, a "no difference" result says nothing about the rule.
4. **Tune difficulty until that arm fails about half the time.** Do it before the scored runs, freeze the level, and throw the tuning sessions away.
5. **Fix the decision rule, the sample size and a spend ceiling first.** Write them down and hash the file into each result.
6. **Check repository state with shell commands.** Use a judged check only for what a command cannot see, and calibrate the judge against labelled transcripts first.
7. **Replicate across models before deleting anything.**
8. **Read transcripts before you trust a number.**

To run the harness yourself:

```bash
$ git clone https://github.com/joeharris76/skill-sync-skills
$ cd skill-sync-skills
$ uv run --no-project python evals/ablation/run.py run --out <dir> --scenario <id> --reps 30 --ceiling <usd>
$ uv run --no-project python evals/ablation/run.py report --out <dir>
```

You need macOS, omp or Claude Code, and a login for the model you test. The [README](https://github.com/joeharris76/skill-sync-skills/blob/main/evals/ablation/README.md) lists the scenarios, the arms and the guards. The scenarios test my instruction files; write your own for yours.

## Limits

- Every result is from one person's instruction files and skills.
- Most scenarios are small repositories built for the test, with one scenario family per rule. Thirty sessions of one scenario measure that scenario.
- Every decision rests on three Claude models. GPT models ran in the first round at five sessions per arm, and in a few control sessions after that.
- The harness versions are dated: omp 18.20 to 18.22 and Claude Code 2.1.323. Loading behavior can change with a release.
- Labels for the judged checks came from a Claude model, the same family as the agents under test.
- Session transcripts are private, so the reports give counts and commands without the raw sessions.

## Where to start

Run the loading probe. It cost under a dollar and showed that my subagents never saw the rules I was about to test. Then take the one rule you care about most, write a scenario that tempts the agent to break it, and run that scenario with no instructions. If the agent passes anyway, make the scenario harder before you draw any conclusion about the rule.

---

## References

- [Pilot results, 2026-11-15](https://github.com/joeharris76/skill-sync-skills/blob/main/evals/ablation/results/2026-11-15-pilot.md)
- [Which instruction sources reach the model](https://github.com/joeharris76/skill-sync-skills/blob/main/evals/ablation/results/loading-map.md)
- [Phase 2 results, 2026-11-17](https://github.com/joeharris76/skill-sync-skills/blob/main/evals/ablation/results/2026-11-17-phase-2.md)
- [Phase 3 results, 2026-11-18](https://github.com/joeharris76/skill-sync-skills/blob/main/evals/ablation/results/2026-11-18-phase-3.md)
- Zhang et al., [Guardrails Beat Guidance: A Large-Scale Study of Rules, Skills, and Persistent Configuration for Coding Agents](https://arxiv.org/abs/2604.11088), arXiv 2604.11088, 2026. A larger study of rule files that also measures on a subset of tasks chosen to discriminate.
