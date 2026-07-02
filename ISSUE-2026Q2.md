### targets.json — toifood-dev org entries added, TSREPO_TOKEN access unconfirmed (2026-07-02)
- ts-toifood-dev-src (toifood-dev/ts-toifood-dev) and ts-toifood-back-src (toifood-dev/ts-toifood-back) added as prod targets
- Both use TSREPO_TOKEN — access to toifood-dev org not yet confirmed; pipeline will fail if token lacks org permission
- toifood-dev/ts-toifood-front not added — no could/ or would/ dirs

### toifood-dev org not in pipeline loop — ts-toifood-dev and ts-toifood-back have could/would dirs but no targets.json entry (2026-07-02)
- toifood-dev org discovered as the real source code org (ts-toifood-back, ts-toifood-front, ts-toifood-web, ts-toifood-dev)
- pipeline writes only to toifood org (doc repos) — toifood-dev org completely outside pipeline loop
- TSREPO_TOKEN access for toifood-dev org unconfirmed — needed before adding targets
- outputRepo format already handles org/repo — no schema change needed, just new entries

### toifood-dev/ts-toifood-dev — gitlink missing on back, front, web (2026-07-02)
- Same recurring pattern: .gitmodules absent, back/front/web were type tree not commit
- Fix applied: .gitmodules created with branch = main, tree patched with mode 160000 gitlinks

### -ts-recruitment-dev gitlink structure unclear — parked (2026-07-02)
- No separate backend/frontend/database repos exist under jayreck996
- Real source is one monorepo (ts-recruitment-dev) — unclear if single submodule or split repos
- Decision parked pending repo structure confirmation
### gitlink missing — submodule declared in .gitmodules but tree entries remain type tree not commit (2026-07-02)
- Recurring: adding .gitmodules and submodule dirs is not enough — git does not treat dirs as submodules unless tree entry is type commit (mode 160000)
- Symptom: back/, web/, front/ show as regular directories; git submodule update --init fetches nothing; no @ commit ref shown in GitHub UI
- Fix: POST new git tree with mode 160000 commit-type gitlink entries, create commit, PATCH ref — replaces tree-type dirs with proper gitlinks

### target repos lack git submodule structure — mono-repos not wired as reference layer (2026-07-02)
- -ts-toifood-dev and -ts-test-dev exist but submodule references to individual target repos incomplete or inconsistent
- No branch pinning on submodule refs (unlike ts-htd pattern which tracks specific branches per submodule)
- targets.json in ts-repo points directly to individual repos rather than through the mono-repo layer

### could-update-md log job: HTTP 409 SHA conflict on multi-target runs (2026-06-28)
- Write-log step fails with "is at X but expected Y" (HTTP 409) when 2+ targets produce trigger-result artifacts
- Root cause: TRIGGER-LOG.log SHA read once before loop; first iteration writes fine and SHA changes, second iteration reuses stale pre-loop SHA -> GitHub rejects with 409
- Pattern: only fails when 2+ prod targets run simultaneously (ts-toifood-back + ts-toifood-web)
- Fix: re-fetch SHA from GitHub API at top of each loop iteration with 3-attempt retry (matches must/should pattern)
- Also: renamed would/TRIGGER-LOG.log -> would/COULD-UPDATE-MD-TRIGGER-LOG.log to match must/should naming convention

### ts-toifood-back WRITE_PARTIAL 2/18 — skill writing to deleted categories (2026-06-28)
- 18 entries generated but 16 failed: MIGRATE, PRICE, RECOVERY, USAGE categories no longer exist in output repo could/
- writeEntriesToGitHub GET-SHA step returns 404 for deleted files → write fails
- 2 ok entries: BUG + TEST (the only remaining could/ categories)
- Root cause: skill discovered stale categories from a prior run or the output repo still had some remnants
- Self-resolves on next clean run — categories confined to BUG + TEST in both output repos

### GitHub Actions Node.js 20 deprecation — all three workflows affected (2026-06-28)
- actions/checkout@v4, upload-artifact@v4, download-artifact@v4 all run on Node.js 20 runtime
- GitHub forcing Node.js 20 actions to run on Node.js 24 with deprecation warning
- Affects could-update-md.yml, should-update-md.yml, must-update-md.yml (9 action references)
- Not yet a hard error; fix: bump all three workflows from @v4 → @v5 for all three action types

### ts-repo: cron schedule wrong timezone - runs at 6 PM NZT not 6 AM NZT (2026-06-27) [RESOLVED]
- Schedule was set to '0 6 * * *' (06:00 UTC = 18:00 NZST) - Mac Mini asleep at that time
- Diagnosed from run #33: workflow succeeded but zero entries in all three logs (530 tunnel down)
- Fixed: updated cron to '0 18 * * *' (18:00 UTC = 06:00 NZST) - commit c3c65b0

### ts-repo: scheduled 06:00 UTC run silently skipped - Mac Mini tunnel unreachable (2026-06-27)
- GitHub Actions run #33 (Scheduled) completed in 32s at ~07:16 UTC with no errors
- Zero entries written to TRIGGER-LOG.log, LISTENER-LOG.log, or any output repo for Jun 27
- Root cause: Cloudflare tunnel unreachable (HTTP 530) - Mac Mini offline or cloudflared tunnel down
- Same pattern previously seen: Jun 26 00:07 UTC both ts-test targets logged `failure | 530 | tunnel unreachable`
- Workflow handles 530 gracefully and exits success, masking the failure
- Fix: verify Mac Mini and cloudflared are running before 06:00 UTC; consider alerting on 530

### ts-repo: Node.js 20 deprecated in all workflow jobs (2026-06-27)
- All jobs in could-update-md.yml warned: Node.js 20 is deprecated, being forced to run on Node.js 24
- Affects setup, run (matrix), and log jobs
- No failures caused yet but will become a hard error in a future GitHub Actions runner update
- Fix: update node-version: 20 to node-version: 24 in could-update-md.yml

### run #30: ts-test-front/ts-test-back exit code 1 (2026-06-27)
- Manual run #30 (~00:06 UTC Jun 27) failed for ts-test-front and ts-test-back with exit code 1
- Token: TSREPO_TOKEN - full stderr not visible without GitHub sign-in
- Transient: runs #31 and #32 on same targets both succeeded within 2 hours
- No code changes made between #30 and #31 - likely a runtime/network blip

### ts-toifood-web WRITE_FAIL — literal newlines in JSON entry strings (2026-06-26)
- Claude outputs `entry` values with literal newline characters inside JSON string values
- JSON spec disallows literal newlines in strings — must be `\n` (backslash + n)
- Sanitizer regex in toigroup-listener.js line 178 catches some cases but fails on longer content (position 1260 in latest run)
- ts-test and ts-toifood-back not affected — shorter content stays under the threshold where the regex breaks
- Fix: updated could-update-md skill step 5 — added JSON ENCODING RULES section and concrete placeholder example showing `\n` for line breaks, `\"` for quotes
- No hardcoded paths in example — uses {CAT}/{QUARTER}/{TS} placeholders; commit 137cb9a

### ts-toifood-back/ts-toifood-web: listener silently fails after 202 -- prod writes broken (2026-06-26)
- Workflow triggers succeed (HTTP 202) but listener logs no entry -- not even WRITE_FAIL
- Last successful prod write was Jun 24 07:24 UTC (4/4 entries committed)
- Jun 25 07:11 UTC: both targets hit WRITE_FAIL `no stdin data` (Claude auth issue)
- Jun 26: two manual prod runs (28211821926) -- 202 accepted, zero listener activity logged
- Test targets (ts-test-front/ts-test-back) writing fine on same Mac Mini -- issue is prod-specific
- Investigate: SSH into Mac Mini, run `pm2 logs toigroup-listener --lines 50` during a prod trigger
- Possible causes: Claude session expired for prod context, listener crashing silently on toifood repo access

### Both Cloudflare tunnels migrated to launchd — PM2 toigroup-tunnel removed (2026-06-26)
- toigroup-tunnel: new plist ~/Library/LaunchAgents/com.cloudflared.toigroup.plist, KeepAlive: true + ThrottleInterval: 5
- toifood-tunnel: fixed existing plist — KeepAlive: {SuccessfulExit: false} → KeepAlive: true
- Both now restart unconditionally on any exit (clean or crash) with 5s throttle
- toigroup-tunnel removed from PM2 (pm2 delete 7, pm2 save); PM2 no longer manages any tunnel
- Verified: PID 50949 (toifood, com.cloudflare.cloudflared), PID 50951 (toigroup, com.cloudflared.toigroup)
- Fix if stuck: launchctl kickstart -k gui/$(id -u)/com.cloudflare.cloudflared or com.cloudflared.toigroup

### toigroup-tunnel PM2 ghost process — 530 persisted after restart-delay fix (2026-06-26)
- pm2 restart 6 --restart-delay 5000 updated PM2 state but never spawned a new cloudflared binary
- PM2 showed "online" / 2h uptime — PID 29744 confirmed dead (kill -0 failed), port 20241 held by toifood-tunnel
- Root cause: PM2 fork_mode ghost — cloudflared clean exit (code 0 on DNS failure) left PM2 tracking dead PID
- Confirmed by running cloudflared directly: connected to 4 edge servers (akl01 x2, mel02 x2) in under 3s
- Interim fix: pm2 delete 6 + pm2 start → new PID 49097, tunnel returned HTTP 403 (CF Access, correct)
- Permanent fix: migrated both tunnels to launchd (see entry above)

### ts-test-front/ts-test-back WRITE_FAIL: Mac Mini offline / tunnel down (2026-06-26)
- Two manual test runs (28201345769, 28208431297) both failed with HTTP 530, Cloudflare error 1033
- local.toigroup.co.nz tunnel unreachable -- Mac Mini likely off or Cloudflare tunnel not running
- Jun 25 morning schedule (07:10 UTC) also hit WRITE_FAIL for toifood targets (no stdin data)
- Fix: ensure Mac Mini is on, pm2 toigroup-listener is running, and Cloudflare tunnel is active

### Mac Mini pm2 restart pending after toigroup-listener.js update (2026-06-23)
- toigroup-listener.js commit messages renamed would-update → could-update (b58201c)
- Mac Mini still running old version in pm2 until restarted
- Fix: SSH into Mac Mini as jayreck, run `pm2 restart toigroup-listener`

### Workflow names inconsistent with skill/endpoint naming (2026-06-23)
- Workflows named `would-update-md` and `would-update-timing` but listener endpoint and Claude skill already use `could-update-md`
- `toigroup-listener.js` commit messages and committer name still say `would-update`
- `would-update-md-test.js` filename and internals also mismatched
- Plan: rename both workflows, update ~6 strings in listener + test file, optionally rename `would/` dir

### Run 28014344394: wrong skill version confirmed on Mac Mini -- both targets affected (2026-06-23)
- ts-toifood-back: WRITE_FAIL `no JSON array in output` -- Claude ran but produced prose (no category headers to read)
- ts-toifood-web: WRITE_PARTIAL 2 ok, 14 failed of 16 -- skill emitting 8 categories x 2 = 16 entries; only BUG-ISSUE/ASSET-2026Q2 exist (2 ok), rest 404
- Root cause: ~/.claude/commands/could/could-update-md.md on Mac Mini is stale -- missing step 3 runtime CATS discovery
- Fix: cp ~/toifood/ts-repo/.claude/commands/could/could-update-md.md ~/.claude/commands/could/could-update-md.md

### ts-toifood-web WRITE_FAIL run 28002547181: Claude auth expired on Mac Mini (2026-06-23)
- skill error: `Command failed: claude --dangerously-skip-permissions --print ... Warning: no stdin data received`
- Claude Pro OAuth token expired or invalidated on Mac Mini
- Fix: SSH into Mac Mini as jayreck, run `claude` interactively to trigger OAuth browser refresh

### ts-toifood-back WRITE_PARTIAL 2/14 run 28002547181: wrong skill version synced (2026-06-23)
- Expected 4 entries (BUG + TEST x ISSUE + ASSET) -- skill generated 14 (7 categories x 2)
- could/ confirmed has only BUG and TEST files; 14 entries means category discovery not running
- Suggests Mac Mini synced an old skill version without runtime CATS discovery (pre-10fdc0f pattern)
- Fix: verify ~/.claude/commands/could/could-update-md.md has step 3 CATS= discovery; re-copy from repo if stale

### Mac Mini node_modules filter sync unconfirmed -- ts-toifood-web still WRITE_FAIL (2026-06-23)
- Checked LISTENER-LOG after runs 27998129619 and 27999596586 -- both ts-toifood-web entries are WRITE_FAIL (ellipsis / bad escape char)
- f2235af (node_modules/dist/ jq exclusion) not applied to Mac Mini global skill in either run
- No ts-toifood-web WRITE_OK in any run since filter was committed
- Pending: git pull + cp skill + pm2 restart on Mac Mini

### Mac Mini has not pulled node_modules filter fix (2026-06-23)
- Commit f2235af (jq filter excludes node_modules/ and dist/) not yet synced to Mac Mini
- ts-toifood-web will keep WRITE_FAIL until Mac Mini runs: git pull && cp .claude/commands/could/could-update-md.md ~/.claude/commands/could/could-update-md.md && pm2 restart toigroup-listener
- Root cause of all ts-toifood-web JSON failures in runs 27998129619 and 27999596586

### ts-toifood-back run 27999596586 WRITE_PARTIAL: 1 of 14 entries failed (2026-06-23)
- 13/14 committed; 1 file write failed (likely 409 SHA conflict during concurrent access)
- ts-toifood-web still WRITE_FAIL (ellipsis truncation) -- Mac Mini has not pulled node_modules filter (f2235af)

### ts-toifood-web WRITE_FAIL: bad escape character in JSON output (2026-06-23)
- Skill ran with ~1,900-path tree (node_modules filter not yet synced to Mac Mini)
- Claude produced invalid JSON: Bad escaped character at position 1389 (line 4 col 1338)
- Previous run produced ellipsis truncation; this run produced escape corruption -- same root cause (overloaded context), different symptom
- Fix: Mac Mini must pull f2235af and sync skill to exclude node_modules/ and dist/

ISSUE LOG
INSTRUCTION FOR AI MODEL:

ALWAYS ADD NEW ISSUE ENTRIES AT THE TOP, DIRECTLY BELOW THIS HEADER.
## ISSUE:ts-repo 2026-06-28 → workflow init steps creating spurious files; must-update-md log job 409 SHA race

**[RESOLVED] should/must-update-md init step created generic ASSET/ISSUE files**
Both should-update-md.yml and must-update-md.yml created spurious `should/ASSET-2026Q2.md`, `should/ISSUE-2026Q2.md` (and must/ equivalents) in output repos on first run. Root cause: hardcoded `create_file` calls before the category loop. Fixed: removed those lines, added category fallback defaults (ARCH/MIGRATE/RECOVERY for should, TC/PRIVACY/PRICE/USAGE/ROADMAP for must). Spurious files deleted from ts-toifood-back + ts-toifood-web; correct ARCH/MIGRATE/RECOVERY files seeded in all 4 repos.

**[RESOLVED] could-update-md init step created root-level ASSET/ISSUE in output repos**
`ASSET-.md` and `ISSUE-.md` were created at output repo root on each run — never written to by the skill (which writes to `could/{CAT}-*`). Removed from init step. `would/` creation retained (workflow parked).

**[OPEN] must-update-md log job fails with 409 SHA conflict on multi-target runs**
The log step reads the file SHA once before the loop, then writes sequentially. First write succeeds and changes the SHA; second write uses the pre-loop SHA and gets 409. `must/MUST-UPDATE-MD-TRIGGER-LOG.log` never created on run #1. Same bug exists in should-update-md but only one target was processed so it didn't surface.
####### <!-- ANCHOR MARKER - ADD ALL NEW ISSUE ENTRIES DIRECTLY BELOW THIS LINE, NEVER DELETE OR EDIT PREVIOUS ISSUE ENTRIES-->
### targets.json target rename — -src suffix → dash-prefix convention (2026-07-03) [OPEN]
- -src suffix is a workaround for name collision; dash-prefix convention already used for repo names
- Rename deferred — to be executed after toifood-dev → toifood org migration completes
- Files to update: targets.json (4 target names), 3 skill case statements (could/must/should)

### toifood-dev → toifood org migration — pending execution (2026-07-03) [OPEN]
- Plan documented; code changes identified but GitHub repo transfers not yet done
- Transfers must happen first (GitHub UI) before any code changes take effect
- Repos to transfer: ts-toifood-dev, ts-toifood-back, ts-toifood-front, ts-toifood-web
- After transfers: targets.json (2 lines), 3 skill files (3 lines each), .gitmodules, Mac Mini git remotes
- Eliminates open TSREPO_TOKEN toifood-dev access issue — token already covers toifood org

### ts-repo: hard fix for JSON parse failures — depth-counter + state-machine sanitiser (2026-06-30)
- Recurring WRITE_FAIL: Claude outputs literal newlines inside JSON strings; regex sanitiser fails beyond ~500-1400 chars
- Symptoms today: ts-toifood-back WRITE_FAIL pos 1406, ts-toifood-web WRITE_FAIL pos 520 (scheduled run #43)
- Fix 1: replaced greedy /\[[\s\S]*\]/ extractor with extractJsonArray() — depth-counting, finds correct closing bracket
- Fix 2: replaced regex sanitiser with sanitizeJsonLiterals() — O(n) state machine, no backtracking, any string length
- Both functions added once at top of toigroup-listener.js; all 3 runners (could/must/should) updated
- Mac Mini pm2 restart required to activate
### Mac Mini listener restarted — Option A revert live on Mac Mini (2026-06-30) [RESOLVED]
- cd ~/toifood/ts-repo && git pull && pm2 restart toigroup-listener completed
- Listener now running 2f18f9ea: SUB_PATH removed from all skill runners, targets.json back to individual child repos
- Next could-update-md run will use reverted listener (no SUB_PATH env passed to skills)
### Mac Mini listener running stale code — pm2 restart needed after Option A revert (2026-06-30) [OPEN]
- Local ts-repo pulled to 2f18f9ea; toigroup-listener.js, targets.json, could-update-md.yml, skill all reverted to Option A (individual child repos, no subPath)
- ~/.claude/commands/could/could-update-md.md auto-synced by post-merge hook
- toigroup-listener.js: SUB_PATH env var removed from runSkill(), runMustSkill(), runShouldSkill()
- Mac Mini listener still running old version — will set SUB_PATH='' on each skill exec until restarted
- Fix: SSH into Mac Mini → cd ~/toifood/ts-repo && git pull && pm2 restart toigroup-listener
### ts-repo: reverted to individual child repos — subPath routing removed (Option A) (2026-06-30)
- Decision: parent repos (-ts-toifood-dev, -ts-test-dev) are organisational mono-repos with .gitmodules only
- Workflow checks out individual child repos directly (toifood/-ts-toifood-back etc) — no subPath prefix
- targets.json: subPath field removed; outputRepo reverts to individual child repos; env retained for filtering
- could-update-md.yml, toigroup-listener.js, could-update-md.md: BASE/SUB_PATH logic removed
- .gitmodules added to -ts-toifood-dev and -ts-test-dev to register child repos as submodules (reference only)
- Stale back/ web/ front/ subdirs in parent repos are legacy copies from migration — safe to delete later
- Mac Mini pm2 restart recommended: listener will no longer set SUB_PATH env for skill runs
### test mono-repo migration — -ts-test-dev created (2026-06-29)
- `jayreck996/-ts-test-dev` created as mono output repo for test env
- Docs migrated from `-ts-test-front` → `front/` and `-ts-test-back` → `back/` (48 files total)
- `targets.json` updated: ts-test-front + ts-test-back now route to `jayreck996/-ts-test-dev` with subPath front/back
- All four targets now follow mono-repo + subPath pattern

### toifood mono-repo migration — listener + skill subPath gap (2026-06-29)
- toifood output repos consolidated into `toifood/-ts-toifood-dev` (`back/` + `web/` subdirs)
- `targets.json` updated: outputRepo now `toifood/-ts-toifood-dev` with `subPath` field
- `could-update-md.yml` updated: subPath flows through matrix, BASE prefix on all could/would/ paths
- Gap found: `toigroup-listener.js` did not pass subPath as SUB_PATH to skill env; skill discovered categories from root `could/` and output paths without subdir prefix
- Fix: listener now destructures subPath + sets SUB_PATH in all 3 skill runners; skill step 3 uses BASE/could/, step 5 prefixes output paths with SUB_PATH/
- Pending: pm2 restart toigroup-listener on Mac Mini to pick up listener fix

### must/should log job 409 — concurrent Sunday schedule causes GitHub CDN stale blob SHA (2026-06-28) [RESOLVED]
- Root cause confirmed from run 28307267235: should-update-md and must-update-md both schedule at `0 18 * * 0`
- Log jobs ran in parallel, both committing to jayreck996/ts-repo at 01:12 UTC
- should's commits (f9215f5d3a at 01:12:11Z, dbc24573d9 at 01:12:12Z) modified repo tree mid-loop
- GitHub CDN returned stale blob SHA for must/MUST-UPDATE-MD-TRIGGER-LOG.log on second PUT → 409
- SHA chaining from PUT response was already present; the stale SHA came from CDN, not from re-using the pre-loop GET value
- must/MUST-UPDATE-MD-TRIGGER-LOG.log was never created on run #1
- Fix: 3-attempt retry loop in both log steps — on fail, re-fetches SHA + rebuilds UPDATED before retrying — commit 4ca9454
### 530 root cause — toigroup-tunnel DNS failure + PM2 clean-exit gap (2026-06-25)
- Mac Mini ISP DNS (202.180.64.11) became unreachable at 15:00 UTC; cloudflared could not resolve argotunnel.com SRV records
- cloudflared performed a graceful shutdown (signal interrupt / clean exit) — not a crash
- PM2 saw a clean exit and did not auto-restart; tunnel stayed dead 15:00 → 21:22 UTC (6h+)
- GitHub Actions workflow triggered at 21:22 UTC; Cloudflare had no live connection to Mac Mini → returned 530
- Fixes applied 2026-06-26: PM2 restart-delay 5000ms on toigroup-tunnel (now retries on any exit); no-autoupdate: true added to toigroup.yml; toifood.yml brought to parity

### toifood-tunnel missing no-autoupdate — config parity gap (2026-06-26)
- toifood.yml had no no-autoupdate flag; cloudflared could self-update mid-run and silently restart the tunnel
- Identified during 530 investigation when toigroup.yml received no-autoupdate: true but toifood was missed
- Fix: added no-autoupdate: true to toifood.yml, restarted launchd service (new PID 28230)

### toigroup-tunnel 530 — ts-test-front + ts-test-back (2026-06-25)
- Workflow run at 21:22 UTC got HTTP 530 for both ts-test targets — Cloudflare tunnel unreachable
- Root cause: toigroup-tunnel crashed at 15:00 UTC due to DNS failure (ISP DNS 202.180.64.11 unreachable, could not resolve argotunnel.com SRV records)
- cloudflared performed a graceful shutdown (signal interrupt), so PM2 treated it as a clean exit and did not auto-restart
- Tunnel was dead from 15:00 → 21:22 UTC (6+ hours); listener never received the request
- Fix: DNS fallback (1.1.1.1) added to toigroup.yml; PM2 restart policy updated for graceful exits

### skill suffix mapping wrong for test targets — [] guard not reliable (2026-06-25)
- ts-test-front mapped to suffix=front -> jayreck996/-ts-front (404); ts-test-back to suffix=back -> jayreck996/-ts-back (404) — neither repo exists
- ts-test-front still returned WRITE_OK 4/4: Claude bypassed the [] guard and hallucinated entries without real source code
- ts-test-back returned WRITE_OK 0/0: Claude happened to follow the [] guard this run
- Guard (|| echo [] exit 0) is a bash instruction Claude interprets, not executes — non-deterministic when source repo is missing
- Fix 7169619: corrected suffixes to test-front and test-back so both map to actual repos jayreck996/-ts-test-front and jayreck996/-ts-test-back

### ts-test-front WRITE_FAIL root cause: wrong source repo mapping in skill step 2 (2026-06-25)
- Skill step 2 maps target to source repo via suffix stripping: suffix=${ARGUMENTS#ts-toifood-}`
- ts-test-front does not start with ts-toifood- so suffix stays ts-test-front — tries to read toifood-dev/ts-toifood-ts-test-front (does not exist)
- Claude gets no source code, produces prose instead of JSON — WRITE_FAIL: no JSON array in output
- Fix: add explicit test target mapping with org variable (jayreck996/-ts-front, jayreck996/-ts-back) + unreachable repo guard emitting []
- Systemic JSON issue: step 5 has no fallback — Claude produces prose when confused; fix adds: if anything went wrong output [] and nothing else

### Run 28137615904: ts-test-back WRITE_OK but ts-test-front still silent (2026-06-25)
- ts-test-back: 4 entries committed (BUG-ISSUE, BUG-ASSET, TEST-ISSUE, TEST-ASSET) - token sync fix confirmed working
- ts-test-front: 202 from listener, no commits after 5+ minutes - skill likely erroring on this target specifically
- Both targets queued via FIFO - back ran first and succeeded; front ran second and produced nothing
- Next: check could/ structure difference between -ts-test-front and -ts-test-back, or check pm2 logs for skill error on ts-test-front

### Test targets not yet confirmed WRITE_OK — token sync complete, awaiting next trigger (2026-06-25)
- TSREPO_TOKEN now set in both required locations: GitHub Actions secret (gh secret set) and Mac Mini PM2 env (pm2 save)
- Listener back online after BOM crash (fba3d1d); no new test target triggers since fix
- appendToRunLog() still hardcodes TOIFOOD_CROSS_REPO_TOKEN — LISTENER-LOG writes use that token regardless of target
- Next test trigger will confirm end-to-end: GH Actions checkout → listener → skill → could/ write

### 502 and 202-no-write are separate failure layers — root cause is missing env var on Mac Mini (2026-06-25)
- 502 = Cloudflare bad gateway — listener process was down (BOM crash), Cloudflare got no response from Mac Mini
- 202-no-write = listener up and accepted, but runSkill() threw: Missing env var: JAYRECK_TEST_TOKEN (before consolidation) / TSREPO_TOKEN (after)
- toigroup-listener.js has no special routing for test vs prod — all targets go through getTargetConfig() which reads tokenSecret from targets.json then checks process.env
- Fix: ensure TSREPO_TOKEN is set in pm2 env on Mac Mini (pm2 restart toigroup-listener --update-env)
- Also: appendToRunLog() hardcodes TOIFOOD_CROSS_REPO_TOKEN — LISTENER-LOG writes will silently fail if that var is missing from pm2 env

### toigroup-listener.js BOM crash — listener errored ~2 hours, all triggers 502 (2026-06-25)
- Listener errored (pm2 status: errored, restart count 54) since pull of b58201c; all triggers returned 502 Bad Gateway
- Error: `SyntaxError: Invalid or unexpected token` at line 1 — UTF-8 BOM (0xEFBBBF) prepended to file in b58201c
- Node.js cannot parse BOM in .js files; caused listener to crash on every PM2 restart attempt
- Affected: ts-test-front + ts-test-back at 22:03 UTC (???) and 22:39 UTC (502); prod targets not triggered during window
- Fix: stripped BOM via Node.js, committed fba3d1d, restarted listener — back online

### Run 28134224374: listener 502 for both test targets (2026-06-25)
- ts-test-front and ts-test-back: checkout passed (TSREPO_TOKEN confirmed working), but Trigger toigroup-listener failed with 502
- 502 = Cloudflare bad gateway - Mac Mini tunnel up but listener process threw or crashed on the request
- Suspected: toigroup-listener.js has no handler or errors on could/could-update-md with test targets
- Next: read toigroup-listener.js routing logic to confirm

### TSREPO_TOKEN not set as GitHub Actions secret — test targets workflow failure (2026-06-25)
- ts-test-front + ts-test-back GH Actions job failure at 22:03 UTC; TRIGGER-LOG shows `failure | ???`
- New could-update-md.yml uses `${{ secrets[matrix.tokenSecret] }}` — tokenSecret must be a GitHub Secret
- Consolidated targets.json to TSREPO_TOKEN (3164ae4) but TSREPO_TOKEN only existed in PM2 env, not GitHub Secrets
- TOIFOOD_CROSS_REPO_TOKEN and JAYRECK_TEST_TOKEN were valid GitHub Secrets; TSREPO_TOKEN was not
- Fix: added TSREPO_TOKEN as GitHub Actions secret via `gh secret set` — same value as TOIFOOD_CROSS_REPO_TOKEN

### Run 28132553164: TSREPO_TOKEN consolidation broke checkout for test targets (2026-06-25)
- ts-test-front and ts-test-back: both failed at actions/checkout@v4 - TSREPO_TOKEN does not cover jayreck996 personal repos
- Regression introduced by 3164ae4 (token consolidation)
- Previous JAYRECK_TEST_TOKEN was working for checkout; write-side failure was a separate unresolved issue
- Fix: revert test targets in targets.json back to JAYRECK_TEST_TOKEN

### JAYRECK_TEST_TOKEN missing — test targets WRITE_FAIL config error (2026-06-25)
- ts-test-front + ts-test-back WRITE_FAIL at 20:05/20:36 UTC: `config error: Missing env var: JAYRECK_TEST_TOKEN`
- JAYRECK_TEST_TOKEN not set in PM2 env on Mac Mini; test targets added in c03d14f used a new token name
- Fix: set JAYRECK_TEST_TOKEN in PM2 env (same value as TOIFOOD_CROSS_REPO_TOKEN/TSREPO_TOKEN), restarted with --update-env
- Refactor: all 4 targets consolidated to TSREPO_TOKEN in targets.json (3164ae4) — single token covers toifood org + jayreck996 personal repos; JAYRECK_TEST_TOKEN no longer needed

### Test runs 28126253458 + 28127957838: write-side silent for both test targets (2026-06-25)
- ts-test-front and ts-test-back: listener returned 202 on both runs, no commits appeared in either output repo after 5 minutes each
- Last commits on both test repos: `could-update-md-test: .would-update-test.md` - written by old could-update-md-test.js, not the current could-update-md skill
- Root cause suspected: toigroup-listener.js still routes test targets through old could-update-md-test path, not could-update-md
- Next: read toigroup-listener.js routing logic to confirm and patch

## ISSUE:ts-repo 2026-06-24 → accidental prod trigger risk from manual dispatch default

- could-update-md.yml manual dispatch `env` input defaults to prod
- Any trigger without explicitly choosing env (including Claude Code automation) hits prod targets
- Risk: test runs triggering toifood listener, consuming Claude API quota on prod repos
- Fix: flip dispatch default to test; cron hardcoded to prod via event_name check

## ISSUE:ts-repo 2026-06-24 -> Mac Mini Claude skill WRITE_FAIL since 22:32 UTC -- no stdin detected

- All skill runs failing: claude --dangerously-skip-permissions --print /could/could-update-md ... Warning: no stdin detected
- Last WRITE_OK was 22:28 UTC; failed consistently from 22:32 UTC across all subsequent runs
- GH Action side working correctly (HTTP 202 from listener); failure is in Claude skill invocation on Mac Mini
- Likely cause: expired Claude auth session or Claude CLI auto-update changed non-TTY behavior
- Fix: SSH in as jayreck -> test claude --dangerously-skip-permissions --print "hello" -> re-auth if needed -> git pull -> pm2 restart toigroup-listener


## ISSUE:ts-repo 2026-06-24 -> sequential log job second iteration 409 -- GitHub CDN cached pre-write SHA

- Log job re-fetched TRIGGER-LOG.log SHA inside the loop but GitHub CDN returned stale cached response
- First iteration wrote successfully (file moved to new SHA), second iteration GET still returned old SHA -> 409
- Fix: read file once before the loop, chain SHA from each PUT response to next iteration -- never re-fetches


## ISSUE:ts-repo 2026-06-24 -> Mac Mini pm2 restart still pending -- toigroup-listener.js would->could rename not yet live

- toigroup-listener.js commit b58201c (would->could rename in commit messages/committer name) not yet running on Mac Mini
- All workflow fixes today (32e4d28, d15588c) are GH Action only -- Mac Mini not involved, no sync needed for those
- To fix: SSH in as jayreck -> cd ~/toifood/ts-repo && git pull -> pm2 restart toigroup-listener
- Non-urgent: listener still accepts requests and writes correctly; only cosmetic (log entries still say would-update)


## ISSUE:ts-repo 2026-06-24 -> could-update-md Log outcome step HTTP 409 -- parallel matrix jobs race on TRIGGER-LOG.log SHA

- Both matrix targets fetch the same SHA for would/TRIGGER-LOG.log simultaneously
- First target to PUT wins; second gets 409 "is at <new-sha> but expected <old-sha>"
- Fix: wrapped gh api PUT in a 3-attempt retry loop that re-fetches SHA on each attempt -- commit d15588c


## ISSUE:ts-repo 2026-06-24 -> could-update-md Log outcome step HTTP 403 -- GITHUB_TOKEN missing contents:write

- "run" job used GITHUB_TOKEN to PUT would/TRIGGER-LOG.log without permissions: contents: write in workflow
- Both matrix targets failed on Log outcome step with Resource not accessible by integration
- Trigger step was OK (HTTP 202 from listener); only the post-trigger logging step failed
- Fix: added permissions: contents: write to the run job -- commit 32e4d28


### CATS hallucination fixed — skill guard + post-merge hook deployed (2026-06-23)
- 07:18 UTC both targets WRITE_FAIL: `no stdin data received` — Claude auth expired again (3rd expiry today); re-authed
- ts-toifood-back 08:59 UTC: `no JSON array in output` — Claude output prose describing 8 wrong categories instead of JSON
- ts-toifood-web 09:09 UTC: WRITE_PARTIAL 2/14 — Claude hallucinated 8 categories (ANALYSIS, CONTENT, INSTRUCTION, MIGRATE, PRICE, RECOVERY, USAGE + BUG) instead of just BUG and TEST; 14 of 16 files don't exist in web repo
- Root cause: when CATS discovery silently fails (OUTPUT_REPO empty or API 404), Claude invents categories from training data
- Fix 1: skill now checks OUTPUT_REPO and CATS; emits `[]` and exits immediately on either being empty
- Fix 2: renamed echo to `CATEGORIES_LOCKED` + added STRICT RULE in step 4 — Claude must emit exactly N×2 entries matching the locked list
- Fix 3: post-merge git hook at .git/hooks/post-merge auto-syncs ~/.claude/commands/could/could-update-md.md on every git pull
- Pushed: 29e7dae

## ISSUE:ts-repo 2026-06-23 -> would-update.md skill file path does not follow could/ naming convention -- command name mismatches pipeline structure

.claude/commands/would-update.md invoked as /would-update. Pipeline output goes to could/ directories but the skill command name references would/. Moving to .claude/commands/could/could-update-md.md would invoke as /could:could-update-md matching the could/ convention. Requires: file rename in repo, listener command string update, Mac Mini mkdir plus file copy plus remove old, pm2 restart toigroup-listener. Risk: Claude Code --print mode subdirectory namespace syntax unverified -- test on Mac Mini before full switch.

## ISSUE:ts-repo 2026-06-23 -> would-update skill reads .csv .log .md files from source tree -- unnecessary API calls and context noise

Step 2 of would-update.md fetches all blob paths from the source repo tree with no file type filter. .csv, .log, and .md files are included in the read pass -- these add API calls and context noise without contributing to the analysis. README.md is fetched by explicit path and unaffected. Fix: add select(.path | test extension filter | not) to the jq filter in the tree fetch, dropping these file types before any reads occur.

## ISSUE:ts-repo 2026-06-23 -> ts-toifood-back WRITE_FAIL on run 27984319594 -- intermittent malformed JSON from Claude

JSON parse failed at position 283: Expected comma or closing brace after property value. Sanitizer in toigroup-listener.js handles raw newlines inside string values but cannot recover from structural JSON errors. Previous run at 08:14 UTC was WRITE_OK 14/14 with identical code -- same input, different Claude output. Intermittent, not a code bug. Re-triggering resolves it. Known transient failure mode, no fix required.


## ISSUE:ts-repo 2026-06-23 → global skill requires manual resync on every pull — no automated sync between repo and ~/.claude/commands/

Every time a commit updates .claude/commands/would-update.md, the global skill at ~/.claude/commands/would-update.md must be manually overwritten. Has happened 3 times (2026-06-20, 2026-06-22, 2026-06-23). Fix: add a post-merge git hook in /Users/jayreck/toifood/ts-repo that auto-copies .claude/commands/would-update.md to ~/.claude/commands/ on every pull.
## ISSUE:ts-repo 2026-06-23 -> skillRunning boolean replaced with queue -- dropped requests were a design flaw not a safety net

skillRunning=true drop pattern was originally added to prevent stale TCP connections (from the old execSync blocking loop) from spawning phantom skill runs. execFile fixed the root cause -- stale connections no longer queue. The boolean now only serves to drop legitimate sequential triggers. Replaced with a FIFO queue: incoming requests push to skillQueue, processQueue() runs the next entry when the current skill finishes. All targets process serially in arrival order with no drops.


## ISSUE:ts-repo 2026-06-22 -> skillRunning flag drops ts-toifood-web and ts-toifood triggers -- only one skill runs per workflow dispatch

max-parallel: 1 fires triggers sequentially (~8s apart) but each trigger returns 202 immediately. The Mac Mini skillRunning flag blocks concurrent requests -- when ts-toifood-back's skill is still running (~5-10 min), ts-toifood-web and ts-toifood triggers arrive, get 202, but are silently dropped. Only ts-toifood-back (first trigger) writes per run. Confirmed: LISTENER-LOG.log shows only one WRITE_OK entry per test run. skillRunning was designed to block stale TCP connections queueing up from a blocked event loop (fixed with execFile) -- it now over-blocks legitimate sequential triggers. Fix options: (A) remove skillRunning guard and rely on execFile async + natural serialisation, (B) queue incoming requests instead of dropping them, (C) trigger targets as separate workflow_dispatch runs with a delay between them.


## ISSUE:ts-repo 2026-06-22 -> TRIGGER-LOG.log and LISTENER-LOG.log not yet created -- Mac Mini has not pulled latest toigroup-listener.js

Split log changes pushed at 23:15 UTC (would-update-md.yml -> TRIGGER-LOG.log, toigroup-listener.js -> LISTENER-LOG.log). As of check at 23:30 UTC neither file exists in would/ -- WOULD-UPDATE-MD-LOG.log top entry still 23:10 UTC, confirming listener has not restarted with new code. Mac Mini must git pull + pm2 restart toigroup-listener before LISTENER-LOG.log will be created. Until then listener keeps writing to WOULD-UPDATE-MD-LOG.log (old path) while GH Actions will write to TRIGGER-LOG.log (new path) on next run -- logs will be split across all three files temporarily.


## ISSUE:ts-repo 2026-06-22 → global skill stale after split-log commits — synced before next run

Pull to 6f9fea5 brought toigroup-listener.js (LOG_PATH now would/LISTENER-LOG.log) and updated workflow (TRIGGER-LOG.log). Global ~/.claude/commands/would-update.md also needed resync to pick up any skill changes in the same pull.
## ISSUE:ts-repo 2026-06-22 -> WOULD-UPDATE-MD-LOG.log migration risk -- existing log entries will not appear in new split files

Current WOULD-UPDATE-MD-LOG.log contains interleaved trigger-layer and write-layer entries going back to Jun 19. Splitting into TRIGGER-LOG.log and LISTENER-LOG.log means historical context is in neither new file -- the old file stays as archive only. Also requires two coordinated changes: (1) would-update-md.yml log step path update in ts-repo, (2) appendToRunLog path update in toigroup-listener.js on Mac Mini -- listener must git pull after both files land or it keeps writing to WOULD-UPDATE-MD-LOG.log while GH Actions writes to TRIGGER-LOG.log, leaving LISTENER-LOG.log empty.


## ISSUE:ts-repo 2026-06-22 -> WOULD-UPDATE-MD-LOG.log still gets 409 after max-parallel fix -- two writers sharing one file with no coordination

max-parallel: 1 fixed the between-jobs race but a second race remains. Two independent systems both write to WOULD-UPDATE-MD-LOG.log: (1) GitHub Actions trigger-layer log step, (2) Mac Mini appendToRunLog firing async after skill completes. When a skill finishes mid-run and appendToRunLog commits, the next GH Actions log step holds a stale SHA and gets 409. Confirmed on run 27920295890: ts-toifood-web and ts-toifood-back trigger jobs logged ok, Mac Mini appendToRunLog for ts-toifood-web fired between them, ts-toifood trigger job fetched stale SHA and failed with 409. Fix: split into two files -- would/TRIGGER-LOG.log for GH Actions, would/LISTENER-LOG.log for Mac Mini listener.


## ISSUE:ts-repo 2026-06-22 → global skill out of sync again — suffix fix not in ~/.claude/commands/would-update.md after repo update

After Mac Mini committed suffix mapping fix (ts-toifood-back→back, ts-toifood-web→web) at 3e3c226, global skill at ~/.claude/commands/would-update.md was still at the previous version. Same stale-global-skill pattern as the 2026-06-20 WRITE_PARTIAL root cause. Fix: git pull + overwrite global skill from repo on every repo update.
## ISSUE:ts-repo 2026-06-22 -> would-update skill suffix mapping wrong for ts-toifood-back and ts-toifood-web -- source repo resolves to non-existent path

Step 2 of would-update.md derives source repo suffix via ${ARGUMENTS#ts-}. For ts-toifood-back this strips only "ts-" giving suffix "toifood-back" -- source becomes toifood-dev/ts-toifood-toifood-back (does not exist). Same bug for ts-toifood-web -> toifood-dev/ts-toifood-toifood-web. Only ts-toifood has a correct special case (suffix="dev"). Confirmed by ts-toifood-back WRITE_FAIL "no JSON array in output" on 2026-06-21 22:29 UTC -- skill ran but Claude got no source files and produced no parseable JSON. ts-toifood-web has been writing successfully despite the bug (Claude likely generates content from could/ headers alone without source files). Fix: add explicit cases for ts-toifood-back (suffix="back") and ts-toifood-web (suffix="web").


## ISSUE:ts-repo 2026-06-20 → WRITE_PARTIAL root cause confirmed — ~/.claude/commands/would-update.md was stale pre-fix version

Global skill at ~/.claude/commands/would-update.md contained the old hardcoded 8-category list ("Emit exactly 16 objects"), predating the 10fdc0f fix. Claude Code ran the global version instead of the fixed project version, causing every ts-toifood run to emit 16 entries with 10 WRITE_FAIL paths. Separate issue: 07:38 UTC WRITE_FAIL caused by Claude Pro OAuth invalidated after re-login to a different account on the same machine.
## ISSUE:ts-repo 2026-06-22 -> would-update-md fix reconsidered -- sequential log job approach overcomplicated

Proposed fix (separate sequential log job with matrix outputs) is unnecessarily complex. GitHub Actions matrix outputs with dynamic keys require static declarations -- adding a new target means updating the workflow. Simpler fix: add max-parallel: 1 to the trigger matrix strategy. Jobs run one at a time so log steps never race. Downside: triggers become sequential (~30s per target x 3 = ~90s worst case vs ~30s parallel). Acceptable tradeoff -- listener responds with 202 immediately, so the extra 60s has no functional impact.


## ISSUE:ts-repo 2026-06-22 -> would-update-md log job fix has dynamic output key limitation -- matrix targets must match declared outputs

Proposed fix moves Log run outcome to a sequential log job using per-target matrix outputs (result-<target>). GitHub Actions requires all job-level output keys to be declared statically -- dynamic keys from matrix.target work at emit time but may not be readable by the downstream log job if targets.json grows or changes. If a new target is added to targets.json without a matching output declaration in the trigger job, its http_code is silently dropped and the log entry is missing. Workaround: pass all results as a single JSON artifact file (upload-artifact / download-artifact) instead of job outputs -- log job reads the artifact and iterates serially regardless of target count.


## ISSUE:ts-repo 2026-06-21 -> would-update-md failing daily -- 409 conflict on log file update caused by parallel matrix jobs

Jun 20 and Jun 21 daily cron runs (06:00 UTC) both failed. The trigger job runs all targets from targets.json in parallel (matrix strategy). Each matrix job Log run outcome step independently GETs the current SHA of would/WOULD-UPDATE-MD-LOG.log, prepends its line, then PUTs with that SHA. When two jobs fetch the same SHA concurrently, the first to PUT succeeds and changes the file SHA -- all remaining jobs fail with HTTP 409. The trigger layer was healthy on both days (listener returned 202 for ts-toifood-web), but the log step race caused the entire workflow to fail. Fix: move Log run outcome to a new sequential log job (needs: [trigger]) that collects per-target status via matrix job outputs and writes entries serially.


## ISSUE:ts-repo 2026-06-19 → claude skill failed with "no stdin data received" — Claude Pro auth likely expired

07:38 UTC run got 202, listener triggered skill, but claude --dangerously-skip-permissions --print /would-update ts-toifood failed immediately with: "Warning: no stdin data received". WRITE_FAIL logged. No could/ entries written. Root cause: Claude Pro OAuth token in ~/.claude/ expired or invalidated — claude CLI requires interactive re-auth. Fix: SSH into Mac Mini as jayreck, run claude interactively to trigger OAuth browser refresh, then re-test.
## ISSUE:ts-repo 2026-06-19 → WRITE_PARTIAL persists — step 4 still generating 16 entries despite 10fdc0f fix

04:46 and 04:57 UTC runs both logged WRITE_PARTIAL: 6 ok, 10 failed of 16. Fix at 10fdc0f constrained step 4 to N discovered categories, but skill is still outputting all 16 (8 categories × 2). ts-toifood-dev only has PRICE, USAGE, ANALYSIS — 10 writes 404. Possible causes: (1) skill file in ~/.claude/commands/ on Mac Mini is still the old version pre-10fdc0f, (2) git pull only updated toigroup-listener.js but not the skill file. Mac Mini needs to verify skill file matches current would-update.md in ts-repo.
## ISSUE:ts-repo 2026-06-19 → local repo blocked at 10fdc0f — uncommitted toigroup-listener.js changes prevented git pull

Local /Users/jayreck/toifood/ts-repo had uncommitted appendToRunLog changes to toigroup-listener.js, blocking merge with remote (ff966fc). Listener was running stale code — likely cause of continued WRITE_PARTIAL despite skill fix at 10fdc0f. Fixed: git stash + git pull + pm2 restart toigroup-listener. Local repo now at ff966fc. Next run expected to emit 6 entries (3 discovered categories × ISSUE + ASSET).
## ISSUE:ts-repo 2026-06-19 → ts-toifood skill outputs 16 entries but only 3 categories exist — 10 writes fail every run

skill done — 16 entries but toifood/-ts-toifood-dev only has PRICE, USAGE, ANALYSIS in could/. MIGRATE, RECOVERY, INSTRUCTION, BUG, TEST (×2 = 10) 404 on write every run → WRITE_PARTIAL. Dynamic category discovery should limit output to N discovered categories only. Step 4 likely still generating hardcoded 8-category set for ts-toifood target.
## ISSUE:ts-repo 2026-06-19 → appendToRunLog never fired — listener deployed to wrong path

PM2 runs toigroup-listener from `/Users/jayreck/toifood/ts-repo/toigroup-listener.js`. Updated file was copied to `~/toigroup-listener.js` (wrong path) — PM2 kept running the old code with no appendToRunLog. All restarts since f3d065a were no-ops. Fixed by copying to correct path and restarting.
## ISSUE:ts-repo 2026-06-19 → dual insert zones in ISSUE/ASSET docs — Claude Code missed all Mac Mini entries

ISSUE-2026Q2.md and ASSET-2026Q2.md had two conflicting insert points: Mac Mini added at the very top (below "ALWAYS ADD NEW ENTRIES AT THE TOP"), Claude Code added after the ANCHOR MARKER further down. Anchor marker was below the Mac Mini entries, between a "NEVER DELETE" block and the older entries. Claude Code read from anchor position only — all Mac Mini 2026-06-19 entries were invisible. Fixed by moving anchor marker to immediately after the instruction header, eliminating the split. Commits: e8027a3 (ISSUE), 400ace50 (ASSET).
## ISSUE:ts-repo 2026-06-19 → 03:04 run got 202 but no could/ entries appeared — write layer silent

02:28 run wrote 6 could/ entries at 02:43-02:44 UTC (PRICE, USAGE, ANALYSIS × ISSUE+ASSET). 03:04 run also got 202 but no new could/ commits appeared in toifood/-ts-toifood-dev after 02:44. Skill may have skipped writing (saw fresh same-session entries) or failed silently. Needs pm2 logs toigroup-listener check on Mac Mini.
## ISSUE:ts-repo 2026-06-19 → appendToRunLog not writing to WOULD-UPDATE-MD-LOG.log — write-layer log still unconfirmed

Two 202 success runs (02:28, 03:04) each triggered the listener and ran the skill. Log shows only trigger-layer entries ("listener accepted — verify write via pm2 logs"). No write-layer entries have appeared. appendToRunLog() should write after writeEntriesToGitHub resolves — but nothing is committed. Needs pm2 logs toigroup-listener to confirm whether appendToRunLog is being called and what error (if any) it returns.
## ISSUE:ts-repo 2026-06-19 → HTTP 530 persists even with Mac Mini on — cloudflared tunnel not running

would-update-md returned 530 twice after Mac Mini was confirmed on. Root cause: machine on does not guarantee tunnel connected. toigroup-tunnel in PM2 must also be running and healthy. Fix: pm2 status — if toigroup-tunnel is stopped/errored, pm2 restart toigroup-tunnel. 530 = tunnel process down, not a machine power issue.
## ISSUE:ts-repo 2026-06-19 → WOULD-UPDATE-MD-LOG step initially failed — GITHUB_TOKEN lacked contents:write + HTTP code was 530 not 1033

Two bugs in initial implementation: (1) workflow GITHUB_TOKEN only had contents:read — log step got 403 on PUT. Fixed by adding permissions: contents: write to would-update-md.yml. (2) Log step checked HTTP_CODE = 1033 but Cloudflare returns 530 as the HTTP status; 1033 is in the response body only. Fixed note-matching to check for 530.
## ISSUE:ts-repo 2026-06-19 → appendToRunLog write-layer logging unconfirmed — TOIFOOD_CROSS_REPO_TOKEN may lack access to jayreck996/ts-repo

Listener appendToRunLog() uses TOIFOOD_CROSS_REPO_TOKEN to write back to jayreck996/ts-repo/would/WOULD-UPDATE-MD-LOG.log. Token was created for toifood org repos — may not have write access to jayreck996 personal repo. No write-layer entries appeared in log after 202 success at 02:28 UTC. Needs verification: pm2 env 10 on Mac Mini to check token is set, and confirm token has repo scope on jayreck996/ts-repo.
## ISSUE:ts-repo 2026-06-19 → toigroup-tunnel death root cause — Friday 3am reboot killed cloudflared mid-retry, stale PM2 command didn't relaunch correctly

Two things hit at 15:00 UTC 2026-06-18 (= Friday 03:00 NZST):
1. Transient QUIC dial failure (`sendmsg: no route to host` on UDP 7844 to Cloudflare edge) — cloudflared was mid-retry.
2. Friday 3am reboot sent `signal terminated` before the retry completed — process exited.

PM2 restarted the slot after reboot but the saved command was incorrect — cloudflared spawned and exited immediately. PM2 marked it "online" based on the process slot, not whether cloudflared stayed alive. Result: tunnel dead, PM2 showed green.
## ISSUE:ts-repo 2026-06-19 → toigroup-tunnel exited at 15:00 UTC 2026-06-18 — PM2 showed online but cloudflared was dead

PM2 reported toigroup-tunnel (id 3) as "online" but cloudflared had terminated at 15:00 UTC 2026-06-18 with a QUIC dial failure. All subsequent workflow runs returned 530. Root cause: PM2 was tracking a stale process slot, not the live cloudflared daemon. Manual `cloudflared tunnel run` confirmed the tunnel connects fine — PM2 re-registration fixed it.
## ISSUE:ts-repo 2026-06-19 → TSREPO_TOKEN unnecessary — TOIFOOD_CROSS_REPO_TOKEN already has write access to ts-repo

appendToRunLog() was wired to a new TSREPO_TOKEN env var. TOIFOOD_CROSS_REPO_TOKEN (already in PM2 env) has admin+push access to jayreck996/ts-repo — no separate token needed. Extra env var adds maintenance overhead for no benefit.
## ISSUE:ts-repo 2026-06-19 → would-update-md had no observable outcome — trigger and write layers both invisible

Two failure modes were invisible to a remote team:
1. Mac Mini off → Cloudflare 1033 → GitHub Actions fails, no record of why.
2. Listener gets 202, skill runs → `writeEntriesToGitHub` fails silently → workflow green, docs unchanged, no trace.

Diagnosing either required SSH into the Mac Mini and checking `pm2 logs toigroup-listener` — not accessible to a remote team.

## ISSUE:ts-repo 2026-06-14 → would-update step 4 still hardcoded "16 combinations" — skill emitted 8 categories despite dynamic discovery

Step 3 of would-update.md discovered categories dynamically from the output repo's could/ dir. But step 4 retained "For each of the 16 combinations (8 categories × ISSUE + ASSET)" — Claude followed the hardcoded number and emitted all 8 categories regardless. On ts-toifood (only 3 categories: ANALYSIS, PRICE, USAGE), this produced 10 ❌ failures per run for MIGRATE, RECOVERY, INSTRUCTION, BUG, TEST files that don't exist in -ts-toifood-dev.
## ISSUE:ts-repo 2026-06-14 → toifood/-ts-toifood renamed to toifood/-ts-toifood-dev

targets.json outputRepo for ts-toifood updated from toifood/-ts-toifood to toifood/-ts-toifood-dev. Listener picked up change automatically via remote fetch (no restart needed).


## ISSUE:ts-repo 2026-06-14 -> would-update-md-test.js had two bugs — QUARTER undefined, default target stale

Two bugs found during test run:
1. QUARTER variable used on line 30 but never defined — produced path `could/TEST-ISSUE-undefined.md`; fixed by computing QUARTER at top of script.
2. Default target was `ts-web` — renamed to `ts-toifood-web` in targets.json; script would exit with 'Unknown target' if no arg passed.

Both fixed and pushed. Full test suite passed: 4/4 checks x 2 targets.


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
