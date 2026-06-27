#!/usr/bin/env node
// toigroup-listener — responds 202 immediately, runs skill async, writes to GitHub
// PM2: pm2 start toigroup-listener.js --name toigroup-listener
// Env: MACMINI_TRIGGER_TOKEN, <ORG>_CROSS_REPO_TOKEN per target

const http = require('http');
const { execSync, execFile } = require('child_process');

const skillQueue = [];
let skillRunning = false;

function processQueue() {
  if (skillRunning || skillQueue.length === 0) return;
  const { target, quarter_override } = skillQueue.shift();
  runSkill(target, quarter_override);
}

const PORT = 3456;
let targetsCache = null;
let targetsCacheAt = 0;
const TARGETS_URL = 'https://api.github.com/repos/jayreck996/ts-repo/contents/targets.json';
const LOG_REPO = 'jayreck996/ts-repo';
const LOG_PATH = 'would/LISTENER-LOG.log';

function fetchTargets() {
  if (targetsCache && Date.now() - targetsCacheAt < 60_000) return targetsCache;
  try {
    const raw = execSync(`curl -sf "${TARGETS_URL}"`).toString();
    const content = JSON.parse(raw).content;
    targetsCache = JSON.parse(Buffer.from(content, 'base64').toString());
    targetsCacheAt = Date.now();
    console.log(`[${new Date().toISOString()}] targets refreshed — ${targetsCache.map(t => t.target).join(', ')}`);
  } catch (e) {
    if (!targetsCache) throw new Error(`Failed to fetch targets.json: ${e.message}`);
    console.error(`[${new Date().toISOString()}] targets refresh failed (using cached): ${e.message}`);
  }
  return targetsCache;
}

function getTargetConfig(target) {
  const targets = fetchTargets();
  const config = targets.find(t => t.target === target);
  if (!config) throw new Error(`Unknown target: ${target}`);
  const token = process.env[config.tokenSecret];
  if (!token) throw new Error(`Missing env var: ${config.tokenSecret}`);
  return { ...config, token };
}

function appendToRunLog(target, status, note) {
  const token = process.env.TOIFOOD_CROSS_REPO_TOKEN;
  if (!token) {
    console.error(`[${new Date().toISOString()}] appendToRunLog: TOIFOOD_CROSS_REPO_TOKEN not set`);
    return;
  }
  try {
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    const line = `${ts} | ${target} | ${status.padEnd(14)} | --- | ${note}`;

    let sha = '';
    let current = '';
    try {
      const fileRaw = execSync(
        `curl -sf -H "Authorization: Bearer ${token}" ` +
        `"https://api.github.com/repos/${LOG_REPO}/contents/${LOG_PATH}"`
      ).toString();
      const file = JSON.parse(fileRaw);
      sha = file.sha;
      current = Buffer.from(file.content, 'base64').toString('utf8');
    } catch (_) {
      // file may not exist yet — start fresh
    }

    const updated = line + '\n' + current;
    const payload = JSON.stringify({
      message: `could-update-md: log ${ts} — ${target}`,
      content: Buffer.from(updated).toString('base64'),
      ...(sha ? { sha } : {}),
      committer: { name: 'could-update', email: 'admin@toigroup.co.nz' },
    });

    execSync(
      `curl -sf -X PUT -H "Authorization: Bearer ${token}" ` +
      `-H "Content-Type: application/json" ` +
      `"https://api.github.com/repos/${LOG_REPO}/contents/${LOG_PATH}" ` +
      `--data-binary @-`,
      { input: payload }
    );
    console.log(`[${new Date().toISOString()}] run log: ${line}`);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] appendToRunLog error: ${e.message}`);
  }
}

function writeEntriesToGitHub(entries, outputRepo, token) {
  let ok = 0, fail = 0;
  for (const { path: filePath, entry } of entries) {
    try {
      const file = JSON.parse(execSync(
        `curl -sf -H "Authorization: Bearer ${token}" ` +
        `"https://api.github.com/repos/${outputRepo}/contents/${filePath}"`
      ).toString());

      const current = Buffer.from(file.content, 'base64').toString('utf8');
      const anchorIdx = current.indexOf('####### <!-- ANCHOR MARKER');
      if (anchorIdx === -1) throw new Error('Anchor marker not found');
      const newlineIdx = current.indexOf('\n', anchorIdx);
      const insertAt = newlineIdx === -1 ? current.length : newlineIdx + 1;
      const updated = current.slice(0, insertAt) + entry + '\n' + current.slice(insertAt);

      const payload = JSON.stringify({
        message: `could-update: ${filePath}`,
        content: Buffer.from(updated).toString('base64'),
        sha: file.sha,
        committer: { name: 'could-update', email: 'admin@toigroup.co.nz' },
      });

      execSync(
        `curl -sf -X PUT -H "Authorization: Bearer ${token}" ` +
        `-H "Content-Type: application/json" ` +
        `"https://api.github.com/repos/${outputRepo}/contents/${filePath}" ` +
        `--data-binary @-`,
        { input: payload }
      );
      console.log(`✅ ${filePath}`);
      ok++;
    } catch (e) {
      console.error(`❌ ${filePath}:`, e.message);
      fail++;
    }
  }
  return { ok, fail };
}

function runSkill(target, quarter_override) {
  skillRunning = true;
  console.log(`[${new Date().toISOString()}] skill starting — target: ${target}`);

  let outputRepo, token;
  try {
    ({ outputRepo, token } = getTargetConfig(target));
  } catch (e) {
    console.error(`[${new Date().toISOString()}] skill error: ${e.message}`);
    skillRunning = false;
    appendToRunLog(target, 'WRITE_FAIL', `config error: ${e.message}`);
    processQueue();
    return;
  }
  const env = {
    ...process.env,
    GH_TOKEN: token,
    OUTPUT_REPO: outputRepo,
    ...(quarter_override ? { QUARTER_OVERRIDE: quarter_override } : {}),
  };

  execFile('claude', ['--dangerously-skip-permissions', '--print', `/could/could-update-md ${target}`], {
    env,
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  }, (err, stdout, stderr) => {
    skillRunning = false;
    if (err) {
      console.error(`[${new Date().toISOString()}] skill error: ${err.message}`);
      if (stderr) console.error(`[${new Date().toISOString()}] stderr: ${stderr.slice(0, 1000)}`);
      appendToRunLog(target, 'WRITE_FAIL', `skill error: ${err.message.slice(0, 120)}`);
      processQueue();
      return;
    }

    const jsonMatch = stdout.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`[${new Date().toISOString()}] skill error: No JSON array in skill output`);
      console.error(`[${new Date().toISOString()}] raw output (first 2000 chars): ${stdout.slice(0, 2000)}`);
      appendToRunLog(target, 'WRITE_FAIL', 'skill error: no JSON array in output');
      processQueue();
      return;
    }

    const sanitized = jsonMatch[0].replace(/("(?:[^"\\]|\\.)*")/g, m =>
      m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
    );
    let entries;
    try {
      entries = JSON.parse(sanitized);
    } catch (parseErr) {
      console.error(`[${new Date().toISOString()}] skill error: ${parseErr.message}`);
      console.error(`[${new Date().toISOString()}] raw JSON match (first 3000 chars): ${jsonMatch[0].slice(0, 3000)}`);
      appendToRunLog(target, 'WRITE_FAIL', `skill error: JSON parse failed — ${parseErr.message.slice(0, 80)}`);
      processQueue();
      return;
    }

    console.log(`[${new Date().toISOString()}] skill done — ${entries.length} entries`);
    const { ok, fail } = writeEntriesToGitHub(entries, outputRepo, token);
    console.log(`[${new Date().toISOString()}] all entries written`);

    const status = fail === 0 ? 'WRITE_OK' : ok === 0 ? 'WRITE_FAIL' : 'WRITE_PARTIAL';
    const note = fail === 0
      ? `${ok}/${entries.length} entries committed`
      : `${ok} ok, ${fail} failed of ${entries.length}`;
    appendToRunLog(target, status, note);
    processQueue();
  });
}


// === SHOULD-UPDATE-MD ===
const shouldQueue = [];
let shouldRunning = false;
const SHOULD_LOG_PATH = 'should/SHOULD-LISTENER-LOG.log';

function processShouldQueue() {
  if (shouldRunning || shouldQueue.length === 0) return;
  const { target, quarter_override } = shouldQueue.shift();
  runShouldSkill(target, quarter_override);
}

function appendToShouldLog(target, status, note) {
  const token = process.env.TOIFOOD_CROSS_REPO_TOKEN;
  if (!token) {
    console.error(`[${new Date().toISOString()}] appendToShouldLog: TOIFOOD_CROSS_REPO_TOKEN not set`);
    return;
  }
  try {
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    const line = `${ts} | ${target} | ${status.padEnd(14)} | --- | ${note}`;
    let sha = '';
    let current = '';
    try {
      const fileRaw = execSync(
        `curl -sf -H "Authorization: Bearer ${token}" ` +
        `"https://api.github.com/repos/${LOG_REPO}/contents/${SHOULD_LOG_PATH}"`
      ).toString();
      const file = JSON.parse(fileRaw);
      sha = file.sha;
      current = Buffer.from(file.content, 'base64').toString('utf8');
    } catch (_) {}
    const updated = line + '\n' + current;
    const payload = JSON.stringify({
      message: `should-update-md: log ${ts} — ${target}`,
      content: Buffer.from(updated).toString('base64'),
      ...(sha ? { sha } : {}),
      committer: { name: 'should-update', email: 'admin@toigroup.co.nz' },
    });
    execSync(
      `curl -sf -X PUT -H "Authorization: Bearer ${token}" ` +
      `-H "Content-Type: application/json" ` +
      `"https://api.github.com/repos/${LOG_REPO}/contents/${SHOULD_LOG_PATH}" ` +
      `--data-binary @-`,
      { input: payload }
    );
    console.log(`[${new Date().toISOString()}] should log: ${line}`);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] appendToShouldLog error: ${e.message}`);
  }
}

function runShouldSkill(target, quarter_override) {
  shouldRunning = true;
  console.log(`[${new Date().toISOString()}] should-skill starting — target: ${target}`);
  let outputRepo, token;
  try {
    ({ outputRepo, token } = getTargetConfig(target));
  } catch (e) {
    console.error(`[${new Date().toISOString()}] should-skill error: ${e.message}`);
    shouldRunning = false;
    appendToShouldLog(target, 'WRITE_FAIL', `config error: ${e.message}`);
    processShouldQueue();
    return;
  }
  const env = {
    ...process.env,
    GH_TOKEN: token,
    OUTPUT_REPO: outputRepo,
    ...(quarter_override ? { QUARTER_OVERRIDE: quarter_override } : {}),
  };
  execFile('claude', ['--dangerously-skip-permissions', '--print', `/should/should-update-md ${target}`], {
    env,
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  }, (err, stdout, stderr) => {
    shouldRunning = false;
    if (err) {
      console.error(`[${new Date().toISOString()}] should-skill error: ${err.message}`);
      if (stderr) console.error(`[${new Date().toISOString()}] stderr: ${stderr.slice(0, 1000)}`);
      appendToShouldLog(target, 'WRITE_FAIL', `skill error: ${err.message.slice(0, 120)}`);
      processShouldQueue();
      return;
    }
    const jsonMatch = stdout.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`[${new Date().toISOString()}] should-skill error: No JSON array in skill output`);
      console.error(`[${new Date().toISOString()}] raw output (first 2000 chars): ${stdout.slice(0, 2000)}`);
      appendToShouldLog(target, 'WRITE_FAIL', 'skill error: no JSON array in output');
      processShouldQueue();
      return;
    }
    const sanitized = jsonMatch[0].replace(/("(?:[^"\\]|\\.)*")/g, m =>
      m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
    );
    let entries;
    try {
      entries = JSON.parse(sanitized);
    } catch (parseErr) {
      console.error(`[${new Date().toISOString()}] should-skill error: ${parseErr.message}`);
      console.error(`[${new Date().toISOString()}] raw JSON match (first 3000 chars): ${jsonMatch[0].slice(0, 3000)}`);
      appendToShouldLog(target, 'WRITE_FAIL', `skill error: JSON parse failed — ${parseErr.message.slice(0, 80)}`);
      processShouldQueue();
      return;
    }
    console.log(`[${new Date().toISOString()}] should-skill done — ${entries.length} entries`);
    const { ok, fail } = writeEntriesToGitHub(entries, outputRepo, token);
    const status = fail === 0 ? 'WRITE_OK' : ok === 0 ? 'WRITE_FAIL' : 'WRITE_PARTIAL';
    const note = fail === 0 ? `${ok}/${entries.length} entries committed` : `${ok} ok, ${fail} failed of ${entries.length}`;
    appendToShouldLog(target, status, note);
    processShouldQueue();
  });
}
function handle(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(404).end();
    return;
  }

  const token = req.headers['x-token'];
  if (!token || token !== process.env.MACMINI_TRIGGER_TOKEN) {
    res.writeHead(401).end('Unauthorized');
    return;
  }

  if (req.url === '/could/could-update-md') {
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      const { target = 'ts-back', quarter_override } = body ? JSON.parse(body) : {};
      console.log(`[${new Date().toISOString()}] /could/could-update-md accepted — target: ${target}${quarter_override ? ` quarter=${quarter_override}` : ''}`);
      res.writeHead(202).end('Accepted');
      skillQueue.push({ target, quarter_override });
      setImmediate(processQueue);
    });
  } else if (req.url === '/should/should-update-md') {
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      const { target = 'ts-back', quarter_override } = body ? JSON.parse(body) : {};
      console.log(`[${new Date().toISOString()}] /should/should-update-md accepted — target: ${target}${quarter_override ? ` quarter=${quarter_override}` : ''}`);
      res.writeHead(202).end('Accepted');
      shouldQueue.push({ target, quarter_override });
      setImmediate(processShouldQueue);
    });
  } else {
    res.writeHead(404).end();
  }
}

http.createServer(handle).listen(PORT, () => {
  try {
    const targets = fetchTargets();
    console.log(`toigroup-listener ready on :${PORT} — targets: ${targets.map(t => t.target).join(', ')}`);
  } catch (e) {
    console.error(`toigroup-listener ready on :${PORT} — targets: (fetch failed: ${e.message})`);
  }
});

