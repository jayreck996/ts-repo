**OUTPUT RULE: Your entire response must be sentinel-delimited entry blocks (`<<<ENTRY {path}>>>` … `<<<END>>>`). No prose, no explanation, no preamble outside the blocks. If you cannot produce valid entries for any reason, output `<<<NO_ENTRIES>>>` and nothing else.**

Analyse the target repo's current architecture, migration, and recovery state. Output should/ entry blocks. Agents may read and update existing entries — do not duplicate what already exists; instead update or extend it.

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
  -ts-toifood-back|ts-toifood-back) SRC_REPO="toifood/ts-toifood-back" ;;
  -ts-toifood-web)                  SRC_REPO="toifood/ts-toifood-web" ;;
  ts-toifood-dev)                   SRC_REPO="toifood/ts-toifood-dev" ;;
  -ts-test-back|ts-test-back)       SRC_REPO="jayreck996/ts-test-back" ;;
  -ts-test-front|ts-test-front)     SRC_REPO="jayreck996/ts-test-front" ;;
  *)                                echo "<<<NO_ENTRIES>>>"; exit 0 ;;
esac

tree=$(gh api "repos/${SRC_REPO}/git/trees/${latestBranch}?recursive=1" 2>/dev/null) || { echo "<<<NO_ENTRIES>>>"; exit 0; }
gh api "repos/${SRC_REPO}/git/trees/${latestBranch}?recursive=1" \
  --jq '.tree[] | select(.type=="blob") | select(.path | test("\.(csv|log|md|lock|d\.ts|map|spec\.ts|test\.ts)$") | not) | select(.path | test("(^|/)node_modules/|(-|/)dist/") | not) | .path'
```

Fetch and read: `README.md`, `package.json`, `prisma/schema.prisma` (if present), all files under `src/`.

### 3. Fetch should/ files from output repo

Discover categories from the output repo's `should/` directory:

```bash
OUTPUT_REPO="${OUTPUT_REPO}"
CATS=$(gh api "repos/${OUTPUT_REPO}/contents/should" --jq '.[].name' 2>/dev/null \
  | grep -oE '^[A-Z]+' | sort -u)
if [ -z "$CATS" ]; then
  echo "<<<NO_ENTRIES>>>"
  exit 0
fi
echo "CATEGORIES_LOCKED: $CATS"
```

**STOP. Only use categories from CATEGORIES_LOCKED.**

For each category, fetch the **full file content** (not just the header) — agents may update existing entries:

```bash
for cat in $CATS; do
  for type in ISSUE ASSET; do
    path="should/${cat}-${type}-${QUARTER}.md"
    gh api "repos/${OUTPUT_REPO}/contents/${path}" --jq '.content' | base64 -d 2>/dev/null || echo ""
  done
done
```

Read:
- **prompt** line — analysis focus for this category
- **path** line — target file path
- Existing entries below the anchor — do not duplicate; update or extend them

### 4. Generate analyses

For each category x ISSUE + ASSET:

- **ISSUE entries**: architecture risks, migration blockers, recovery gaps — what should be resolved
- **ASSET entries**: architecture decisions, migration progress, recovery procedures — current state

If an existing entry for the same topic is already present, write an **updated version** of it (prepend with updated timestamp). Do not re-emit unchanged content.

**Emit exactly N×2 entries** — one ISSUE and one ASSET per category in CATEGORIES_LOCKED.

Format:
```
## ISSUE:{category} {TS} ▸ {one-line summary}

{analysis — what needs resolving, with specific file/schema references}
```

### 5. Output entry blocks

**OUTPUT FORMAT RULES:**
- Each entry starts with a line `<<<ENTRY {path}>>>` and ends with a line `<<<END>>>`, each on its own line.
- Between the sentinels, write the entry content verbatim as markdown — real newlines, quotes, and code fences allowed. No escaping.
- Never put `<<<END>>>` on a line inside entry content.
- Nothing outside the blocks — no prose, no JSON.

```
<<<ENTRY should/{CAT}-ISSUE-{QUARTER}.md>>>
## ISSUE:{cat} {TS} ▸ one-line summary

Content here, written as normal markdown.
<<<END>>>
<<<ENTRY should/{CAT}-ASSET-{QUARTER}.md>>>
## ASSET:{cat} {TS} ▸ one-line summary

Content here.
<<<END>>>
```

**If anything failed — output `<<<NO_ENTRIES>>>` only. Never output prose.**