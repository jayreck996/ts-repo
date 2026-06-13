#!/usr/bin/env node
// toigroup-listener — responds 202 immediately, runs skill async, writes to GitHub
// PM2: pm2 start toigroup-listener.js --name toigroup-listener
// Env: MACMINI_TRIGGER_TOKEN, TOIFOOD_CROSS_REPO_TOKEN

const http = require('http');
const { execSync } = require('child_process');

const PORT = 3456;

function writeEntriesToGitHub(entries, token) {
  for (const { path, entry } of entries) {
    try {
      const file = JSON.parse(execSync(
        `curl -sf -H "Authorization: Bearer ${token}" ` +
        `"https://api.github.com/repos/toifood/ts-back/contents/${path}"`
      ).toString());

      const current = Buffer.from(file.content, 'base64').toString('utf8');
      const updated = current.replace(
        /(####### <!-- ANCHOR MARKER[^\n]*\n)/,
        `$1${entry}\n`
      );

      const payload = JSON.stringify({
        message: `would-update: ${path}`,
        content: Buffer.from(updated).toString('base64'),
        sha: file.sha,
        committer: { name: 'would-update', email: 'admin@toigroup.co.nz' },
      });

      execSync(
        `curl -sf -X PUT -H "Authorization: Bearer ${token}" ` +
        `-H "Content-Type: application/json" ` +
        `"https://api.github.com/repos/toifood/ts-back/contents/${path}" ` +
        `--data-binary @-`,
        { input: payload }
      );
      console.log(`✅ ${path}`);
    } catch (e) {
      console.error(`❌ ${path}:`, e.message);
    }
  }
}

function runSkill(quarter_override) {
  console.log(`[${new Date().toISOString()}] skill starting`);
  try {
    const output = execSync(
      'claude --dangerously-skip-permissions --print "/would-update ts-back"',
      {
        env: {
          ...process.env,
          GH_TOKEN: process.env.TOIFOOD_CROSS_REPO_TOKEN,
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
    writeEntriesToGitHub(entries, process.env.TOIFOOD_CROSS_REPO_TOKEN);
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
    const { quarter_override } = body ? JSON.parse(body) : {};
    console.log(`[${new Date().toISOString()}] /would-update accepted${quarter_override ? ` quarter=${quarter_override}` : ''}`);

    // respond before Cloudflare proxy times out (~100s)
    res.writeHead(202).end('Accepted');

    // run skill in background
    setImmediate(() => runSkill(quarter_override));
  });
}

http.createServer(handle).listen(PORT, () => {
  console.log(`toigroup-listener ready on :${PORT}`);
});
