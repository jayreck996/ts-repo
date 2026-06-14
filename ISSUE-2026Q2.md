ISSUE LOG
INSTRUCTION FOR AI MODEL:

ALWAYS ADD NEW ISSUE ENTRIES AT THE TOP, DIRECTLY BELOW THIS HEADER.

NEVER DELETE OR EDIT PREVIOUS ISSUE ENTRIES.

REQUIRED FORMAT FOR EACH ISSUE ENTRY:

## ISSUE:{NAME OF ENVIRONMENT} {YYYY-MM-DD HH:MM} → {CONTENT}

####### <!-- ANCHOR MARKER - ADD ALL NEW ISSUE ENTRIES DIRECTLY BELOW THIS LINE, NEVER DELETE OR EDIT PREVIOUS ISSUE ENTRIES-->
## ISSUE:ts-repo 2026-06-14 → would-update skill no longer finds latest branch — always reads main

Step 1 branch-detection loop removed. Skill previously iterated all non-main branches in the source repo and picked the one with the most recent commit date. This was fragile when two branches shared the same date (ts-toifood-web: 1-1-2 and 1-1-3 tied). Simplified to always read from main.


## ISSUE:ts-repo 2026-06-14 → target names renamed — ts-back to ts-toifood-back, ts-web to ts-toifood-web

`target` field in targets.json renamed from short aliases to match output repo suffix convention. Ensures pipeline target names are unambiguous when multiple orgs are in scope.


## ISSUE:ts-repo 2026-06-14 → skill had hardcoded category list — didn't reflect actual could/ contents per repo

would-update.md step 3 looped over a fixed 8-category list regardless of what exists in the output repo's could/ directory. Fixed: skill now discovers categories by listing could/ in the output repo at runtime.

## ISSUE:ts-repo 2026-06-14 → toifood repo renames broke outputRepo paths and skill could/ reads

`toifood/ts-back` and `toifood/ts-web` renamed to `toifood/-ts-toifood-back` and `toifood/-ts-toifood-web`. Two breakages: (1) targets.json outputRepo fields pointed to old names → 404 on writes; (2) skill derived output repo path from $ARGUMENTS — no longer matched. Fixed via targets.json update + OUTPUT_REPO env var passed from listener to skill.


## ISSUE:ts-repo 2026-06-14 → would-update-md-test.js is write-logic only — not full end-to-end

Test script covers: JSON sanitizer, anchor insertion, GitHub API write. Does not cover: Claude skill run, listener HTTP server, or GitHub Actions trigger. True end-to-end still requires a real skill run (~5 min, Claude Pro). Use the test script to rule out listener write bugs before triggering a full run.


## ISSUE:ts-repo 2026-06-14 → execSync blocked event loop — stale TCP connections triggered phantom skill runs

`toigroup-listener.js` used `execSync` for the Claude skill, blocking the event loop for ~5 min per run. Incoming TCP connections during a skill run queued in the OS listen backlog. When the skill finished, Node.js accepted the stale connections and launched extra skill runs. Fixed: `execFile` (async) + `skillRunning` boolean guard — concurrent requests get 202 but are dropped with a log entry.

## ISSUE:ts-repo 2026-06-14 → anchor insertion silently failed on fresh files — regex required trailing newline

`writeEntriesToGitHub` used regex matching ANCHOR MARKER + newline. Files bootstrapped via GitHub API had no trailing newline — anchor was the last byte. Regex never matched, replace returned unchanged content. GitHub API PUT succeeded (no-op), logged ✅ — silent data loss. Fixed with indexOf + slice — handles both EOF-at-anchor and mid-file cases.

## ISSUE:ts-repo 2026-06-14 → skill outputs raw newlines inside JSON string values — parse fails

Claude skill outputs a JSON array. For ts-web (frontend codebase), analysis entries contained multi-line text with literal newlines (0x0A) inside JSON strings — invalid JSON. ts-back happened to produce clean JSON. Fixed by sanitizing skill output before parsing: replace raw newlines/tabs inside matched JSON string tokens.

## ISSUE:ts-repo 2026-06-14 → ts-web bootstrap: empty repo had no main branch — timing checkout failed

`toifood/ts-web` was created via GitHub UI but never had an initial commit. Default branch main existed in config but had no commits (size: 0). actions/checkout failed with 'could not find remote ref refs/heads/main'. Fixed with a bootstrap commit via GitHub Contents API.


## ISSUE:toifood 2026-06-13 → -toifood owns functional pipeline code — violates separation of concerns

`toigroup-listener.js`, `would-update.md` skill, and trigger/timing workflows all live in `toifood/-toifood`. This couples org-level docs to pipeline execution logic. When a second org is added, there is no clean home for shared pipeline code — it would either duplicate into each org or keep accumulating in `-toifood`.
## ISSUE:toifood 2026-06-13 → skill uses /tmp/ zip extraction — local filesystem dependency

`would-update.md` steps 1–2 download a zipball to `/tmp/toifood-source.zip` and extract to `/tmp/toifood-source/`. Creates a local disk dependency on wherever the skill runs. Should read source files via GitHub API directly instead.
## ISSUE:toifood 2026-06-13 → listener GitHub API writes silently failing — TOIFOOD_CROSS_REPO_TOKEN likely missing from PM2 env

GH Actions `would-update` run (03:47 UTC / 15:47 NZST) got 202 ✅, skill ran async, produced 16 JSON entries ✅. `writeEntriesToGitHub` in `toigroup-listener.js` made no commits to `toifood/ts-back/could/` — silent failure (caught by try/catch, logged only). Most likely cause: `TOIFOOD_CROSS_REPO_TOKEN` not set in PM2 env for `toigroup-listener` process.

Local `ts-back` clone has stale uncommitted `could/` changes from earlier local tests (entries timestamped 15:10–15:19 NZST). These are not from the listener pipeline — the listener never touches the local repo. Should be discarded with `git restore .`.
## ISSUE:toifood 2026-06-13 15:48 → RESOLVED — full pipeline live, GitHub Actions passes in 4s

End-to-end confirmed working. GitHub Actions (ubuntu-latest) → POST `local.toigroup.co.nz/would-update` → 202 Accepted in 4s → skill running async on Mac Mini → writes 16 entries to `ts-back/could/` via GitHub API.

Three blockers resolved:
1. Cloudflare WAF `block-ollama-no-secret` rule — fixed by adding `x-secret: TOIGROUP_SECRET` header
2. Cloudflare proxy 100s timeout — fixed by async 202 pattern (listener responds immediately, skill runs in background)
3. Tunnel config pointing to Ollama port 11434 — updated to 3456

## ISSUE:toifood 2026-06-13 15:23 → Cloudflare Access blocking local.toigroup.co.nz — 403 on tunnel requests

`toigroup-listener` confirmed working locally (port 3456, 9-min full skill run, 1678 bytes returned). Tunnel config updated to route `local.toigroup.co.nz → localhost:3456`. But inbound requests via Cloudflare return 403 — Access policy on `*.toigroup.co.nz` is intercepting before the tunnel.

**Options:**
- A: Zero Trust → Access → Applications — add exception for `local.toigroup.co.nz` (X-Token header is sufficient auth)
- B: Create Cloudflare Access service token — add `CF-Access-Client-Id` + `CF-Access-Client-Secret` headers to GitHub Actions curl (double auth, more locked down)

## ISSUE:toifood 2026-06-13 14:45 → Mac Mini is a pure Claude runner — no local state, skill outputs JSON, GitHub Actions writes

Revised from earlier Cloudflare Tunnel entry. Mac Mini does not clone ts-back, write files, or push to GitHub. Its only job: receive POST → run `claude --print "/would-update ts-back"` → return JSON to caller.

Skill redesigned to output structured JSON to stdout instead of writing to `$GITHUB_WORKSPACE`. GitHub Actions parses the JSON response and writes each entry to ts-back via GitHub API.

Mac Mini persistent state: `~/.claude/` only (Claude Pro OAuth).

**Pending:**
- [ ] Redesign `would-update.md` skill — output JSON array `[{path, entry}]` instead of writing files
- [ ] Simplify `toigroup-listener.js` — run claude, return stdout, done
- [ ] Update `would-update.yml` — parse JSON response, write each entry to ts-back via GitHub API

## ISSUE:toifood 2026-06-13 14:45 → retiring self-hosted runner — switching to Cloudflare Tunnel push model

Self-hosted runner (`toifood-runner`, PM2 id 7) works but requires a persistent agent process and manual re-auth when Claude Pro token expires. New approach: GitHub Actions `ubuntu-latest` POSTs to `local.toigroup.co.nz/would-update` via Cloudflare Tunnel → Mac Mini listener runs skill locally → pushes back to GitHub. No runner agent needed. Cloudflare Tunnel (`toigroup-tunnel`, already running) handles inbound connectivity.

**Pending:**
- [ ] Add ingress rule to `~/.cloudflared/config.yml` for `local.toigroup.co.nz` → `localhost:3456`
- [ ] Add CNAME DNS record in Cloudflare for `local.toigroup.co.nz`
- [ ] Build `toifood-listener.js` on Mac Mini, add to PM2
- [ ] Add `MACMINI_TRIGGER_TOKEN` to `toifood` org secrets
- [ ] Update `would-update.yml` — swap `runs-on: [self-hosted, mac-mini]` for `ubuntu-latest` + curl step

## ISSUE:toifood 2026-06-13 → monorepo attempted and reverted — every analysis commit polluted -toifood git history; split repos confirmed as correct structure

Absorbing ts-back into -toifood as a subdirectory was tried and reverted. Core problem: the weekly would-update workflow commits (CSV log, could/ entries) all land in -toifood's git history rather than ts-back's own history. Secondary risk: coupling -toifood and ts-back makes independent team access, archiving, or deprecation harder. Decision: keep repos split. -toifood is the hub/config layer; ts-back is a service layer with its own repo and workflow.
## ISSUE:toifood 2026-06-13 → push model dependency: if Cloudflare Tunnel on mac-mini is down, GitHub Actions call fails immediately with no retry

In the push model, GitHub Actions (ubuntu-latest) sends an HTTP POST to the mac-mini via Cloudflare Tunnel URL. If the tunnel is down, the job fails instantly — no queue, no 24h wait. Must ensure `cloudflared` service is running and tunnel is healthy on mac-mini before scheduled runs. Unlike the polling model, there is no grace period.
## ISSUE:toifood 2026-06-13 → mac-mini runner must be online when schedule fires; job dropped after 24h if runner offline

GitHub queues the job when the cron fires, but the mac-mini runner must be running and connected to pick it up. If the mac-mini is offline or the runner service is stopped, the job sits in queue. GitHub drops queued jobs after 24h with no retry. No alert is sent — the run simply never appears. Monitor via GitHub Actions tab if runs go missing.
## ISSUE:toifood 2026-06-13 → ts-back renamed to -ts-back inside -toifood; standalone toifood/ts-back repo still exists on GitHub

`ts-back/` inside `-toifood` renamed to `-ts-back/` (40 files). Leading dash requires `git mv ts-back ./-ts-back` (dot-slash prefix) and `git add -A` — bare `git add -ts-back/` fails, git parses the `-` as a flag. All internal references updated in `.github/workflows/ts-back-would-update.yml`, `-ts-back/would-update-content.js`, `-ts-back/would-update-csv.js`. The standalone `toifood/ts-back` GitHub repo and local clone at `GitHub\ts-back` are NOT removed — still live. Needs explicit archival decision before decommission.
## ISSUE:toifood 2026-06-08 → RESOLVED — would-update-csv.js regex had corrupted → bytes, CSV log never written

`ts-back/would-update-csv.js` headline regex contained double-encoded UTF-8 bytes instead of the correct `→` (U+2192). Every `would-update` run succeeded at analysis + commit but failed at the CSV log step with "No headlines found" — exit code 1.

Fix: replaced corrupted byte sequence with correct `→` in regex. Pushed `5f41d91` to `toifood/ts-back`. Run `27121772176` confirmed both jobs passing.

## ISSUE:toifood 2026-06-08 → RESOLVED — document structure live

All pending actions completed:
- [x] `ASSET-V1.md` → `ASSET-2026Q2.md`, `ISSUE-V1.md` → `ISSUE-2026Q2.md`
- [x] `would-update.yml` added with quarterly cron
- [x] `could/` and `would/` quarterly files created
- [ ] Content type undecided — org activity vs business docs — open

## ISSUE:toifood 2026-06-08 → pending — full document structure setup

**Pending actions:**
- [ ] Rename `ASSET-V1.md` → `ASSET-2026Q2.md`, `ISSUE-V1.md` → `ISSUE-2026Q2.md`
- [ ] Add `would-update.yml` with quarterly cron calling `toiflow/-toiflow/.github/workflows/must-update-timing.yml@main`
- [ ] Trigger timing job to create `could/` and `would/` quarterly files
- [ ] Decide content type: org activity summaries vs business docs (price, usage) — rename CONTENT category when decided
## ISSUE:toifood 2026-06-08 → toifood-dev org created — prod source repos to migrate from jayreck996

`toifood-dev` GitHub org created 2026-06-08. Houses production source code repos (`ts-toifood-back`, `ts-toifood-front`, `ts-toifood-web`), separate from `toifood` (pipeline/analysis).

**Pending after transfer:**
- Update Mac Mini git remote: `~/ts-toifood-back` points to `jayreck996/ts-toifood-back` — must update after transfer (PM2 service runs from this path)
- Update `would-update.md` skill: source URL `jayreck996/ts-toifood-{suffix}` → `toifood-dev/ts-toifood-{suffix}`
- Verify `TOIFOOD_CROSS_REPO_TOKEN` has `repo` access to `toifood-dev` repos

## ISSUE:toifood 2026-06-08 → summary index deferred — useful once ts-front and ts-web are live

A `-toifood/README.md` summary index (linking to each pipeline repo's `could/` analysis, last run timestamp, category list) was considered. Decision: defer until ts-front and ts-web are live and the org is shared with other team members. No value adding it for a single pipeline repo. When added: `would-update` skill writes the last run timestamp + GitHub links to `could/` per category as a final step.
## ISSUE:toifood 2026-06-07 16:00 → skill was reading wrong branch — zipball/latest unresolved

`zipball/latest` in the skill was an ambiguous ref. GitHub treats it as a literal branch/tag name "latest" — since no such ref exists on `ts-toifood-back`, behavior was undefined (likely falling back to default branch `main`). `main` has no `-MUST/` directory, so the 5 standard category prompts were not being read.

**Fix:** skill now uses `compare/main...{branch}` per branch to find creation date, picks newest created. First successful detection: `1-1-1` (created 2026-06-07), which has `-MUST/`.

## ISSUE:toifood 2026-06-07 16:00 → two clones of ts-toifood-back found locally

Two local clones of `jayreck996/ts-toifood-back` exist:
- `~/ts-toifood-back` — branch `1-1-1`, active service (PM2 runs from here), has `-MUST/`
- `~/Documents/GitHub/ts-toifood-back` — branch `main`, stale reference clone, no `-MUST/`

Not a conflict — different branches, different purposes. `~/ts-toifood-back` is the live copy.
## ISSUE:toifood 2026-06-07 13:58 → runner group blocked public repos — fixed before first successful run

**Symptom:** Self-hosted runner online and listening but not picking up queued jobs from `ts-back`.

**Root cause:** Default runner group had `allows_public_repositories: false`. `ts-back` is a public repo — jobs were silently dropped.

**Fix:** `gh api --method PATCH orgs/toifood/actions/runner-groups/1 --field allows_public_repositories=true`

**Hard rule:** When adding a self-hosted runner to a free GitHub org, always check runner group public repo access if any repos are public.

## ISSUE:toifood 2026-06-07 13:09 → self-hosted runner runs under jayreck account, not jayagent

Decision: use `jayreck` account on Mac Mini for the GitHub Actions self-hosted runner, not `jayagent`.

**Why `jayreck`:** Claude Code is already installed and Claude Pro OAuth is already authenticated under `jayreck` (`~/.claude/` exists and is valid). PM2 is already running under this account managing both Cloudflare tunnels (`cloudflare-tunnel`, `toigroup-tunnel`). Adding the runner to PM2 follows the same pattern — no new account setup, no new auth.

**Why not `jayagent`:** `jayagent` would require a separate Claude Code install + fresh OAuth browser login. No benefit over `jayreck` which is already fully configured.

**Pending:** Runner registration only — `toifood` org → Settings → Actions → Runners → New → macOS ARM64 → `./config.sh` → `pm2 start run.sh --name toifood-runner` → `pm2 save`.

## ISSUE:toifood 2026-06-07 → GitHub Actions hosted runner cannot use Claude Pro — OAuth auth is interactive-only

Claude Code CLI authenticates via Claude Pro OAuth (browser login → token saved to `~/.claude/`). GitHub Actions hosted runners (`ubuntu-latest`) are ephemeral VMs — blank slate on every run, no `~/.claude/`, no browser available to complete the OAuth flow. `claude` fails immediately with "not authenticated".

**Why `ANTHROPIC_API_KEY` solves it but breaks the business goal:** API key skips OAuth entirely and works headlessly, but it is separate billing from Claude Pro — defeats the purpose of aligning with the existing subscription.

**Why self-hosted runner (Mac Mini) solves it:** `jayagent` on the Mac Mini already completed the OAuth flow once manually. `~/.claude/` persists between runs. GitHub Actions dispatches to the Mac Mini runner, `claude` reads the existing token, and the job executes under Claude Pro auth. Token refreshes automatically while the subscription is active.
## ISSUE:toifood 2026-06-07 → pipeline LLM decision — Claude skill via Mac Mini self-hosted runner

**Decision:** Use Claude Code CLI (Claude Pro) running on the Mac Mini server as a GitHub Actions self-hosted runner. GitHub Actions triggers on schedule → dispatches to Mac Mini → `claude --print "/would-update ts-back"` → writes to category docs → commits and pushes.

**Why not GitHub-hosted runner:** GitHub Actions hosted runners (`ubuntu-latest`) cannot use Claude Pro — they require `ANTHROPIC_API_KEY` (separate API billing). Claude Pro OAuth auth is machine-local.

**Why Mac Mini is valid:** Mac Mini is always-on infrastructure (PM2-managed, auto-restarts after Friday 3am reboot, `jayagent` auto-login). Not a "local machine" in the transient sense — it is a server.

**Why not Ollama (toiflow pattern):** Business goal is to align with Claude Pro subscription. Ollama remains available as fallback.

**Pending setup:**
1. GitHub Actions self-hosted runner installed on Mac Mini (`jayagent`) as LaunchAgent
2. Claude Code installed + Claude Pro OAuth auth on Mac Mini
3. `would-update.md` skill updated from Windows/PowerShell → macOS/bash
4. `would-update.yml` workflow updated to `runs-on: [self-hosted, mac-mini]`
## ISSUE:toifood 2026-06-07 → Claude skill tool execution requires local machine — GitHub Actions hosted runners incompatible

Claude skills split into two parts: LLM inference runs on Anthropic servers (covered by Claude Pro), tool execution (Bash, Read, Write, file I/O) runs on the local machine. GitHub Actions hosted runners (`ubuntu-latest`) have no connection to the local machine, so Claude's tool calls have nowhere to land.

**Options excluding local machine:**
- `anthropics/claude-code-action` — runs Claude Code in GitHub Actions but requires `ANTHROPIC_API_KEY` (API billing, not Claude Pro)
- Direct `api.anthropic.com` call — same billing
- Self-hosted runner — uses Claude Pro but requires local machine to be on

**Conclusion:** Excluding local machine = Anthropic API billing (~$1–3/month at Haiku rates). Decision pending.
## ISSUE:toifood 2026-06-07 → Claude skills are CLI-only — cannot be called from GitHub Actions

Confirmed: Claude skills run in the interactive Claude Code CLI session covered by Claude Pro. GitHub Actions cannot invoke them. Resolved by running the `/would-update` skill locally via wmux cron instead — no GitHub Actions LLM dependency, no `ANTHROPIC_API_KEY` needed.
## ISSUE:toifood 2026-06-07 → Claude skills (Claude Code) are CLI-only — not callable from GitHub Actions

Confirmed: skills run in the interactive CLI session, covered by Claude Pro subscription. Cannot be invoked from GitHub Actions workflows. Rules out using Claude Code/skills as the pipeline LLM backend — `api.anthropic.com` is used instead (`ANTHROPIC_API_KEY` org secret).