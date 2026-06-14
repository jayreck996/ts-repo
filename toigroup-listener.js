#!/usr/bin/env node
// toigroup-listener — responds 202 immediately, runs skill async, writes to GitHub
// PM2: pm2 start toigroup-listener.js --name toigroup-listener
// Env: MACMINI_TRIGGER_TOKEN, <ORG>_CROSS_REPO_TOKEN per target

const http = require('http');
const { execSync, execFile } = require('child_process');

let skillRunning = false;

const PORT = 3456;
let targetsCache = null;
let targetsCacheAt = 0;
const TARGETS_URL = 'https://api.github.com/repos/jayreck996/ts-repo/contents/targets.json';

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

function writeEntriesToGitHub(entries, outputRepo, token) {
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
        message: `would-update: ${filePath}`,
        content: Buffer.from(updated).toString('base64'),
        sha: file.sha,
        committer: { name: 'would-update', email: 'admin@toigroup.co.nz' },
      });

      execSync(
        `curl -sf -X PUT -H "Authorization: Bearer ${token}" ` +
        `-H "Content-Type: application/json" ` +
        `"https://api.github.com/repos/${outputRepo}/contents/${filePath}" ` +
        `--data-binary @-`,
        { input: payload }
      );
      console.log(`✅ ${filePath}`);
    } catch (e) {
      console.error(`❌ ${filePath}:`, e.message);
    }
  }
}

function runSkill(target, quarter_override) {
  if (skillRunning) {
    console.log(`[${new Date().toISOString()}] skill busy — dropping request for target: ${target}`);
    return;
  }
  skillRunning = true;
  console.log(`[${new Date().toISOString()}] skill starting — target: ${target}`);

  let outputRepo, token;
  try {
    ({ outputRepo, token } = getTargetConfig(target));
  } catch (e) {
    console.error(`[${new Date().toISOString()}] skill error: ${e.message}`);
    skillRunning = false;
    return;
  }
  const env = {
    ...process.env,
    GH_TOKEN: token,
    OUTPUT_REPO: outputRepo,
    ...(quarter_override ? { QUARTER_OVERRIDE: quarter_override } : {}),
  };

  let output = '';
  const child = execFile('claude', ['--dangerously-skip-permissions', '--print', `/would-update ${target}`], {
    env,
    maxBuffer: 10 * 1024 * 1024,
  }, (err, stdout, stderr) => {
    skillRunning = false;
    if (err) {
      console.error(`[${new Date().toISOString()}] skill error: ${err.message}`);
      if (stderr) console.error(`[${new Date().toISOString()}] stderr: ${stderr.slice(0, 1000)}`);
      return;
    }

    const jsonMatch = stdout.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`[${new Date().toISOString()}] skill error: No JSON array in skill output`);
      console.error(`[${new Date().toISOString()}] raw output (first 2000 chars): ${stdout.slice(0, 2000)}`);
      return;
    }
    // Sanitize: replace raw newlines/tabs inside JSON string values
    const sanitized = jsonMatch[0].replace(/("(?:[^"\\]|\\.)*")/g, m =>
      m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
    );
    let entries;
    try {
      entries = JSON.parse(sanitized);
    } catch (parseErr) {
      console.error(`[${new Date().toISOString()}] skill error: ${parseErr.message}`);
      console.error(`[${new Date().toISOString()}] raw JSON match (first 3000 chars): ${jsonMatch[0].slice(0, 3000)}`);
      return;
    }

    console.log(`[${new Date().toISOString()}] skill done — ${entries.length} entries`);
    writeEntriesToGitHub(entries, outputRepo, token);
    console.log(`[${new Date().toISOString()}] all entries written`);
  });
}

function handle(req, res) {
  if (req.method !== 'POST' || req.url !== '/would-update') {
    res.writeHead(404).end();
    return;
  }

  const token = req.headers['x-token'];
  if (!token || token !== process.env.MACMINI_TRIGGER_TOKEN) {
    res.writeHead(401).end('Unauthorized');
    return;
  }

  let body = '';
  req.on('data', d => { body += d; });
  req.on('end', () => {
    const { target = 'ts-back', quarter_override } = body ? JSON.parse(body) : {};
    console.log(`[${new Date().toISOString()}] /would-update accepted — target: ${target}${quarter_override ? ` quarter=${quarter_override}` : ''}`);

    res.writeHead(202).end('Accepted');
    setImmediate(() => runSkill(target, quarter_override));
  });
}

http.createServer(handle).listen(PORT, () => {
  try {
    const targets = fetchTargets();
    console.log(`toigroup-listener ready on :${PORT} — targets: ${targets.map(t => t.target).join(', ')}`);
  } catch (e) {
    console.error(`toigroup-listener ready on :${PORT} — targets: (fetch failed: ${e.message})`);
  }
});
