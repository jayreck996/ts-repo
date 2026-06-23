Analyse the source codebase and output a JSON array of issue/asset entries for the target repo's could/ directory. Do not write any files — print only the JSON array to stdout.

## Arguments
`$ARGUMENTS` is the target repo name, e.g. `ts-back`.

## Derived values
- Source repo: `toifood-dev/ts-toifood-{suffix}` — suffix mapped per target (see step 2)
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
  ts-toifood) suffix="dev" ;;
  ts-toifood-back) suffix="back" ;;
  ts-toifood-web) suffix="web" ;;
  *) suffix="${ARGUMENTS#ts-toifood-}" ;;
esac

# Get all blob paths
gh api "repos/toifood-dev/ts-toifood-${suffix}/git/trees/${latestBranch}?recursive=1" \
  --jq '.tree[] | select(.type=="blob") | select(.path | test("\\.(csv|log|md|lock|d\\.ts|map|spec\\.ts|test\\.ts)$") | not) | select(.path | test("(^|/)node_modules/|(^|/)dist/") | not) | .path'
```

From the tree, fetch and decode these files via GitHub API:
- `README.md`
- `package.json`
- `prisma/schema.prisma` (skip if absent)
- All files under `src/`

For each path:
```bash
gh api "repos/toifood-dev/ts-toifood-${suffix}/contents/${path}?ref=${latestBranch}" \
  --jq '.content' | base64 -d
```

Hold all file contents in context for all analyses.

### 3. Fetch could/ file headers from GitHub

First, discover which categories exist in the output repo's `could/` directory for the current quarter:

```bash
OUTPUT_REPO="${OUTPUT_REPO}"
CATS=$(gh api "repos/${OUTPUT_REPO}/contents/could" --jq '.[].name' 2>/dev/null \
  | grep -oE '^[A-Z]+' | sort -u)
echo "Categories: $CATS"
```

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

For each of the N discovered categories × ISSUE + ASSET, generate a concise analysis grounded in the actual source code, shaped by the CUSTOM PROMPT. Use only the categories returned by step 3 — do not add or invent categories.

Format each entry as:
```
## ISSUE:{category} {TS} → {one-line summary}

{analysis content}
```
(use `ASSET:` prefix for asset type)

### 5. Output JSON to stdout

Print a single JSON array — nothing else before or after it:

```json
[
  { "path": "could/MIGRATE-ISSUE-2026Q2.md", "entry": "## ISSUE:migrate {TS} → ..." },
  { "path": "could/MIGRATE-ASSET-2026Q2.md", "entry": "## ASSET:migrate {TS} → ..." },
  ...
]
```

Use the computed `$QUARTER` value in each path. Emit exactly N×2 objects — one ISSUE and one ASSET per discovered category.

### 6. Clean up

No local files to remove.
