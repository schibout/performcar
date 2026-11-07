## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

### Workspace layout (Windows)

- The workspace root is `C:/Projects/template/apps`. The existing graphs are in
  `backend/graphify-out/graph.json` and `frontend/graphify-out/graph.json`;
  root `graphify-out/` currently contains only a cache, not a complete graph.
- From the workspace root, use `graphify query "<question>" --graph backend/graphify-out/graph.json`
  or `--graph frontend/graphify-out/graph.json`. Query both for cross-stack questions.
- Resolve graph source paths relative to their owning application directory.
- Run incremental updates from the relevant application directory, for example
  `Set-Location backend` then `graphify update .`; do not rebuild the entire
  workspace merely because its root graph is absent.
- `database/` contains the SQL scripts and database analysis. Consult the backend
  graph for related models and migrations, then read the relevant SQL directly.
- Graphify is installed with its optional dependencies in the isolated UV tool
  environment. For Python APIs use the interpreter recorded in each graph's
  `.graphify_python`. See `GRAPHIFY.md` for installation and verification commands.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
