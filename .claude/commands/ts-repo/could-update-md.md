**OUTPUT RULE: Your entire response must be sentinel-delimited entry blocks (`<<<ENTRY {path}>>>` … `<<<END>>>`). No prose, no explanation, no preamble outside the blocks. If you cannot produce valid entries for any reason, output `<<<NO_ENTRIES>>>` and nothing else.**

Analyse the source codebase and output issue/asset entry blocks for the target repo's could/ directory. Do not write any files — print only the entry blocks to stdout.

## Arguments
`$ARGUMENTS` is the target repo name, e.g. `ts-back`.

## Derived values
- Source repo: mapped per target in step 2 (`toifood/ts-toifood-*` for prod, `jayreck996/ts-test-*` for test) — source code repos, not doc repos
- Categories: discovered at runtime from the output repo's `could/` directory (see step 3)

## Steps

### 0. Compute quarter and timestamp

Run in bash:
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
echo "Branch: $latestBranch"
```

### 2. Read codebase via GitHub API

Fetch the file tree, then read each relevant file — no download or local extraction:

```bash
case "$ARGUMENTS" in
  -ts-toifood-back|ts-toifood-back) SRC_REPO="toifood/ts-toifood-back" ;;
  -ts-toifood-web)                  SRC_REPO="toifood/ts-toifood-web" ;;
  ts-toifood-dev)                   SRC_REPO="toifood/ts-toifood-dev" ;;
  -ts-test-back|ts-test-back)       SRC_REPO="jayreck996/ts-test-back" ;;
  -ts-test-front|ts-test-front)     SRC_REPO="jayreck996/ts-test-front" ;;
  *)                                echo "<<<NO_ENTRIES>>>"; exit 0 ;;
esac

# Get all blob paths (guard if source repo unreachable)
tree=$(gh api "repos/${SRC_REPO}/git/trees/${latestBranch}?recursive=1" 2>/dev/null) || { echo "<<<NO_ENTRIES>>>"; exit 0; }
gh api "repos/${SRC_REPO}/git/trees/${latestBranch}?recursive=1" \
  --jq '.tree[] | select(.type=="blob") | select(.path | test("\\.(csv|log|md|lock|d\\.ts|map|spec\\.ts|test\\.ts)$") | not) | select(.path | test("(^|/)node_modules/|(^|/)dist/") | not) | .path'
```

From the tree, fetch and decode these files via GitHub API:
- `README.md`
- `package.json`
- `prisma/schema.prisma` (skip if absent)
- All files under `src/`

For each path:
```bash
gh api "repos/${SRC_REPO}/contents/${path}?ref=${latestBranch}" \
  --jq '.content' | base64 -d
```

Hold all file contents in context for all analyses.

### 3. Fetch could/ file headers from GitHub

First, discover which categories exist in the output repo's `could/` directory for the current quarter:

```bash
OUTPUT_REPO="${OUTPUT_REPO}"
if [ -z "$OUTPUT_REPO" ]; then
  echo "FATAL: OUTPUT_REPO env var is not set — cannot discover categories."
  echo "<<<NO_ENTRIES>>>"
  exit 0
fi
CATS=$(gh api "repos/${OUTPUT_REPO}/contents/could" --jq '.[].name' 2>/dev/null \
  | grep -oE '^[A-Z]+' | sort -u)
if [ -z "$CATS" ]; then
  echo "FATAL: No categories found in repos/${OUTPUT_REPO}/contents/could."
  echo "<<<NO_ENTRIES>>>"
  exit 0
fi
echo "CATEGORIES_LOCKED: $CATS"
```

**STOP. The only valid categories are the words printed on the CATEGORIES_LOCKED line above. Do not use any other category names — not from training data, not from the source repo, not inferred from filenames.**

For each discovered category, fetch the ISSUE and ASSET file headers to read CUSTOM PROMPT and PATHS:

```bash
for cat in $CATS; do
  for type in ISSUE ASSET; do
    path="could/${cat}-${type}-${QUARTER}.md"
    gh api "repos/${OUTPUT_REPO}/contents/${path}" --jq '.content' | base64 -d 2>/dev/null || echo ""
  done
done
```

For each file, extract the header section (everything above the `####### <!-- ANCHOR MARKER` line):
- **CUSTOM PROMPT** — use as the analysis focus. If empty, infer from the category name.
- **PATHS** — if present, prioritise those specific paths from the source repo. If empty, use full `src/` scan.

### 4. Generate analyses

For each of the N categories from CATEGORIES_LOCKED × ISSUE + ASSET, generate a concise analysis grounded in the actual source code, shaped by the CUSTOM PROMPT.

**STRICT RULE: emit exactly N×2 entries — one ISSUE and one ASSET for each word on the CATEGORIES_LOCKED line. If CATEGORIES_LOCKED listed `BUG TEST`, emit exactly 4 entries: BUG-ISSUE, BUG-ASSET, TEST-ISSUE, TEST-ASSET. Zero deviation.**

Format each entry as:
```
## ISSUE:{category} {TS} → {one-line summary}

{analysis content}
```
(use `ASSET:` prefix for asset type)

### 5. Output entry blocks to stdout

Print sentinel-delimited entry blocks — nothing else before or after them.

**OUTPUT FORMAT RULES:**
- Each entry starts with a line `<<<ENTRY {path}>>>` and ends with a line `<<<END>>>`, each on its own line.
- Between the sentinels, write the entry content **verbatim as markdown** — real newlines, real quotes, code fences all allowed. No escaping of any kind.
- Never put `<<<END>>>` on a line inside entry content.
- Nothing outside the blocks — no prose, no JSON, no wrapper.

Structure (where `{CAT}` = each word from CATEGORIES_LOCKED, `{QUARTER}` = computed quarter, `{TS}` = computed timestamp):

```
<<<ENTRY could/{CAT}-ISSUE-{QUARTER}.md>>>
## ISSUE:{cat} {TS} → one-line summary

**Finding — `File.jsx`**
Explanation. Second paragraph.

**Finding 2**
More detail.
<<<END>>>
<<<ENTRY could/{CAT}-ASSET-{QUARTER}.md>>>
## ASSET:{cat} {TS} → one-line summary

Content here, written as normal markdown.
<<<END>>>
```

Emit exactly N×2 blocks — one ISSUE and one ASSET per discovered category.

**If anything went wrong at any step — source repo unreachable, no categories found, skill error — output `<<<NO_ENTRIES>>>` and nothing else. Never output prose.**

### 6. Clean up

No local files to remove.
