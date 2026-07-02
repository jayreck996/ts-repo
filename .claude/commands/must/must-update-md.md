**OUTPUT RULE: Your entire response must be a single JSON array. No prose, no explanation, no markdown, no preamble. If you cannot produce valid entries for any reason, output `[]` and nothing else.**

Review the target repo's compliance and business requirements across T&C, PRIVACY, PRICE, USAGE, and ROADMAP. Output a JSON array of must/ entries. Agents may read and update existing entries — do not duplicate; update or extend as requirements evolve.

## Arguments
`$ARGUMENTS` is the target repo name, e.g. `ts-toifood-back`.

## Steps

### 0. Compute quarter and timestamp

```bash
QUARTER=$(node -e "
  const o = process.env.QUARTER_OVERRIDE;
  if (o) { console.log(o); process.exit(0); }
  const m = new Date().getMonth() + 1;
  console.log(new Date().getFullYear() + 'Q' + Math.ceil(m / 3));
")
TS=$(TZ=Pacific/Auckland date '+%Y-%m-%d %H:%M')
echo "Quarter: $QUARTER | Timestamp: $TS"
```

### 1. Set source branch

```bash
latestBranch="main"
```

### 2. Read codebase via GitHub API

```bash
case "$ARGUMENTS" in
  ts-toifood)      suffix="dev";  org="toifood" ;;
  ts-toifood-back) suffix="back"; org="toifood" ;;
  ts-toifood-web)  suffix="web";  org="toifood" ;;
  -ts-test-back)   suffix="test-back";  org="jayreck996" ;;
  -ts-test-front)  suffix="test-front"; org="jayreck996" ;;
  ts-test-back)    suffix="test-back";  org="jayreck996" ;;
  ts-test-front)   suffix="test-front"; org="jayreck996" ;;
  *)               suffix="${ARGUMENTS#ts-}"; org="jayreck996" ;;
esac

tree=$(gh api "repos/${org}/-ts-${suffix}/git/trees/${latestBranch}?recursive=1" 2>/dev/null) || { echo "[]"; exit 0; }
gh api "repos/${org}/-ts-${suffix}/git/trees/${latestBranch}?recursive=1" \
  --jq '.tree[] | select(.type=="blob") | select(.path | test("\.(csv|log|md|lock|d\.ts|map|spec\.ts|test\.ts)$") | not) | select(.path | test("(^|/)node_modules/|(-|/)dist/") | not) | .path'
```

Focus reads on: `package.json`, `prisma/schema.prisma`, payment/pricing/subscription routes, user data collection paths, usage-tracking middleware, rate-limit config.

### 3. Fetch must/ files from output repo

```bash
OUTPUT_REPO="${OUTPUT_REPO}"
CATS=$(gh api "repos/${OUTPUT_REPO}/contents/must" --jq '.[].name' 2>/dev/null \
  | grep -oE '^[A-Z]+' | sort -u)
if [ -z "$CATS" ]; then echo "[]"; exit 0; fi
echo "CATEGORIES_LOCKED: $CATS"
```

**STOP. Only use categories from CATEGORIES_LOCKED.**

Fetch full file content for each category (agents may modify existing entries):

```bash
for cat in $CATS; do
  for type in ISSUE ASSET; do
    path="must/${cat}-${type}-${QUARTER}.md"
    gh api "repos/${OUTPUT_REPO}/contents/${path}" --jq '.content' | base64 -d 2>/dev/null || echo ""
  done
done
```

Read: **prompt** line, **path** line, existing entries — do not duplicate; update in place.

### 4. Generate analyses

Category focus:
- **TC** — terms and conditions coverage: what the codebase implies about user agreements, missing consent flows, unenforceable clauses inferred from data usage
- **PRIVACY** — data collected vs disclosed: PII fields in schema, retention, deletion paths, third-party sharing
- **PRICE** — pricing model accuracy: price fields, discount logic, currency handling, billing edge cases, missing validation
- **USAGE** — usage tracking and limits: rate limits, quota enforcement, metering, missing usage guards
- **ROADMAP** — feature completeness vs implied promises: TODOs, stubs, incomplete flows vs what the API surface suggests is expected

For existing entries — update if state has changed; leave unchanged if accurate. Write updated entries with new timestamp.

**Emit exactly N×2 entries** — one ISSUE and one ASSET per category in CATEGORIES_LOCKED.

Format:
```
## ISSUE:{CATEGORY} {TS} ▸ {one-line summary}

{specific finding with file/field references}
```

### 5. Output JSON

**JSON ENCODING RULES:**
- Use `\n` for line breaks — never literal newlines inside string values
- Escape double-quotes as `\"`
- No trailing commas, no prose outside the array

```json
[
  {
    "path": "must/{CAT}-ISSUE-{QUARTER}.md",
    "entry": "## ISSUE:{cat} {TS} ▸ one-line summary\n\nContent here."
  },
  {
    "path": "must/{CAT}-ASSET-{QUARTER}.md",
    "entry": "## ASSET:{cat} {TS} ▸ one-line summary\n\nContent here."
  }
]
```

**If anything failed — output `[]` only. Never output prose.**