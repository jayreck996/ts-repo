#!/usr/bin/env node
// toigroup-listener — responds 202 immediately, runs skill async, writes to GitHub
// PM2: pm2 start toigroup-listener.js --name toigroup-listener
// Env: MACMINI_TRIGGER_TOKEN, <ORG>_CROSS_REPO_TOKEN per target

const http = require('http');
const { execSync } = require('child_process');
const path = require('path');

const PORT = 3456;
const TARGETS = require(path.join(__dirname, 'targets.json'));

function getTargetConfig(target) {
  const config = TARGETS.find(t => t.target === target);
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
      const updated = current.replace(
        /(####### <!-- ANCHOR MARKER[^\n]*\n)/,
        `$1${entry}\n`
      );

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
  console.log(`[${new Date().toISOString()}] skill starting — target: ${target}`);
  try {
    const { outputRepo, token } = getTargetConfig(target);

    const output = execSync(
      `claude --dangerously-skip-permissions --print "/would-update ${target}"`,
      {
        env: {
          ...process.env,
          GH_TOKEN: token,
          ...(quarter_override ? { QUARTER_OVERRIDE: quarter_override } : {}),
        },
        maxBuffer: 10 * 1024 * 1024,
      }
    ).toString();

    const jsonMatch = output.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`[${new Date().toISOString()}] skill error: No JSON array in skill output`);
      console.error(`[${new Date().toISOString()}] raw output (first 2000 chars): ${output.slice(0, 2000)}`);
      return;
    }
    const entries = JSON.parse(jsonMatch[0]);

    console.log(`[${new Date().toISOString()}] skill done — ${entries.length} entries`);
    writeEntriesToGitHub(entries, outputRepo, token);
    console.log(`[${new Date().toISOString()}] all entries written`);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] skill error: ${e.message}`);
    if (e.stderr) console.error(`[${new Date().toISOString()}] stderr: ${e.stderr.toString().slice(0, 1000)}`);
  }
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
  console.log(`toigroup-listener ready on :${PORT} — targets: ${TARGETS.map(t => t.target).join(', ')}`);
});
