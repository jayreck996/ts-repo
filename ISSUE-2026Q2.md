### ts-repo: scheduled 06:00 UTC run silently skipped – Mac Mini tunnel unreachable (2026-06-27)
- GitHub Actions run #33 (Scheduled) completed in 32s at ~07:16 UTC with no errors
- Zero entries written to TRIGGER-LOG.log, LISTENER-LOG.log, or any output repo for Jun 27
- Root cause: Cloudflare tunnel unreachable (HTTP 530) – Mac Mini offline or cloudflared tunnel down
- Same pattern previously seen: Jun 26 00:07 UTC both ts-test targets logged `failure | 530 | tunnel unreachable`
- Workflow handles 530 gracefully and exits success, masking the failure
- Fix: verify Mac Mini and cloudflared are running before 06:00 UTC; consider alerting on 530

### ts-repo: Node.js 20 deprecated in all workflow jobs (2026-06-27)
- All jobs in could-update-md.yml warned: "Node.js 20 is deprecated, being forced to run on Node.js 24"
- Affects setup, run (matrix), and log jobs
- No failures caused yet but will become a hard error in a future GitHub Actions runner update
- Fix: update `node-version: 20` to `node-version: 24` in could-update-md.yml

### run #30: ts-test-front/ts-test-back exit code 1 (2026-06-27)
- Manual run #30 (~00:06 UTC Jun 27) failed for ts-test-front and ts-test-back with exit code 1
- Token: TSREPO_TOKEN – full stderr not visible without GitHub sign-in
- Transient: runs #31 and #32 on same targets both succeeded within 2 hours
- No code changes made between #30 and #31 – likely a runtime/network blip
