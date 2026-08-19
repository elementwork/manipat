# Printable Answers and Explanations

Canonical ManipAT exams default to an exam-like presentation: questions, choices, a blank Answer Sheet, and embedded canonical question data. Correct answers are not printed unless explicitly requested.

Use one of three solution modes:

```bash
# Default: no printed answer key or explanations
pnpm dat generate set --seed exam-001 --offline \
  --solutions none --output ./output/exam-001.html

# Append a compact Answer Key
pnpm dat generate set --seed exam-001 --offline \
  --solutions key --output ./output/exam-001-key.html

# Append Answer Key plus detailed category-specific explanations
pnpm dat generate set --seed exam-001 --offline \
  --solutions full --output ./output/exam-001-solutions.html
```

`--include-explanations` is a backward-compatible alias for `--solutions full`.

The same setting can be supplied in a JSON config as:

```json
{
  "solutions": "full"
}
```

The legacy config field `"includeExplanations": true` also maps to full solutions.

## Solution truth

Solution pages do not infer answers from rendered pixels. They consume the already-validated canonical question fields:

- `correctChoiceIndex`;
- structured category `explanation` data;
- correct choice SVG when the category has a visual answer.

The renderer formats those fields into human-readable explanations for all six PAT categories.

## Portable study exam

`pnpm dat:view:portable exam.html` does not require the source exam to have been generated with `--solutions key` or `--solutions full`.

The portable Study Tools drawer reads the same embedded canonical question data and can reveal **Check Answer** and **Show Explanation** interactively while keeping the original exam pages intact.
