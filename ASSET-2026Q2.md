### Listener restarted — must/should routes active, PM2 cleaned up (2026-06-28)
- git pull brought in 985-line changeset: toigroup-listener.js (must/should queues + routes), two new skills, two new workflows
- ~/.claude/commands/must/must-update-md.md and ~/.claude/commands/should/should-update-md.md synced manually (post-merge hook only covers could/)
- pm2 restart toigroup-listener → PID 78101; /must/must-update-md and /should/should-update-md routes confirmed wired (POST + x-token required)
- PM2 ghost toifood-tunnel (id 4) removed — pm2 delete 4 + pm2 save; PM2 now only manages toigroup-listener (id 5)
- Pending: bump actions/checkout, upload-artifact, download-artifact from @v4 → @v5 across all three workflows

### must-update-md: full pipeline added – TC, PRIVACY, PRICE, USAGE, ROADMAP (2026-06-28)
- toigroup-listener.js updated with /must/must-update-md route, mustQueue, runMustSkill()
- Listener log: must/MUST-LISTENER-LOG.log
- .github/workflows/must-update-md.yml created - weekly cron 0 18 * * 0 (Mon 06:00 NZST)
- Trigger log: must/MUST-UPDATE-MD-TRIGGER-LOG.log
- Skill added at .claude/commands/must/must-update-md.md (pending Mac Mini pm2 reload)
- must/ category files seeded in all 4 output repos (TC, PRIVACY, PRICE, USAGE, ROADMAP × ISSUE + ASSET)
- Agents may read and update existing entries; prompts tailored per category
- Completes three-tier pipeline: could/ daily + should/ + must/ weekly Mon

### should-update-md: listener route, workflow, and skill added (2026-06-28)
- toigroup-listener.js updated with /should/should-update-md route, shouldQueue, runShouldSkill()
- Listener log: should/SHOULD-LISTENER-LOG.log
- .github/workflows/should-update-md.yml created - weekly cron 0 18 * * 0 (Mon 06:00 NZST)
- Trigger log: should/SHOULD-UPDATE-MD-TRIGGER-LOG.log
- Skill added at .claude/commands/should/should-update-md.md (pending Mac Mini pm2 reload)
- Same anchor pattern as could/; header allows agent modification of existing entries
- Schedule: every Monday 6 AM NZST - prod on scheduled runs, test on manual dispatch

### could-update-md.yml: cron rescheduled to 06:00 NZST (2026-06-27)
- Changed cron from '0 6 * * *' (06:00 UTC = 6 PM NZT) to '0 18 * * *' (18:00 UTC = 6 AM NZT)
- Root cause: Mac Mini was asleep during evening NZT runs, causing silent 530 failures
- Commit c3c65b0 to jayreck996/ts-repo .github/workflows/could-update-md.yml
- Next scheduled run: 2026-06-28 06:00 NZST (~18:00 UTC)

### Manual prod run #34 confirmed working (2026-06-27)
- Triggered via GitHub API (workflow_dispatch, env=prod) at 22:49 UTC
- Both prod targets succeeded: ts-toifood-back and ts-toifood-web - 202 accepted by listener
- TRIGGER-LOG.log updated with success entries at 22:49 UTC
- Confirms Mac Mini and Cloudflare tunnel live during NZT business hours

### ts-repo logs diagnosed via GitHub API - no local clone needed (2026-06-27)
- Confirmed GitHub Contents API as reliable read path for LISTENER-LOG.log, TRIGGER-LOG.log, WOULD-UPDATE-MD-LOG.log
- Fetched and decoded all three log files via WebFetch against api.github.com/repos/jayreck996/ts-repo/contents/would/
- No local clone or gh CLI required - useful for remote diagnostics from any context

### ts-test-front/ts-test-back confirmed working after run #30 blip (2026-06-27)
- Run #30 (~00:06 UTC) failed for both ts-test targets with exit code 1 - cause unknown (no log access)
- Runs #31 (01:22 UTC) and #32 (01:44 UTC) both WRITE_OK (4/4 entries) on same targets
- No intervention needed - self-resolved; TSREPO_TOKEN confirmed valid

### Scheduled run silence root-caused to Cloudflare 530 tunnel down (2026-06-27)
- GitHub Actions run #33 (06:00 UTC schedule, fired ~07:16 UTC) completed success in 32s
- Zero entries in all three logs - consistent with HTTP 530 tunnel unreachable pattern seen Jun 25-26
- Mac Mini likely asleep/off; workflow exits gracefully on 530 without writing to logs
- Distinction clarified: schedule IS triggering at 06:00 UTC (= 6 PM NZT), not 6 AM NZT

### could-update-md skill — JSON encoding rules added to step 5 (2026-06-26)
- Added explicit JSON ENCODING RULES before the output example:
  - Use `\n` (backslash + n) for line breaks inside entry strings — never literal newlines
  - Escape double-quotes as `\"`
  - No trailing commas, no prose outside the array
- Replaced hardcoded path example with placeholder structure: `could/{CAT}-ISSUE-{QUARTER}.md`
- Entry value in example shows multi-paragraph content using `\n\n` so Claude has a concrete model to follow
- Synced to ~/.claude/commands/could/could-update-md.md; pushed as 137cb9a to jayreck996/ts-repo

### Tunnel fix verified -- test targets passing, prod listener investigation pending (2026-06-26)
- launchd migration confirmed working: ts-test-front and ts-test-back both WRITE_OK (4/4 entries)
- Prod targets (ts-toifood-back/web) trigger accepted (202) but writes not landing -- needs investigation
- TRIGGER-LOG.log and LISTENER-LOG.log in would/ are source of truth for run status

### Both tunnels migrated to launchd — final tunnel process manager state (2026-06-26)

| | toifood-tunnel | toigroup-tunnel |
|---|---|---|
| launchd label | com.cloudflare.cloudflared | com.cloudflared.toigroup |
| Plist path | ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist | ~/Library/LaunchAgents/com.cloudflared.toigroup.plist |
| KeepAlive | true (fixed from SuccessfulExit: false) | true |
| ThrottleInterval | 5s | 5s |
| Logs | ~/Library/Logs/com.cloudflare.cloudflared.{out,err}.log | ~/Library/Logs/cloudflared-toigroup.{out,err}.log |
| PM2 | Removed (id 4 ghost still in list, inactive) | Removed (pm2 delete 7) |
| PID post-migration | 50949 | 50951 |

- If stuck: launchctl kickstart -k gui/$(id -u)/<label> to force restart
- Both start at jayreck login (RunAtLoad: true) and survive reboots via launchd

### Full workflow rename completed — would → could (2026-06-23)
- could-update-md.yml: replaces would-update-md.yml — expanded matrix with outputRepo/tokenSecret + ensureQuarterFiles preflight step
- could-update-title.yml: replaces would-update-timing.yml — name update only
- toigroup-listener.js: all commit messages and committer name updated to could-update
- could-update-md-test.js: replaces would-update-md-test.js
- ensureQuarterFiles now runs in GH Action before listener trigger — creates missing ISSUE/ASSET in root, could/, and would/ for current quarter
- Race condition on quarter rollover eliminated by construction (preflight runs before HTTP trigger)

### Manual test run 28016985329 confirmed WRITE_OK both targets (2026-06-23)
- Triggered would-update-md workflow manually via workflow_dispatch
- ts-toifood-back: WRITE_OK 4/4 at 10:01 UTC
- ts-toifood-web: WRITE_OK 4/4 at 10:07 UTC
- Confirms CATS guard fix (29e7dae) working correctly -- 4 entries = BUG + TEST x ISSUE + ASSET

### Non-BUG/TEST categories removed from could/ in both output repos (2026-06-23)
- Deleted ANALYSIS, INSTRUCTION, MIGRATE, PRICE, RECOVERY, USAGE from -ts-toifood-back (24 files) and -ts-toifood-web (6 files)
- Skill discovers categories at runtime by reading could/ directory -- deleted categories will not be recreated on next run
- -ts-toifood-back could/: BUG + TEST (Q2 + Q3); -ts-toifood-web could/: BUG + TEST (Q2 only)
- would/: LOG-METRIC-2026Q2.csv in -ts-toifood-back only; -ts-toifood-web would/ is empty

### ts-toifood-web run 27998129619 confirmed FIFO queue intact (2026-06-23)
- ts-toifood-back: WRITE_OK 14/14 at 02:39 UTC
- ts-toifood-web: WRITE_FAIL (bad escaped char in JSON) at 02:48 UTC -- queue continued, no stall
- Confirms processQueue() fix from aa86c15 is holding across all WRITE_FAIL exit paths
- Node_modules filter (f2235af) not yet synced to Mac Mini; ts-toifood-web still fails until Mac Mini pulls

ASSET LOG
INSTRUCTION FOR AI MODEL:

ALWAYS ADD NEW ASSET ENTRIES AT THE TOP, DIRECTLY BELOW THIS HEADER.
### should/ + must/ files corrected across all 4 output repos (2026-06-28)
- Deleted spurious must/ASSET-2026Q2.md + must/ISSUE-2026Q2.md from ts-toifood-back + ts-toifood-web (created by broken init step)
- Deleted spurious should/ASSET-2026Q2.md + should/ISSUE-2026Q2.md from ts-toifood-back + ts-toifood-web
- Seeded correct should/ARCH/MIGRATE/RECOVERY ISSUE+ASSET files in all 4 repos (24 files)
- Fixed should-update-md.yml: removed generic file creation; hardcoded ARCH,MIGRATE,RECOVERY as category fallback
- Fixed must-update-md.yml: removed generic file creation; hardcoded TC,PRIVACY,PRICE,USAGE,ROADMAP as category fallback
- Root cause: init step always created generic ASSET/ISSUE before category loop; should/must have fixed categories unlike could/
### could-update-md.yml: root-level ASSET/ISSUE removed from init step (2026-06-28)
- Removed creation of root ASSET-2026Q2.md + ISSUE-2026Q2.md from output repos (never written to by skill)
- could/ init now only creates could/{CAT}-ASSET/ISSUE per discovered category (dynamic, no preset list)
- would/ASSET + ISSUE creation retained — would-update-md workflow parked, not yet built
- Aligns all three workflows: could/ reads folder, should/ defaults ARCH/MIGRATE/RECOVERY, must/ defaults TC/PRIVACY/PRICE/USAGE/ROADMAP
####### <!-- ANCHOR MARKER - ADD ALL NEW ASSET ENTRIES DIRECTLY BELOW THIS LINE, NEVER DELETE OR EDIT PREVIOUS ASSET ENTRIES-->
### Tunnel config state — toifood vs toigroup (2026-06-26)

| | toifood | toigroup |
|---|---|---|
| Hostnames | api.toifood.co.nz, toifood.co.nz | local.toigroup.co.nz |
| Routes to | localhost:3000 (toifood-back) | 127.0.0.1:3456 (toigroup-listener) |
| Process manager | launchd (com.cloudflare.cloudflared) | PM2 id 6 |
| no-autoupdate | ✓ added 2026-06-26 | ✓ added 2026-06-26 |
| PM2 restart-delay | N/A (launchd handles restarts) | 5000ms added 2026-06-26 |

- Both tunnels now have no-autoupdate: true — prevents self-update restarts
- toigroup-tunnel has PM2 restart-delay 5000ms — recovers from clean exits (DNS blips) without manual intervention

### toigroup-tunnel vs toifood-tunnel — process management audit (2026-06-26)
- toifood-tunnel: managed by launchd (com.cloudflare.cloudflared, PID 2685) — survives reboots and clean exits
- toigroup-tunnel: managed by PM2 only (id 6, script ~/.cloudflared/toigroup.yml) — no launchd backup
- PM2 restarts: 0 for toigroup-tunnel; was manually restarted after the 530 incident
- Gap closed: DNS fallback + PM2 restart policy fix applied 2026-06-26

### skill suffix mapping corrected for test targets — 7169619 (2026-06-25)
- ts-test-front: suffix=test-front -> jayreck996/-ts-test-front (confirmed exists, private)
- ts-test-back: suffix=test-back -> jayreck996/-ts-test-back (confirmed exists, private)
- Previous suffixes (front, back) pointed to non-existent repos; Claude behaviour was non-deterministic — sometimes hallucinated entries, sometimes emitted []

### could-update-md skill: test target mapping + JSON fallback guard added (2026-06-25) — 779e8a5
- Step 2: explicit org/suffix mapping for ts-test-front (jayreck996/-ts-front) and ts-test-back (jayreck996/-ts-back); unreachable repo now emits [] and exits cleanly
- Top of file: OUTPUT RULE hard constraint — entire response must be JSON array, no prose, no preamble
- Step 5: added fallback — if anything went wrong at any step, output [] and nothing else, never prose
- Fixes ts-test-front WRITE_FAIL and reduces systemic no-JSON-array failures

### ts-test-back WRITE_OK confirmed — token sync fix validated (2026-06-25)
- Run 28137615904: ts-test-back wrote 4 entries (BUG-ISSUE, BUG-ASSET, TEST-ISSUE, TEST-ASSET via could-update commits)
- Confirms TSREPO_TOKEN in pm2 env resolves write-side silent failure for back target
- ts-test-front remains unresolved - same token, different outcome, suggests repo structure difference

## ASSET:ts-repo 2026-06-25 → TSREPO_TOKEN token sync confirmed complete on both sides

GitHub Actions secret set via gh secret set. PM2 env updated via pm2 restart --update-env + pm2 save. Both prod and test targets use TSREPO_TOKEN in targets.json. Listener online and ready for next trigger.

### toigroup-listener.js routing confirmed — token sync requirement identified (2026-06-25)
- All targets (prod + test) use same path: getTargetConfig() reads tokenSecret from targets.json then looks up process.env[tokenSecret]
- Skill command: claude --dangerously-skip-permissions --print /could/could-update-md {target}
- Queue: single FIFO via skillQueue - one skill run at a time, processQueue() called after each completion
- appendToRunLog() hardcodes TOIFOOD_CROSS_REPO_TOKEN for LISTENER-LOG writes - separate from tokenSecret
- Token must exist in two places with the same value: GitHub Actions secret (checkout/push) and Mac Mini pm2 env (listener curl writes to GitHub API) - mismatch between the two causes silent write failure
- Fix for test targets: set TSREPO_TOKEN in pm2 env on Mac Mini, restart with pm2 restart toigroup-listener --update-env

## ASSET:ts-repo 2026-06-25 → BOM stripped from toigroup-listener.js — fba3d1d

UTF-8 BOM removed from line 1 of toigroup-listener.js. Listener restarted and online. No logic changes — cosmetic commit b58201c introduced the BOM during would→could rename.

## ASSET:ts-repo 2026-06-25 → TSREPO_TOKEN added as GitHub Actions secret

gh secret set TSREPO_TOKEN on jayreck996/ts-repo — value matches TOIFOOD_CROSS_REPO_TOKEN. All 4 targets now resolvable via secrets[matrix.tokenSecret] in could-update-md.yml. No code changes required.

## ASSET:ts-repo 2026-06-25 → targets.json token consolidated to TSREPO_TOKEN — 3164ae4

All 4 targets (ts-toifood-back, ts-toifood-web, ts-test-front, ts-test-back) now use TSREPO_TOKEN. TOIFOOD_CROSS_REPO_TOKEN and JAYRECK_TEST_TOKEN remain in PM2 env but are no longer referenced. JAYRECK_TEST_TOKEN also added to PM2 env and saved to dump.pm2 as interim fix before consolidation.

### could-update-md test pipeline routing issue identified (2026-06-25)
- Two consecutive manual test runs confirmed consistent write-side failure for ts-test-front and ts-test-back
- Trigger layer (GH Actions to listener) confirmed working: 202 both targets both runs
- Write-side routing suspected stale: test targets likely still mapped to could-update-md-test in toigroup-listener.js
- could-update-md-test.js to be removed once listener routing is updated

## ASSET:ts-repo 2026-06-24 → manual dispatch default flipped to test — prod requires explicit opt-in

- could-update-md.yml setup job: ENV_FILTER now checks github.event_name == 'schedule' && 'prod' first
  - Cron schedule: always prod, no human input required
  - Manual dispatch without selecting env: defaults to test
  - Manual dispatch with explicit prod: requires deliberate dropdown choice
- workflow_dispatch env input default changed from prod to test
- Result: Claude Code or any automation triggering the workflow without --field env=prod lands on test

## ASSET:ts-repo 2026-06-24 → test target isolation deployed — targets.json c03d14f + workflow 0f50a6e

- Created isolated test repos to prevent Claude API rate exhaustion from test runs
  - jayreck996/-ts-test-front — seeded with ISSUE/ASSET/could/would/src structure
  - jayreck996/-ts-test-back — same structure
- targets.json updated: each target now carries `env` field
  - prod: ts-toifood-back, ts-toifood-web
  - test: ts-test-front, ts-test-back
- could-update-md.yml updated with `env` workflow_dispatch input (prod | test | all)
  - scheduled cron defaults to prod only — test targets never triggered automatically
  - manual dispatch: choose env=test to run test targets only, env=all for everything
- Pending: JAYRECK_TEST_TOKEN secret must be added to ts-repo (PAT with write to both test repos)

## ASSET:ts-repo 2026-06-24 -> SHA chaining in log job deployed -- CDN cache fix -- 59a6016

- Problem: re-fetching SHA inside loop hit GitHub CDN cache returning stale SHA immediately after a write
- Fix: read file ONCE before loop, then carry SHA forward from each PUT response body (response.content.sha)
- Each iteration uses SHA from the previous PUT -- no GET inside loop, no cache, no collision possible
- Run 28061517556: setup + both run targets + log job all green


## ASSET:ts-repo 2026-06-24 -> Option 2 sequential log job deployed — scales to N targets — 8a15c66

Problem with retry loop at scale:
  N parallel jobs need up to N-1 retry rounds
  All losers retry simultaneously creating new collision waves
  3-attempt loop breaks at 5+ targets

Fix: remove Log outcome step from run job entirely, add sequential log job after all matrix jobs complete

How it works:
  run job (parallel, per target):
    - triggers listener as before
    - uploads small artifact: target|status|http_code  <- no shared file, no SHA conflict

  log job (sequential, runs after ALL matrix jobs finish):
    - downloads all artifacts
    - iterates targets one by one
    - each iteration: GET current SHA -> PUT entry -> move to next
    - single writer at all times -> no collision possible -> no retry needed

Scaled testing approach: duplicate entries in targets.json pointing to same outputRepo
to simulate 5+ parallel jobs — would expose retry loop failure, verifies sequential log job holds

## ASSET:ts-repo 2026-06-24 -> SHA retry loop shape -- TRIGGER-LOG.log parallel write flow

TRIGGER-LOG.log current state: SHA=abc, content="old log lines"

-- Attempt i=1 --------------------------------------------------
  GET  TRIGGER-LOG.log  ->  SHA=abc, content=<base64>
  decode content        ->  LOGBODY="old log lines"
  build UPDATED         ->  "new line\nold log lines"
  base64 encode         ->  ENCODED=<base64>
  PUT  sha=abc  content=ENCODED
        |
        +- GitHub: "abc matches current" -> writes, file now SHA=xyz  OK  break
        |
        +- GitHub: "abc != current (xyz)" -> 409                       FAIL  fall through

-- Attempt i=2 (only reached on 409) ----------------------------
  GET  TRIGGER-LOG.log  ->  SHA=xyz, content=<base64>   <- fresh fetch
  decode content        ->  LOGBODY="winner's line\nold log lines"
  build UPDATED         ->  "new line\nwinner's line\nold log lines"
  base64 encode         ->  ENCODED=<base64>
  PUT  sha=xyz  content=ENCODED
        |
        +- GitHub: "xyz matches current" -> writes               OK  break

Key: fetch is inside the loop -- every retry reads the file as it actually is now.
Both entries end up in the log correctly. With 2 parallel jobs, i=2 always succeeds. i=3 is safety net.

## ASSET:ts-repo 2026-06-24 -> GitHub Contents API SHA -- optimistic locking across 3-repo write pattern

- Every file has a SHA (git blob hash); PUT must include the SHA you last read -- GitHub rejects with 409 if SHA changed since
- Prevents silent overwrites: last writer doesn't blindly win
- 3-repo write pattern:
  - ts-repo/would/TRIGGER-LOG.log -> written by GH Action (GITHUB_TOKEN, 2 parallel matrix jobs -> SHA race -> retry loop needed)
  - toifood/-ts-toifood-back ISSUE/ASSET/could/*.md -> listener -> Claude skill (TOIFOOD_CROSS_REPO_TOKEN)
  - toifood/-ts-toifood-web ISSUE/ASSET/could/*.md -> listener -> Claude skill (TOIFOOD_CROSS_REPO_TOKEN)
- Output repos have no SHA race: FIFO queue in toigroup-listener.js ensures only one skill runs at a time; each output repo only ever touched by one target's run
- Retry loop in Log outcome step is only needed on TRIGGER-LOG.log -- the single shared file two parallel GH Action jobs both write


## ASSET:ts-repo 2026-06-24 -> could-update-md retry loop deployed + run 28056646547 confirmed green -- d15588c

- Added 3-attempt retry loop in Log outcome step to handle 409 SHA conflict from parallel matrix jobs
- Run 28056646547: setup + both matrix targets (ts-toifood-back, ts-toifood-web) all green
- Two bugs total fixed today: HTTP 403 permissions (32e4d28) + HTTP 409 SHA race (d15588c)


## ASSET:ts-repo 2026-06-24 -> could-update-md permissions fix deployed -- 32e4d28

- Added permissions: contents: write to run job in .github/workflows/could-update-md.yml
- Root cause of run 28055615844 failure: GITHUB_TOKEN 403 on would/TRIGGER-LOG.log PUT
- Trigger (HTTP 202) was already working; logging step now has write access


## ASSET:ts-repo 2026-06-23 → CATS guard + post-merge hook deployed — 29e7dae

Skill updated with OUTPUT_REPO/CATS empty guards (fail-fast with `[]`), CATEGORIES_LOCKED echo replacing generic 'Categories:', and STRICT RULE in step 4 requiring exactly N×2 entries. Post-merge git hook installed at .git/hooks/post-merge to auto-sync global skill on every pull. Pushed 29e7dae, global skill synced.

## ASSET:ts-repo 2026-06-23 → pulled to 8ad6671, processQueue fix deployed — listener restarted

git pull (3878d12 → 8ad6671) + pm2 restart toigroup-listener. processQueue() now called on all three WRITE_FAIL return paths in runSkill() — queue can no longer stall on error. Global skill synced.
## ASSET:ts-repo 2026-06-23 → pulled to d09f6e2 — node_modules/dist/ filter active, ts-toifood removed

git pull (8ad6671 → d09f6e2). Skill filter now excludes node_modules/ and dist/ alongside existing type exclusions — ts-toifood-web tree drops from ~1900 to ~20 paths. ts-toifood removed from targets.json (no real source code, 404s on trigger). Global could/could-update-md.md resynced. No pm2 restart needed.
## ASSET:ts-repo 2026-06-23 -> ts-toifood removed from targets.json -- pipeline now two targets only

Removed ts-toifood entry from targets.json (commit c5459e8). Listener refreshes targets within 60s -- no pm2 restart needed. Active targets: ts-toifood-back (106 files, WRITE_OK consistently) and ts-toifood-web (node_modules filter fix pending Mac Mini sync). ts-toifood can be re-added when toifood-dev/ts-toifood-dev has real application source code.

## ASSET:ts-repo 2026-06-23 -> skill jq filter updated -- node_modules/ and dist/ excluded by directory name

Added select(.path | test("(^|/)node_modules/|(^|/)dist/") | not) to tree jq filter in could/could-update-md.md (commit f2235af). Drops committed dependency and build output directories before any reads. Safe across all repos -- ts-toifood-back has no node_modules/ or dist/ committed so unaffected. ts-toifood-web drops from ~1900 listed paths to ~20. Long-term fix for ts-toifood-web: remove node_modules/ from git history and add to .gitignore.

## ASSET:ts-repo 2026-06-23 -> path changes are application-level only -- DNS, Cloudflare Tunnel, and listener port are path-agnostic

- DNS: resolves local.toigroup.co.nz to Cloudflare edge IP. No concept of URL paths.
- Cloudflare Tunnel: forwards all traffic for the hostname to Mac Mini localhost:3456. Path-agnostic.
- Listener port: accepts any TCP connection on 3456. Path-agnostic.
- handle(): the only place path is examined -- if (req.url !== '/could/could-update-md') return 404.
- Changing /would-update to /could/could-update-md required zero changes to DNS, Cloudflare, or tunnel config.
- Only two things needed updating: the workflow curl URL (caller) and the handle() check (receiver).
- The 404 on run 27990756270 was the listener actively rejecting an unrecognised path, not a routing failure.


## ASSET:ts-repo 2026-06-23 → skill renamed would-update → could/could-update-md — path and command aligned to could/ convention

.claude/commands/would-update.md moved to .claude/commands/could/could-update-md.md. Listener updated: POST /would-update → /could/could-update-md, claude --print arg updated. Old file deleted. Global ~/.claude/commands/ synced: could/could-update-md.md created, would-update.md removed. Commits 4919c0d (new), f8b72c6 (delete), 3878d12 (listener). pm2 restart toigroup-listener done.
## ASSET:ts-repo 2026-06-23 → would-update tree filter expanded — .lock .d.ts .map .spec.ts .test.ts now excluded

Updated select filter in Step 2 of would-update.md: added lock, d.ts, map, spec.ts, test.ts to the exclusion pattern alongside csv, log, md. Eliminates package-lock.json/yarn.lock (large generated files), TypeScript declaration files, source maps, and test files from the source tree read. README.md and package.json unaffected — fetched explicitly by path. Global ~/.claude/commands/would-update.md synced. Commit d06c294.
## ASSET:ts-repo 2026-06-23 -> would-update skill Step 2 jq filter updated -- .csv .log .md files excluded from source tree read

Added select(.path | test("\\.(csv|log|md)$") | not) to the git tree jq filter in Step 2 of .claude/commands/would-update.md. README.md unaffected -- fetched by explicit path outside the tree filter. Mac Mini requires git pull + manual skill sync after push. No pm2 restart needed.


## ASSET:ts-repo 2026-06-23 → pulled to 5041bab, global skill synced, listener restarted with FIFO queue

git pull (6f9fea5 → 5041bab) + cp .claude/commands/would-update.md ~/.claude/commands/ + pm2 restart toigroup-listener. Listener now running FIFO queue — all 3 targets queue on arrival instead of dropping. Next 06:00 UTC cron expected to show 3 WRITE_OK entries in LISTENER-LOG.log.
## ASSET:ts-repo 2026-06-23 -> toigroup-listener skillRunning replaced with FIFO queue -- all three targets now process per run

Replaced boolean skillRunning guard with skillQueue array + processQueue() function in toigroup-listener.js. Incoming requests push {target, quarter_override} to queue and call processQueue(). processQueue() bails if skillRunning or queue empty, otherwise shifts next entry and calls runSkill(). runSkill() sets skillRunning=true on entry, calls processQueue() on exit (all code paths). max-parallel: 1 in workflow unchanged -- still needed to serialise TRIGGER-LOG.log writes.


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

