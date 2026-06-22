ASSET LOG
INSTRUCTION FOR AI MODEL:

ALWAYS ADD NEW ASSET ENTRIES AT THE TOP, DIRECTLY BELOW THIS HEADER.
####### <!-- ANCHOR MARKER - ADD ALL NEW ASSET ENTRIES DIRECTLY BELOW THIS LINE, NEVER DELETE OR EDIT PREVIOUS ASSET ENTRIES-->
## ASSET:ts-repo 2026-06-22 -> split log confirmed working -- TRIGGER-LOG.log and LISTENER-LOG.log both created, no 409

Test run 27921457566: all three trigger jobs passed (success), no 409 errors. TRIGGER-LOG.log created with 3 entries (one per target). LISTENER-LOG.log created with 1 entry (ts-toifood-back WRITE_OK 14/14). Log race permanently eliminated. Remaining issue: skillRunning flag drops the 2nd and 3rd triggers -- only one target writes per run.


## ASSET:ts-repo 2026-06-22 -> GitHub Contents API 409 root cause confirmed -- optimistic lock, not a concurrency feature

GitHub Contents API uses SHA as an optimistic lock: GET returns current SHA, PUT must include that SHA to prove the caller saw the latest version. If two writers GET simultaneously they both hold the same SHA -- whichever PUTs second gets 409 because the file moved on. GitHub has no merge, no queue, no retry -- it rejects and the caller must re-fetch. Identical to a git push conflict. No API-level primitive exists to coordinate concurrent writers -- serialisation must be enforced by the caller (max-parallel: 1 for GH Actions, skillRunning flag for Mac Mini listener). Split log files eliminate the cross-system race by giving each system its own file with a single writer.


## ASSET:ts-repo 2026-06-22 → split-log deployed — listener now writes to LISTENER-LOG.log, GH Actions to TRIGGER-LOG.log

git pull (3e3c226 → 6f9fea5) + pm2 restart toigroup-listener on Mac Mini. toigroup-listener.js LOG_PATH updated to would/LISTENER-LOG.log. would-update-md.yml log step updated to would/TRIGGER-LOG.log. Two independent writers now have separate files — 409 race permanently eliminated. ~/.claude/commands/would-update.md resynced.
## ASSET:ts-repo 2026-06-22 -> split log implementation started -- TRIGGER-LOG.log in would-update-md.yml, LISTENER-LOG.log in toigroup-listener.js

Implementing two-file split to eliminate 409 race permanently. Changes: (1) would-update-md.yml Log run outcome step -- update all WOULD-UPDATE-MD-LOG.log references to would/TRIGGER-LOG.log, (2) toigroup-listener.js appendToRunLog -- update LOG_PATH constant from would/WOULD-UPDATE-MD-LOG.log to would/LISTENER-LOG.log. WOULD-UPDATE-MD-LOG.log retained as archive. Mac Mini must git pull after both changes are pushed before next run.


## ASSET:ts-repo 2026-06-22 -> two-writer race on WOULD-UPDATE-MD-LOG.log identified -- split into TRIGGER-LOG.log and LISTENER-LOG.log

Root cause fully understood: GitHub Actions trigger jobs and Mac Mini appendToRunLog are independent async writers with no lock on the shared log file. max-parallel: 1 serialised GH Actions jobs but cannot control when the Mac Mini fires. Decision: split into two files -- would/TRIGGER-LOG.log (GH Actions only) and would/LISTENER-LOG.log (Mac Mini listener only). Each file has exactly one writer so SHA is always current -- 409 race eliminated permanently with no retry logic needed. Requires updating would-update-md.yml log step path and toigroup-listener.js appendToRunLog path.


## ASSET:ts-repo 2026-06-22 → local repo pulled to 3e3c226, global skill resynced with suffix fix

git pull (b2b9ca0 → 3e3c226) on Mac Mini. ~/.claude/commands/would-update.md overwritten from repo — now includes explicit suffix cases: ts-toifood-back→back, ts-toifood-web→web, fallback changed to strip ts-toifood- prefix. ts-toifood-back should resolve to toifood-dev/ts-toifood-back correctly on next run.
## ASSET:ts-repo 2026-06-20 → global skill synced, Claude re-auth completed, would-update-md set to daily

~/.claude/commands/would-update.md overwritten from jayreck996/ts-repo via GitHub API — now matches repo: dynamic category discovery, no hardcoded list, emits N×2 objects. Claude Pro re-auth completed after account switch. would-update-md.yml cron changed from '0 6 * * 1' (weekly Monday) to '0 6 * * *' (daily 06:00 UTC = 18:00 NZST), commit 16b9b52.
## ASSET:ts-repo 2026-06-22 -> would-update skill suffix mapping fixed -- ts-toifood-back and ts-toifood-web now resolve to correct source repos

Added explicit case entries to step 2 of would-update.md: ts-toifood-back -> suffix="back" -> toifood-dev/ts-toifood-back, ts-toifood-web -> suffix="web" -> toifood-dev/ts-toifood-web. Fallback changed from ${ARGUMENTS#ts-} to ${ARGUMENTS#ts-toifood-} so future targets following the ts-toifood-* naming pattern resolve correctly without needing an explicit case.


## ASSET:ts-repo 2026-06-22 -> would-update-md fix simplified -- max-parallel: 1 eliminates log race without restructuring jobs

Root cause of Jun 20-21 409 failures: 3 parallel matrix jobs (ts-toifood-back, ts-toifood-web, ts-toifood) all fetch the same log file SHA simultaneously, first writer wins, rest get 409. Fix: add max-parallel: 1 to the trigger job matrix strategy -- jobs run serially, each log step sees the SHA the previous job just wrote. No new jobs, no artifact handoff, no dynamic output keys. Trigger time increases from ~30s to ~90s worst case -- acceptable since listener returns 202 immediately.


## ASSET:ts-repo 2026-06-22 -> would-update-md fix approach decided -- log step moved to sequential job after matrix completes

Fix for the Jun 20-21 409 race condition: remove Log run outcome from the parallel trigger matrix, add a new log job (needs: trigger, if: always()) that iterates all targets serially in a single shell loop. Each iteration re-fetches the SHA of WOULD-UPDATE-MD-LOG.log immediately before its PUT -- no two writes share a SHA. Trigger layer unchanged (still parallel, fail-fast: false). Known limitation: matrix job outputs use dynamic keys (result-<target>) which require static declaration -- may need artifact-based handoff if target count grows.


## ASSET:ts-repo 2026-06-22 -> would-update-md race condition root-caused -- two daily runs failed, trigger layer was healthy both days

Jun 20 and Jun 21 cron runs both failed at the log step only. Trigger layer confirmed healthy: ts-toifood-web returned 202 on Jun 21. Root cause: parallel matrix jobs all fetch the same SHA for WOULD-UPDATE-MD-LOG.log and race to PUT -- first writer wins, rest get HTTP 409. Diagnosed from gh run view --log-failed on run 27897564824. No docs corruption, no listener issue. Fix pending: extract Log run outcome into a sequential log job after the matrix completes.


## ASSET:ts-repo 2026-06-19 → two-layer logging fully confirmed end-to-end — both trigger and write layers working

Trigger layer (GitHub Actions → log): every run writes outcome to WOULD-UPDATE-MD-LOG.log regardless of result. Write layer (listener → log): appendToRunLog fires after writeEntriesToGitHub resolves, logging WRITE_OK / WRITE_PARTIAL / WRITE_FAIL with counts. Confirmed entries: 04:13 UTC WRITE_PARTIAL 6 ok 10 failed, 04:57 UTC WRITE_PARTIAL 6 ok 10 failed, 07:38 UTC WRITE_FAIL skill error. Log is now the single source of truth for diagnosing pipeline runs without SSH access to Mac Mini.
## ASSET:ts-repo 2026-06-19 → local repo pulled to ff966fc — listener restarted on latest code

git stash + git pull (10fdc0f → ff966fc) + pm2 restart toigroup-listener on Mac Mini. Local working tree now matches remote. Listener running updated toigroup-listener.js. WRITE_PARTIAL root cause cleared.
## ASSET:ts-repo 2026-06-19 → appendToRunLog confirmed working — first write-layer entry logged

2026-06-19 04:13 UTC | ts-toifood | WRITE_PARTIAL | --- | 6 ok, 10 failed of 16

Write-layer logging end-to-end confirmed. Both layers now writing to WOULD-UPDATE-MD-LOG.log on every run.
## ASSET:ts-repo 2026-06-19 → appendToRunLog deployed to correct path — write-layer logging now active

Copied updated toigroup-listener.js to `/Users/jayreck/toifood/ts-repo/toigroup-listener.js` (actual PM2 script path confirmed via `pm2 show 6`). PM2 restarted. appendToRunLog with TOIFOOD_CROSS_REPO_TOKEN now live in the running process.

**Hard rule:** Always verify PM2 script path via `pm2 show <id>` before copying updated files — cwd and script path are independent.
## ASSET:ts-repo 2026-06-19 → ISSUE-2026Q2.md + ASSET-2026Q2.md consolidated — anchor moved to top, dual insert zones eliminated

Root cause: anchor marker sat below Mac Mini entries and a "NEVER DELETE/REQUIRED FORMAT" block. Mac Mini wrote above the block; Claude Code wrote below the anchor. Both wrote to ts-repo docs but into different file zones — neither could see the other's entries. Fix: anchor marker moved to directly after "ALWAYS ADD NEW ENTRIES AT THE TOP" header line. "NEVER DELETE/REQUIRED FORMAT" block removed. All entries now in one zone, newest-first. Commits e8027a3 (ISSUE) and 400ace50 (ASSET). Future inserts from both Mac Mini and Claude Code land at the same position.
## ASSET:ts-repo 2026-06-19 → WOULD-UPDATE-MD-LOG.log live — trigger-layer outcome logged on every run

Proposal implemented in jayreck996/ts-repo/would/WOULD-UPDATE-MD-LOG.log. Workflow updated: id:trigger captures http_code as step output; Log run outcome step (if:always()) prepends one-line record after every run. Two bugs fixed during test: permissions:contents:write added to workflow; HTTP 530 (not 1033) used for Cloudflare tunnel-down note. First confirmed log entry: 2026-06-19 01:40 UTC | ts-toifood | failure | 530. Write-layer logging (appendToRunLog in listener) pending token verification.
## ASSET:ts-repo 2026-06-19 → toigroup-tunnel PM2 registration hardened — explicit cloudflared command survives reboot

Old PM2 registration used an unclear command that silently failed to relaunch after reboot. Re-registered with explicit full command:
`pm2 start cloudflared --name toigroup-tunnel -- tunnel --config ~/.cloudflared/toigroup.yml run`

This command is now in `~/.pm2/dump.pm2` — will correctly relaunch cloudflared after every reboot. Confirmed: 4 connections registered on next start.

**Hard rule:** After any PM2 re-registration, verify the process stays alive for >30s — PM2 "online" status does not confirm the underlying daemon is connected.
## ASSET:ts-repo 2026-06-19 → toigroup-tunnel re-registered in PM2 — tunnel confirmed live

Deleted stale PM2 id 3, re-registered as id 7 with explicit command:
`pm2 start cloudflared --name toigroup-tunnel -- tunnel --config ~/.cloudflared/toigroup.yml run`

4 connections registered (mel01, mel02, akl01 ×2). `workflow_dispatch` confirmed end-to-end:
`2026-06-19 02:28 UTC | ts-toifood | success | 202 | listener accepted`

PM2 state saved.
## ASSET:ts-repo 2026-06-19 → appendToRunLog refactored — uses TOIFOOD_CROSS_REPO_TOKEN directly

Commit: `e05a3b2`

TOIFOOD_CROSS_REPO_TOKEN confirmed admin+push on jayreck996/ts-repo. Removed TSREPO_TOKEN from listener code and PM2 env. appendToRunLog() now reads TOIFOOD_CROSS_REPO_TOKEN — same token used for all GitHub API writes in the listener. No new secrets needed.
## ASSET:ts-repo 2026-06-19 → end-to-end run logging added to would/WOULD-UPDATE-MD-LOG.log

Commits: `69a26e5` (workflow), `f3d065a` (listener)

Two-layer logging — every run now leaves two entries in `would/WOULD-UPDATE-MD-LOG.log`:

**Layer 1 — trigger (GitHub Actions → listener):** `would-update-md.yml` — `Log run outcome` step (`if: always()`) captures `http_code` from the curl and prepends a line after every run. Covers: 000 timeout, 1033 Cloudflare/Mac Mini off, 401/403 auth rejected, 202 accepted.

**Layer 2 — write (listener → GitHub API):** `toigroup-listener.js` — `appendToRunLog()` prepends a line after `writeEntriesToGitHub` resolves. `writeEntriesToGitHub` now returns `{ ok, fail }` counts. Called at every exit point: config error, skill error, no JSON, parse fail, `WRITE_OK` / `WRITE_PARTIAL` / `WRITE_FAIL`.

Log format: `{YYYY-MM-DD HH:MM UTC} | {target} | {status} | {http_code or ---} | {note}`

**Requires:** `TSREPO_TOKEN` set in PM2 env on Mac Mini with write access to `jayreck996/ts-repo`.

## ASSET:ts-repo 2026-06-14 → would-update step 4 fixed — explicitly constrained to N discovered categories only

Updated step 4: "For each of the N discovered categories × ISSUE + ASSET … Use only the categories returned by step 3 — do not add or invent categories." Commit 10fdc0f. ts-toifood next run will emit 3×2=6 entries with 0 ❌.
## ASSET:ts-repo 2026-06-14 → listener reads targets.json from GitHub — no pm2 restart on target changes

fetchTargets() fetches jayreck996/ts-repo/contents/targets.json via GitHub API with 60s in-memory cache. Listener auto-refreshes within 60s of any targets.json push — no pm2 restart needed. Falls back to cached targets on network errors. GitHub Actions already read targets.json from repo checkout — both sources now consistent.

## ASSET:ts-repo 2026-06-14 → targets updated to new repo names

| target | outputRepo |
|---|---|
| ts-toifood-back | toifood/-ts-toifood-back |
| ts-toifood-web | toifood/-ts-toifood-web |
| ts-toifood | toifood/-ts-toifood-dev |


## ASSET:ts-repo 2026-06-14 -> would-update-md-test.js fixed and passing — 4/4 x 2 targets

| Fix | Detail |
|---|---|
| QUARTER undefined | Added `const QUARTER = ...` at top of script |
| Stale default target | `ts-web` -> `ts-toifood-web` |

Test run results:

| Check | ts-toifood-back | ts-toifood-web |
|---|---|---|
| JSON sanitizer | PASS | PASS |
| Anchor insertion (no trailing newline) | PASS | PASS |
| Anchor insertion (with trailing newline) | PASS | PASS |
| GitHub API write | PASS | PASS |


## ASSET:ts-repo 2026-06-14 → would-update skill simplified — source branch hardcoded to main

Removed step 1 branch-detection loop. Skill now sets `latestBranch=\"main\"` directly. All gh API reads in step 2 use main branch of toifood-dev/ts-toifood-{suffix}.


## ASSET:ts-repo 2026-06-14 -> targets renamed to match output repo names

| Before | After |
|---|---|
| ts-back | ts-toifood-back |
| ts-web | ts-toifood-web |

outputRepo and tokenSecret fields unchanged - only the target identifier updated in targets.json.


## ASSET:ts-repo 2026-06-14 → skill categories now discovered dynamically from could/ at runtime

Removed hardcoded category list from would-update.md. Step 3 now lists `could/` in the output repo via GitHub API, extracts unique uppercase prefixes, reads each header for CUSTOM PROMPT + PATHS, and generates N×2 entries. Different repos can have entirely different category sets — skill adapts with no code changes.

## ASSET:ts-repo 2026-06-14 → toifood repo renames handled — targets.json + OUTPUT_REPO env var

`toifood/ts-back` → `toifood/-ts-toifood-back`, `toifood/ts-web` → `toifood/-ts-toifood-web`.

| Change | Detail |
|---|---|
| targets.json | outputRepo fields updated to new names |
| toigroup-listener.js | passes OUTPUT_REPO env var to skill |
| would-update.md step 3 | uses $OUTPUT_REPO instead of deriving from $ARGUMENTS |


## ASSET:ts-repo 2026-06-14 → would-update-md-test.js passed all 4 checks on ts-web

Run: `node would-update-md-test.js ts-web`

| Check | Result |
|---|---|
| JSON sanitizer (raw newlines injected) | ✅ |
| Anchor insertion — no trailing newline | ✅ |
| Anchor insertion — with trailing newline | ✅ |
| GitHub write — entry visible in toifood/ts-web/could/ | ✅ |

**Scope:** write-logic unit test only — does not invoke Claude or the listener HTTP server. For true E2E, POST directly to listener: `curl -X POST https://local.toigroup.co.nz/would-update -H 'x-secret: ...' -H 'X-Token: ...' -d '{"target": "ts-web"}'` (~5 min, Claude Pro tokens).


## ASSET:ts-repo 2026-06-14 → ts-web confirmed working end-to-end, listener hardened

| Fix | Detail |
|---|---|
| ts-web bootstrapped | README + 16 could/*-2026Q2.md files created in toifood/ts-web |
| Anchor insertion | indexOf + slice replaces regex — handles no-trailing-newline case |
| JSON sanitizer | Raw newlines/tabs in skill JSON strings auto-escaped before parse |
| Async skill run | execSync → execFile (non-blocking) — event loop stays responsive |
| Busy guard | skillRunning flag — stale TCP connections dropped, no cascade runs |
| End-to-end result | 16 entries written to toifood/ts-web/could/ ✅ |

## ASSET:ts-repo 2026-06-14 → would-update-md-test.js — local test harness, no GH Actions needed

`ts-repo/would-update-md-test.js` — run with `node would-update-md-test.js [target]`:
1. JSON sanitizer: injects raw newlines, verifies parse succeeds
2. Anchor insertion (no-trailing-newline): confirms entry inserted correctly
3. Anchor insertion (with trailing newline): confirms existing files unaffected
4. GitHub write: real PUT to target repo test file, verifies entry appears in file

Run before re-triggering a skill when diagnosing write failures — catches listener logic bugs without a 5-min Claude skill run.


## ASSET:toifood 2026-06-13 → ts-repo migration complete — pipeline fully operational from jayreck996/ts-repo

| Component | Final state |
|---|---|
| `jayreck996/ts-repo` | Live — listener + skill + workflows |
| `toifood/-toifood` | Pure docs, no workflows, no code |
| `toifood/ts-back` | Pure output storage (`could/`, ISSUE/ASSET logs) |
| PM2 `toigroup-listener` (id 10) | Running from `/Users/jayreck/toifood/ts-repo/toigroup-listener.js` |
| Secrets on `ts-repo` | `MACMINI_TRIGGER_TOKEN`, `TOIFOOD_CROSS_REPO_TOKEN`, `TOIGROUP_SECRET` ✅ |
| End-to-end test | `would-update-md.yml` triggered from `ts-repo` → 202 → skill → 16 entries written ✅ |
## ASSET:toifood 2026-06-13 → decision: ts-repo as multi-org pipeline engine outside toifood org

All functional pipeline code migrates to `jayreck996/ts-repo` (outside `toifood`):

| File | From | To |
|---|---|---|
| `toigroup-listener.js` | `toifood/-toifood` | `jayreck996/ts-repo` |
| `.claude/commands/would-update.md` | `toifood/-toifood` | `jayreck996/ts-repo` |
| `.github/workflows/would-update-md.yml` | `toifood/-toifood` | `jayreck996/ts-repo` |
| `.github/workflows/would-update-timing.yml` | `toifood/-toifood` | `jayreck996/ts-repo` |

**Post-migration state:**
- `toifood/-toifood` — pure org docs, no workflows, no code
- `toifood/ts-back` — pure output storage (`could/`, ISSUE/ASSET logs)
- `jayreck996/ts-repo` — pipeline engine: listener + skill + workflows

**Multi-org design:** listener routes by target — new orgs plug in by adding a target + token. Skill is already target-agnostic. Secrets (`TOIGROUP_SECRET`, `MACMINI_TRIGGER_TOKEN`, `TOIFOOD_CROSS_REPO_TOKEN`) set as repo-level secrets on `ts-repo`.
## ASSET:toifood 2026-06-13 → skill rewritten: source files read via GitHub API, no /tmp/

Replace zip download + /tmp/ extraction with direct gh api reads:
- File tree: `repos/toifood-dev/ts-toifood-back/git/trees/{branch}?recursive=1`
- Each file: `repos/toifood-dev/ts-toifood-back/contents/{path}?ref={branch}` — content decoded inline by Claude

Steps 3–6 unchanged — `could/` header reads, analysis, JSON output, cleanup already API-native. Skill is now filesystem-agnostic. Flow unchanged: listener still invokes `claude --print`, still receives JSON.
## ASSET:toifood 2026-06-13 → pipeline component status confirmed

| Component | Status |
|---|---|
| GH Actions → POST → 202 | ✅ confirmed working |
| Skill runs async, outputs 16-entry JSON | ✅ confirmed working |
| `writeEntriesToGitHub` → GitHub API → `toifood/ts-back/could/` | ❌ silently failing |

**Next action:** verify `TOIFOOD_CROSS_REPO_TOKEN` is in PM2 env (`pm2 env 7`), set if missing, then re-trigger `would-update`.
## ASSET:toifood 2026-06-13 15:48 → pipeline fully operational — async 202 pattern, listener owns GitHub API writes

```
GitHub Actions cron (ubuntu-latest, ~4s job)
  → POST local.toigroup.co.nz/would-update
    → x-secret: TOIGROUP_SECRET  ← passes Cloudflare WAF rule
    → X-Token: MACMINI_TRIGGER_TOKEN  ← listener auth
  → 202 Accepted (immediate)
  → [async] claude --print "/would-update ts-back"  (~10 min)
    → 16 entries JSON
  → [async] listener writes each entry to toifood/ts-back/could/ via GitHub API
```

| Component | Detail |
|---|---|
| GitHub Actions job duration | ~4s |
| Skill run duration | ~10 min (async, Mac Mini) |
| Cloudflare WAF bypass | `x-secret: TOIGROUP_SECRET` (org secret in toifood) |
| Listener auth | `X-Token: MACMINI_TRIGGER_TOKEN` |
| Tunnel config | `~/.cloudflared/toigroup.yml` → `localhost:3456` |
| PM2 process | `toigroup-listener` (id 7) |
| GitHub writes | `TOIFOOD_CROSS_REPO_TOKEN` via GitHub Contents API |

**Hard rule:** Cloudflare proxy has ~100s timeout — never use synchronous pattern for long-running skills via Cloudflare Tunnel. Always respond 2xx immediately and run async.

## ASSET:toifood 2026-06-13 15:23 → toigroup-listener confirmed working — full skill run 9 min, 1678 bytes

Local test confirmed: `POST localhost:3456/would-update` → runs `claude --print "/would-update ts-back"` → returns JSON. Tunnel config (`~/.cloudflared/toigroup.yml`) updated from port `11434` → `3456`. PM2 processes `toigroup-listener` (id 7) and `toigroup-tunnel` (id 4) both online.

Blocker: Cloudflare Access 403 on `local.toigroup.co.nz` — pending Access policy fix before end-to-end test.

## ASSET:toifood 2026-06-13 14:45 → final pipeline architecture — Mac Mini is pure Claude runner, GitHub Actions owns all state

```
GitHub Actions cron (ubuntu-latest)
  → POST https://local.toigroup.co.nz/would-update
    → toigroup-listener (Mac Mini, PM2)
      → claude --dangerously-skip-permissions --print "/would-update ts-back"
        → skill downloads source, generates 16 entries, prints JSON to stdout
      → HTTP 200 { entries: [{path, entry}, ...] }
  → GitHub Actions: for each entry → fetch file SHA → insert below anchor → PUT via GitHub API
```

| Component | Detail |
|---|---|
| Tunnel hostname | `local.toigroup.co.nz` |
| Listener port | `3456` |
| Listener PM2 name | `toigroup-listener` |
| Auth | `X-Token` → `MACMINI_TRIGGER_TOKEN` |
| Skill output | JSON array `[{path: "could/MIGRATE-ISSUE-2026Q2.md", entry: "## ISSUE:..."}]` |
| Mac Mini state | `~/.claude/` only |
| File writes | GitHub Actions via GitHub API (`TOIFOOD_CROSS_REPO_TOKEN`) |

## ASSET:toifood 2026-06-13 14:45 → target pipeline architecture — GitHub Actions → Cloudflare Tunnel → toigroup-listener → Claude Code skill

```
GitHub Actions cron (ubuntu-latest)
  → POST https://local.toigroup.co.nz/would-update
    → Cloudflare Tunnel (toigroup-tunnel, PM2)
      → Mac Mini localhost:3456 (toigroup-listener, PM2)
        → git pull ~/toifood/ts-back
        → GITHUB_WORKSPACE=~/toifood/ts-back
        → claude --dangerously-skip-permissions --print "/would-update ts-back"
          → skill writes to ~/toifood/ts-back/could/
        → node ~/toifood/ts-back/would-update-content.js  ← pushes via GitHub API
        → 200 OK back to GitHub Actions job
```

| Component | Detail |
|---|---|
| Tunnel hostname | `local.toigroup.co.nz` |
| Listener port | `3456` |
| Listener PM2 name | `toigroup-listener` |
| Auth | `X-Token` header checked against `MACMINI_TRIGGER_TOKEN` env var |
| GitHub secret | `MACMINI_TRIGGER_TOKEN` in `toifood` org |
| Local ts-back clone | `~/toifood/ts-back` |
| Push method | `would-update-content.js` via GitHub API (`TOIFOOD_CROSS_REPO_TOKEN`) |
| Execution | Synchronous — GitHub job holds open until skill + push complete |

No self-hosted runner agent required. Mac Mini only needs `toigroup-tunnel` and `toigroup-listener` running via PM2.

## ASSET:toifood 2026-06-13 → would-update skill now reads CUSTOM PROMPT + PATHS from each could/ file header as source of truth; TEST category added to ts-back

`-toifood/.claude/commands/would-update.md` skill updated: hardcoded prompts and -MUST/ file dependency removed. For each category/type, Claude reads the `could/` file header to extract two optional fields — `CUSTOM PROMPT` (analysis focus) and `PATHS` (specific source files to prioritise). If both empty, Claude infers from the category name alone. All 28 existing could/ headers in ts-back updated with preset prompts. Four new TEST-ISSUE/ASSET files (Q2+Q3) created. To change analysis behaviour for any category, edit that category's could/ file header — no skill changes needed.
## ASSET:toifood 2026-06-13 → target architecture: GitHub Actions calls mac-mini via Cloudflare Tunnel (push model, no self-hosted runner needed)

GitHub Actions job runs on `ubuntu-latest` (GitHub-hosted). When the schedule fires, the job sends an HTTP POST to a Cloudflare Tunnel URL that maps to a local HTTP listener on the mac-mini. The mac-mini receives the request, runs Claude Code / analysis locally, then pushes results back to GitHub via git or API. Flow: GitHub cron → ubuntu-latest job → POST to `https://<tunnel>.trycloudflare.com` → mac-mini listener → local execution → push. No self-hosted runner agent needed. Cloudflare Tunnel handles inbound connectivity without port forwarding.
## ASSET:toifood 2026-06-13 → GitHub Actions self-hosted runner uses outbound polling — no inbound port, no Cloudflare, no NAT traversal needed

The mac-mini runner is always the client. GitHub never connects to the mac-mini. On startup, the runner registers with GitHub via a one-time token, then long-polls `api.github.com` over HTTPS (port 443) asking "any jobs for me?". When a workflow schedule fires, GitHub queues the job server-side. The runner's polling loop picks it up, pulls job details, executes steps locally, and pushes logs back — all outbound. Works behind any home router with no port forwarding, no Cloudflare tunnel, no VPN. Only requirement: outbound HTTPS to github.com.
## ASSET:toifood 2026-06-13 → -toifood is now a monorepo with -ts-back subdirectory; ts-back-would-update.yml runs on mac-mini runner Monday 6am UTC

`-toifood` absorbs ts-back as `-ts-back/` subdirectory — no independent `.git` inside it, `-toifood` is the single source of truth. Workflow `ts-back-would-update.yml` fires on cron `0 6 * * 1` (Monday 6am UTC). The self-hosted mac-mini runner is a persistent agent that polls GitHub for queued jobs — it must be online when the schedule fires or the job waits (up to 24h). Skill install step is a plain local file copy from `.claude/commands/would-update.md` into `~/.claude/commands/` on the runner — no Cloudflare or remote server involved. Analyse step runs Claude Code on the mac-mini with `working-directory: -ts-back`.
## ASSET:toifood 2026-06-08 → would-update-csv.js uses → (→) in regex — encoding must be preserved

`ts-back/would-update-csv.js` line 37 uses `→` (U+2192) as a literal character in the headline-extraction regex. If this file is edited in an editor that mishandles UTF-8, the character will silently corrupt and the CSV step will fail with "No headlines found" on every run.

Fix committed `5f41d91`. When editing this file, verify the arrow is byte sequence `e2 86 92` (not a multi-byte garbled variant).

## ASSET:toifood 2026-06-08 → architectural identity — toifood is repo/personal-context-based

`toifood` sub-repos analyse internal data — source code, user behaviour, product repos. This distinguishes them from `toiflow` sub-repos which analyse external cloud data.

| | `toifood` | `toiflow` |
|---|---|---|
| **Context** | Repo / user / personal | Cloud / external world |
| **Runner** | Self-hosted Mac Mini | `ubuntu-latest` |
| **Engine** | Claude Code skill | Ollama via tunnel |
| **Cadence** | Weekly | Daily |
| **Org pipeline** | Product health across ts-toifood-back/front/web | Org activity (PRs, workflows, repo stats) |

**Rule:** Sub-repos in `toifood` read from codebases and user context. See `toiflow/-toiflow` ASSET for full comparison table.

## ASSET:toifood 2026-06-08 → would-update-timing.yml is temporary — retires when would-update.yml is built

`would-update-timing.yml` (quarterly cron) is a placeholder until the pipeline is defined. Once built, timing becomes job 1 inside `would-update.yml` (daily) — same pattern as `ts-*` repos. No commit conflict: timing commits empty files first, pipeline writes content second, sequential in the same run. See `toiflow/-toiflow` ASSET for full pattern detail.

## ASSET:toifood 2026-06-08 → document structure live — could/ would/ 2026Q2 files created

`would-update.yml` triggered. Timing job created all quarterly files. Structure confirmed.

| Path | Status |
|---|---|
| `ASSET-2026Q2.md` / `ISSUE-2026Q2.md` | ✅ |
| `could/CONTENT-ASSET-2026Q2.md` | ✅ |
| `could/CONTENT-ISSUE-2026Q2.md` | ✅ |
| `would/LOG-METRIC-2026Q2.csv` | ✅ |
| `.github/workflows/would-update.yml` | ✅ quarterly cron `0 0 1 1,4,7,10 *` |
## ASSET:toifood 2026-06-08 → -toifood adopts unified document structure — container + pipeline

**Decision:** `-toifood` joins the automated documents factory. Same structure as `-toiflow` and all `ts-*` repos.

**Structure:**
```
-toifood/
├── .github/workflows/would-update.yml   ← quarterly cron, timing-only until pipeline defined
├── .claude/commands/would-update.md     ← shared skill (existing, retained)
├── ASSET-{quarter}.md / ISSUE-{quarter}.md
├── could/CONTENT-ASSET-{quarter}.md
├── could/CONTENT-ISSUE-{quarter}.md
└── would/LOG-METRIC-{quarter}.csv
```

**Removed:** `would/DISCOVER-METRIC.csv` — no longer needed.
**Content type:** default CONTENT, undecided between org activity summaries vs business docs (price, usage).
## ASSET:toifood 2026-06-08 → toifood-dev org live — org split between pipeline and prod source

`toifood-dev` org created at https://github.com/toifood-dev. `-toifood-dev` repo initialised as org config/docs layer.

| Org | Role | Repos |
|---|---|---|
| `toifood` | Pipeline + analysis | `-toifood`, `ts-back` (+ future `ts-front`, `ts-web`) |
| `toifood-dev` | Prod source code | `ts-toifood-back`, `ts-toifood-front`, `ts-toifood-web` (pending transfer from `jayreck996`) |

## ASSET:toifood 2026-06-08 → file organisation confirmed — each pipeline repo self-contained

```
-toifood/                              ← org config layer
├── .claude/commands/would-update.md       ← shared skill (any ts-* repo)
├── ISSUE-V1.md / ASSET-V1.md             ← org-level decisions

ts-back/                               ← pipeline for ts-toifood-back
├── could/                                 ← analysis output (7 categories × ISSUE/ASSET)
├── would/                                 ← CSV logs only
├── ISSUE-V1.md / ASSET-V1.md             ← pipeline operational docs
└── would-*.js                             ← pipeline scripts

ts-toifood-back/                       ← prod code (read-only by pipeline)
└── -MUST/                                 ← prompts per category
```

**Naming conventions:** `UPPERCASE-ISSUE-V1.md` / `UPPERCASE-ASSET-V1.md` in `could/`. 7 categories: `ANALYSIS`, `BUG`, `INSTRUCTION`, `MIGRATE`, `PRICE`, `RECOVERY`, `USAGE`.

**When ts-front / ts-web are added:** mirror ts-back exactly — own `could/`, `would/`, `ISSUE-V1.md`, `ASSET-V1.md`, `would-*.js`. Skill already supports `/would-update ts-front` with no changes needed.
## ASSET:toiflow 2026-06-07 → would/ could/ folder convention applied across all ts-* repos

**Convention finalised:**
| Folder | Contains | Purpose |
|---|---|---|
| `would/` | `.csv`, `.log` | Raw data outputs |
| `could/` | `.md` | Processed content |

**Repos updated (could/ rename + csv moved to would/):**
| Repo | Changes |
|---|---|
| `ts-file` | `would/` → `could/` (md), csv → `would/` |
| `ts-inbox` | `would/` → `could/` (md), csv → `would/` |
| `ts-event` | `would/` → `could/` (md), csv → `would/` |
| `ts-crypto` | `would/` → `could/` (md), csv → `would/` |
| `ts-anz` | `would/` → `could/` (md), csv → `would/` |
| `ts-back` | already had `could/`, no csv |

**Files updated per repo:** `would-update-csv.js` path `could/-log-asset-v1.csv` → `would/-log-asset-v1.csv`
## ASSET:toifood 2026-06-07 17:00 → skill architecture — lives in -toifood, executes in ts-back

The `would-update.md` skill is stored in `-toifood` (org-level, reusable) but executes inside `ts-back`'s GitHub Actions workspace (`$GITHUB_WORKSPACE`). The workflow copies the skill to the Mac Mini runner before invocation.

```
-toifood/.claude/commands/would-update.md   ← skill definition (org-level)
  → copied to ~/.claude/commands/ on Mac Mini runner
  → claude runs with $GITHUB_WORKSPACE = ts-back checkout
  → writes + commits to ts-back/could/*.md
```

Design intent: one skill serves any `ts-*` repo — `/would-update ts-front` would write to `ts-front/could/` without any skill changes.

## ASSET:toifood 2026-06-07 17:00 → could/ replaces would/ across ts-back and skill

Output directory renamed `would/` → `could/` in `ts-back`. All references updated:

| File | Change |
|---|---|
| `ts-back/could/` | Directory renamed from `would/` |
| `would-update-csv.js` | `WOULD_DIR` path → `could` |
| `would-update-content.js` | All file paths `would/` → `could/` |
| `would-update.yml` | `git add would/log-asset-v1.csv` → `could/` |
| `would-update.md` skill | `$GITHUB_WORKSPACE/would/` → `could/`; git add step updated |
## ASSET:toifood 2026-06-07 16:00 → skill uses branch creation date to find newest ts-toifood-back branch

Skill (`would-update.md`) now detects the newest created branch of `ts-toifood-back` using the GitHub compare API (`compare/main...{branch}`). The last unique commit on each branch gives its effective creation date — the branch with the most recent creation date wins.

| Before | After |
|---|---|
| `zipball/latest` — ambiguous, resolved to unknown ref | `compare/main...{branch}` per branch → pick newest created |
| Could silently read wrong branch | Always reads most recently created branch |

Skips `main` in the comparison loop. Works automatically when new branches are created — no config change needed.

## ASSET:toifood 2026-06-07 16:00 → ts-toifood-back (branch 1-1-1) file naming aligned to /-toifood convention

| Before | After |
|---|---|
| `-ASSET-v4.md` | `ASSET-V1.md` |
| `-ISSUE-v4.md` | `ISSUE-V1.md` |
| `-WOULD/` (directory) | `would/` |
| `-WOULD/-ASSET-v1/v2/v3.md` | `would/ASSET-V1/V2/V3.md` |
| `-WOULD/-ISSUE-v0/v1/v2/v3.md` | `would/ISSUE-V0/V1/V2/V3.md` |

`-MUST/` kept as-is — skill reads from this path explicitly.
## ASSET:toifood 2026-06-07 14:16 → ts-back file/folder structure aligned to toiflow/ts-anz pattern

Four JS files + `would/` output folder now mirrors ts-anz exactly.

| ts-anz | ts-back equivalent |
|---|---|
| `would-read-md.js` (RSS fetch) | `would-read-md.js` (-MUST/ + codebase read) |
| `would-update-md.js` (Ollama call) | `would-update-md.js` (claude skill runner) |
| `would-update-content.js` (write docs) | `would-update-content.js` (write would/ via API) |
| `would-update-csv.js` (CSV log) | `would-update-csv.js` (codebase headline log) |
| `would/-content-issue-v1.md` | `would/migrate-issue-v1.md` × 5 categories |
| `would/-content-asset-v1.md` | `would/migrate-asset-v1.md` × 5 categories |
| `would/-log-asset-v1.csv` | `would/-log-codebase-v1.csv` |

**Skill path updated:** `$GITHUB_WORKSPACE/would/{category}-issue-v1.md` / `would/{category}-asset-v1.md`

## ASSET:toifood 2026-06-07 13:58 → pipeline fully operational — end-to-end summary

**Status:** Live. First run succeeded 2026-06-07 13:55. Next run: Monday 2026-06-09 18:00 NZST.

**Full infrastructure state:**

| Component | Detail |
|---|---|
| Org | `toifood` (GitHub free plan, all repos public) |
| Runner | `mac-mini` — `jayreck` account, `~/actions-runner/` v2.334.0 |
| PM2 process | `toifood-runner` (id 7) — alongside `cloudflare-tunnel`, `toigroup-tunnel`, `toifood-back`, `postgres`, `redis`, `slack-bot` |
| Runner group | Default — `visibility: all`, `allows_public_repositories: true` |
| Claude auth | Claude Pro OAuth, `~/.claude/` persisted under `jayreck` |
| Org secret | `TOIFOOD_CROSS_REPO_TOKEN` — `repo` + `workflow` scopes, used for checkout + git push |
| Schedule | `0 6 * * 1` — weekly Monday 06:00 UTC = 18:00 NZST |

**Repos:**
| Repo | Role |
|---|---|
| `toifood/-toifood` | Reusable workflows + skill (`would-update.md`) + org docs |
| `toifood/ts-back` | Target — category docs updated weekly by skill |

**Skill flow (`would-update ts-back`):**
1. `gh api zipball jayreck996/ts-toifood-back@latest` → `/tmp/`
2. Read `README.md`, `package.json`, `prisma/schema.prisma`, `src/` tree
3. Read 10 `-MUST/` instruction prompts from source repo
4. Generate 10 analyses under Claude Pro
5. Prepend entries to 10 category docs in `$GITHUB_WORKSPACE`
6. `git commit + push` from workspace
7. `rm -rf /tmp/toifood-source*`

**Troubleshooting log (first run):**
- Runner auto-updated v2.325→v2.334 on first pickup → session conflict → removed + re-registered
- Runner group `allows_public_repositories` was false → jobs silently queued → patched via API
- Both resolved before first successful run

## ASSET:toifood 2026-06-07 13:58 → schedule set to weekly Monday 6pm NZST

`would-update.yml` cron updated from daily `0 18 * * *` → weekly `0 6 * * 1` (Monday 06:00 UTC = Monday 18:00 NZST).

**Why weekly:** codebase analysis doesn't need daily frequency; weekly cadence reduces runner load and keeps doc entries meaningful.

## ASSET:toifood 2026-06-07 13:09 → pipeline architecture finalised — Mac Mini self-hosted runner under jayreck

**Flow:**
```
GitHub Actions schedule (daily 06:00 NZST = 18:00 UTC)
  → would-update.yml (ts-back) — runs-on: [self-hosted, mac-mini]
    → checkout ts-back (TOIFOOD_CROSS_REPO_TOKEN)
    → checkout toifood/-toifood → copy would-update.md → ~/.claude/commands/
    → claude --dangerously-skip-permissions --print "/would-update ts-back"
        → gh api zipball ts-toifood-back@latest → /tmp/
        → read -MUST/ prompts + codebase context (README, package.json, prisma, src/)
        → generate 10 analyses (migrate/price/recovery/usage/instruction × ISSUE/ASSET)
        → prepend entries to category docs in $GITHUB_WORKSPACE
        → git commit + push
        → rm -rf /tmp/toifood-source*
```

**What already exists under jayreck:**
| Component | Status |
|---|---|
| Claude Code installed | ✅ (`npm install -g @anthropic-ai/claude-code`) |
| Claude Pro OAuth (`~/.claude/`) | ✅ authenticated |
| PM2 running | ✅ manages `cloudflare-tunnel` + `toigroup-tunnel` |
| PM2 startup on boot | ✅ (tunnels survive Friday 3am reboot) |
| Node.js, `gh` CLI, `git` | ✅ |
| `TOIFOOD_CROSS_REPO_TOKEN` org secret | ✅ set |

**What still needs to be done:**
| Step | Action |
|---|---|
| 1 | `toifood` org → Settings → Actions → Runners → New runner → macOS ARM64 → run `./config.sh --name mac-mini --labels mac-mini` |
| 2 | `pm2 start ~/actions-runner/run.sh --name toifood-runner && pm2 save` |

**No new secrets needed.** Skill auto-copies from `-toifood` on every run — stays in sync with repo.

## ASSET:toifood 2026-06-07 → Claude Pro auth model confirmed — why self-hosted runner is the only headless path

| Scenario | Auth path | Works headlessly |
|---|---|---|
| `claude` on local machine (first run) | Browser OAuth → token saved to `~/.claude/` | N/A — interactive |
| `claude` on local machine (subsequent) | Reads `~/.claude/` token | ✅ Yes |
| `claude` on GitHub hosted runner | No `~/.claude/`, no browser — OAuth impossible | ❌ No |
| `claude` with `ANTHROPIC_API_KEY` | Skips OAuth, uses key directly | ✅ Yes — but separate API billing |
| `claude` on Mac Mini self-hosted runner | Reads persisted `~/.claude/` from prior manual login | ✅ Yes — Claude Pro |

**Key principle:** Claude Pro OAuth requires a human + browser exactly once per machine. After that, the token in `~/.claude/` is reused automatically. Self-hosted runner on Mac Mini is the only GitHub Actions path that has this persistent auth state.
## ASSET:toifood 2026-06-07 → pipeline architecture — Claude skill on Mac Mini self-hosted runner

**Flow:**
```
GitHub Actions schedule (daily 06:00)
  → would-update.yml (ts-back) — runs-on: [self-hosted, mac-mini]
    → checkout ts-back + -toifood
    → cp .toifood/.claude/commands/would-update.md ~/.claude/commands/
    → claude --dangerously-skip-permissions --print "/would-update ts-back"
        → gh api zipball ts-toifood-back@latest → /tmp/
        → read -MUST/ prompts + codebase context
        → generate 10 analyses (migrate/price/recovery/usage/instruction × ISSUE/ASSET)
        → prepend entries to category docs in ts-back
        → git commit + push
        → rm -rf /tmp/toifood-source*
```

**Mac Mini — what already exists:**
| Component | Status |
|---|---|
| `jayagent` account + PM2 | ✅ Running |
| cloudflared Cloudflare tunnel | ✅ Running |
| Friday 3am reboot + auto-recovery | ✅ Configured |
| Node.js (for npm/Claude Code) | ✅ Available |

**What needs to be built:**
| Step | Action |
|---|---|
| 1 | Register self-hosted runner: `toifood` org → Settings → Actions → Runners → New → macOS ARM64; install via `./config.sh` + `./svc.sh install` on Mac Mini (`jayagent`) |
| 2 | Install Claude Code: `npm install -g @anthropic-ai/claude-code`; auth: `claude` → OAuth → Claude Pro login |
| 3 | Update `would-update.md` skill: replace PowerShell with bash (`curl`, `unzip`, `/tmp/`, `$GITHUB_WORKSPACE`) |
| 4 | Update `would-update.yml`: replace `runs-on: ubuntu-latest` → `runs-on: [self-hosted, mac-mini]`; add skill copy step |

**Secrets required:**
| Secret | Scope | Status |
|---|---|---|
| `TOIFOOD_CROSS_REPO_TOKEN` | toifood org | ✅ Set |

No new secrets needed — Claude Pro auth and `gh` auth are stored on-machine under `jayagent`.

**Risk table:**
| Risk | Mitigation |
|---|---|
| Claude Pro auth expires | Job fails loudly → re-run `claude` interactively on Mac Mini |
| Mac Mini offline | Jobs queue → run when runner comes back online |
| Friday reboot vs job timing | Reboot 03:00, job 06:00 — no overlap |

**Comparison with toiflow:**
| | toiflow | toifood |
|---|---|---|
| LLM | Ollama `qwen2.5:7b` | Claude Pro (via CLI) |
| Runner | GitHub hosted | Self-hosted (Mac Mini) |
| LLM auth | `OLLAMA_SECRET` WAF header | Claude Pro OAuth on Mac Mini |
| Cost | Free | Free (Claude Pro already paid) |
## ASSET:toifood 2026-06-07 → Claude skill execution model confirmed

| Layer | Where it runs | Billing |
|---|---|---|
| LLM inference | Anthropic servers | Claude Pro (interactive) or API key (automated) |
| Tool execution (Bash, Read, Write) | Local machine | Free |
| GitHub Actions hosted runner | No local machine | Must use API key |
| GitHub Actions self-hosted runner | Local machine | Claude Pro ✅ |

Claude Pro covers LLM inference only in interactive CLI sessions. Any automated/headless trigger (GitHub Actions hosted) requires `ANTHROPIC_API_KEY`.
## ASSET:toifood 2026-06-07 → /would-update skill created — org-level reusable codebase analyser

File: `.claude/commands/would-update.md`

Invoked as `/would-update {ts-back|ts-front|ts-web}`. Derives source repo (`ts-toifood-{suffix}`) automatically.

Flow: `gh api zipball/latest` → `Expand-Archive` → read -MUST/ prompts + codebase context → generate 10 analyses → prepend to category docs → `git commit + push` → cleanup. Runs under Claude Pro, no API key required.
## ASSET:toifood 2026-06-07 → LLM backend confirmed — Anthropic API (`api.anthropic.com`)

Claude Code skills are CLI-only (Claude Pro subscription, interactive session). GitHub Actions cannot invoke them. Decision finalised: toifood pipeline uses `api.anthropic.com/v1/messages` with `ANTHROPIC_API_KEY` org secret. No Ollama dependency.
## ASSET:toifood 2026-06-07 → architecture — mirrors toiflow, scaled to 5 categories

Follows the same pattern as `toiflow` org. Key deltas:

| | toiflow | toifood |
|---|---|---|
| Reusable workflow LLM | Ollama via Cloudflare tunnel | Claude API (`api.anthropic.com`) |
| Auth secret | `OLLAMA_SECRET` (WAF header) | `ANTHROPIC_API_KEY` |
| Content jobs per repo | `issue` + `asset` (2) | 5 categories × issue/asset (10) |
| Job parallelism | Serialised (Ollama single-threaded) | Parallel (Claude API handles concurrency) |
| Source data | RSS / Gmail / Calendar | Codebase from source repo via `TOIFOOD_CROSS_REPO_TOKEN` |
| Output | `would/` files + CSV | `would/` files per category |

**Job flow (ts-back):** `fetch` → 10 parallel content jobs → `update`

**Same across both orgs:** org secrets via `secrets: inherit`, `would-read-md.js` + `would-update-content.js` pattern, `would/` output directory, ISSUE/ASSET doc format.

## ASSET:toifood 2026-06-07 → must-update-content.yml created — Claude API reusable workflow

- Calls `api.anthropic.com/v1/messages` with `x-api-key: ANTHROPIC_API_KEY`
- Inputs: `prompt` (required), `model` (default: `claude-haiku-4-5-20251001`)
- Output: `response` — Claude's text response
- Guard: exits 1 if response is empty or null
- Same interface as `toiflow/-toiflow/must-update-content.yml` (Ollama equivalent)
- `ANTHROPIC_API_KEY` required as `toifood` org secret