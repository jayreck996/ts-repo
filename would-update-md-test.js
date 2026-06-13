#!/usr/bin/env node
// Test harness for would-update-md pipeline.
// Usage: node would-update-md-test.js [target]   (default: ts-web)
// Tests: JSON sanitization, anchor insertion, GitHub API write — no Claude skill run.

const { execSync } = require('child_process');
const path = require('path');

const TARGETS = require(path.join(__dirname, 'targets.json'));
const target = process.argv[2] || 'ts-web';

const config = TARGETS.find(t => t.target === target);
if (!config) { console.error(`Unknown target: ${target}`); process.exit(1); }
const token = process.env[config.tokenSecret];
if (!token) { console.error(`Missing env var: ${config.tokenSecret}`); process.exit(1); }
const { outputRepo } = config;

const QUARTER = 'TEST-2026Q2';
const TS = new Date().toISOString().slice(0, 16).replace('T', ' ');

// --- 1. JSON sanitizer (mirrors listener logic) ---
function sanitizeJSON(raw) {
  return raw.replace(/("(?:[^"\\]|\\.)*")/g, m =>
    m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  );
}

function testSanitizer() {
  const raw = `[
  {
    "path": "could/TEST-ISSUE-${QUARTER}.md",
    "entry": "## ISSUE:test ${TS} → line one
line two with raw newline
line three"
  }
]`;
  const sanitized = sanitizeJSON(raw);
  let parsed;
  try {
    parsed = JSON.parse(sanitized);
    console.log('✅ sanitizer: raw newlines handled correctly');
    return parsed;
  } catch (e) {
    console.error('❌ sanitizer failed:', e.message);
    process.exit(1);
  }
}

// --- 2. Anchor insertion (mirrors listener logic) ---
function insertAtAnchor(current, entry) {
  const anchorIdx = current.indexOf('####### <!-- ANCHOR MARKER');
  if (anchorIdx === -1) throw new Error('Anchor marker not found');
  const newlineIdx = current.indexOf('\n', anchorIdx);
  const insertAt = newlineIdx === -1 ? current.length : newlineIdx + 1;
  return current.slice(0, insertAt) + entry + '\n' + current.slice(insertAt);
}

function testAnchorInsertion(entry) {
  // Simulate file with no trailing newline (the problematic case)
  const fileNoTrailingNl = 'ISSUE LOG\n\n####### <!-- ANCHOR MARKER - ADD ALL NEW ISSUE ENTRIES DIRECTLY BELOW THIS LINE, NEVER DELETE OR EDIT PREVIOUS ISSUE ENTRIES-->';
  const result1 = insertAtAnchor(fileNoTrailingNl, entry);
  if (!result1.includes(entry)) { console.error('❌ anchor insertion: entry missing (no-trailing-newline case)'); process.exit(1); }
  console.log('✅ anchor insertion: no-trailing-newline case');

  // Simulate file with trailing newline
  const fileWithNl = fileNoTrailingNl + '\n';
  const result2 = insertAtAnchor(fileWithNl, entry);
  if (!result2.includes(entry)) { console.error('❌ anchor insertion: entry missing (trailing-newline case)'); process.exit(1); }
  console.log('✅ anchor insertion: trailing-newline case');
}

// --- 3. GitHub write (real API call to a test file) ---
function testGitHubWrite(entry) {
  const testPath = `could/TEST-ISSUE-${QUARTER}.md`;
  const header = `TEST FILE — safe to delete\n\n####### <!-- ANCHOR MARKER - ADD ALL NEW ISSUE ENTRIES DIRECTLY BELOW THIS LINE, NEVER DELETE OR EDIT PREVIOUS ISSUE ENTRIES-->`;

  // Ensure test file exists
  try {
    const existing = JSON.parse(execSync(
      `curl -sf -H "Authorization: Bearer ${token}" "https://api.github.com/repos/${outputRepo}/contents/${testPath}"`
    ).toString());

    // File exists — insert entry
    const current = Buffer.from(existing.content, 'base64').toString('utf8');
    const updated = insertAtAnchor(current, entry);
    const payload = JSON.stringify({
      message: `would-update-md-test: ${testPath}`,
      content: Buffer.from(updated).toString('base64'),
      sha: existing.sha,
      committer: { name: 'would-update-test', email: 'admin@toigroup.co.nz' },
    });
    execSync(
      `curl -sf -X PUT -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" ` +
      `"https://api.github.com/repos/${outputRepo}/contents/${testPath}" --data-binary @-`,
      { input: payload }
    );
  } catch {
    // File doesn't exist — create it first
    execSync(
      `curl -sf -X PUT -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" ` +
      `"https://api.github.com/repos/${outputRepo}/contents/${testPath}" --data-binary @-`,
      { input: JSON.stringify({
          message: `would-update-md-test: create ${testPath}`,
          content: Buffer.from(header).toString('base64'),
          committer: { name: 'would-update-test', email: 'admin@toigroup.co.nz' },
        })
      }
    );
    // Now insert
    const fresh = JSON.parse(execSync(
      `curl -sf -H "Authorization: Bearer ${token}" "https://api.github.com/repos/${outputRepo}/contents/${testPath}"`
    ).toString());
    const current = Buffer.from(fresh.content, 'base64').toString('utf8');
    const updated = insertAtAnchor(current, entry);
    const payload = JSON.stringify({
      message: `would-update-md-test: ${testPath}`,
      content: Buffer.from(updated).toString('base64'),
      sha: fresh.sha,
      committer: { name: 'would-update-test', email: 'admin@toigroup.co.nz' },
    });
    execSync(
      `curl -sf -X PUT -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" ` +
      `"https://api.github.com/repos/${outputRepo}/contents/${testPath}" --data-binary @-`,
      { input: payload }
    );
  }

  // Verify entry appears in file
  const verify = JSON.parse(execSync(
    `curl -sf -H "Authorization: Bearer ${token}" "https://api.github.com/repos/${outputRepo}/contents/${testPath}"`
  ).toString());
  const verifyContent = Buffer.from(verify.content, 'base64').toString('utf8');
  if (verifyContent.includes(entry)) {
    console.log(`✅ GitHub write: entry visible in ${outputRepo}/${testPath}`);
  } else {
    console.error(`❌ GitHub write: entry NOT found in ${outputRepo}/${testPath}`);
    process.exit(1);
  }
}

// --- Run ---
console.log(`\nwould-update-md-test — target: ${target} (${outputRepo})\n`);
const entries = testSanitizer();
const entry = entries[0].entry;
testAnchorInsertion(entry);
testGitHubWrite(entry);
console.log('\nAll tests passed.');
