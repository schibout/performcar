---
allowed-tools: Bash(gh issue view:*), Bash(gh search:*), Bash(gh issue list:*), Bash(gh pr comment:*), Bash(gh pr diff:*), Bash(gh pr view:*), Bash(gh pr list:*), Bash(gh api:*)
description: Code review a pull request against NextJS-Template conventions
disable-model-invocation: false
---

# /review — NextJS-Template PR Review Pipeline

You are orchestrating a multi-agent code review pipeline for a pull request in the **NextJS-Template** (Next.js 16 + React 19 + TypeScript strict + Tailwind 4 + shadcn/ui + TanStack Query + Zustand + axios + Zod + i18next) repository. Every agent is grounded in this repo's conventions, captured in `REVIEW.md` at the repo root.

## Inputs

- `$ARGUMENTS` may contain a PR number or URL. If empty, default to the PR for the current branch (resolve via `gh pr view --json number,url,headRefOid,baseRefName,state,isDraft,title,author,body`).
- All `gh` calls must use `--json` with explicit fields. Never parse human-readable output.

## Pipeline

Execute the eight steps below in order. Each step that says "spawn an agent" must use the Agent tool. Agent prompts are written in English (more reliable for model instructions); the final user-facing comment is in **Turkish** (the project's working language).

> **No nested agents.** Only the orchestrator (this top-level loop) spawns agents — exactly at Steps 1, 2, 3, 4, and 5. Every spawned agent is a **leaf**: it completes its task entirely within its own context and MUST NOT call the `Agent`/`Task` tool or spawn any sub-agent of its own. If work needs to be split, only the orchestrator splits it.

---

### Step 1 — Eligibility check (Sonnet)

Spawn a `general-purpose` agent with `model: "sonnet"`. Prompt:

> You are gating a code review. Decide whether this PR is eligible.
>
> Run `gh pr view <PR> --json state,isDraft,author,title,body,labels,headRefOid,baseRefName,url,comments` and respond with strict JSON:
> `{ "eligible": boolean, "reason": string, "headSha": string, "baseRef": string, "url": string, "owner": string, "repo": string, "number": number }`.
>
> Mark `eligible: false` if any of the following hold:
>
> - PR `state` is not `OPEN`
> - PR `isDraft` is `true`
> - The author login matches a bot pattern (`*[bot]`, `dependabot`, `renovate`, `github-actions`)
> - The title or body indicates an auto-generated release/version-bump (e.g., `chore(release):`, `Bump dependency`, "production deploy" merges)
> - There is already a comment from a previous `/review` run (search comment bodies for the marker `<!-- review:done -->`)
>
> Otherwise `eligible: true`. Return only the JSON.

If `eligible` is false, abort the pipeline and print the reason. Do not post any comment.

Capture `headSha`, `owner`, `repo`, `number`, `url` for later steps.

---

### Step 2 — REVIEW.md path discovery (Sonnet)

Spawn a `general-purpose` agent with `model: "sonnet"`. Prompt:

> Find the path to `REVIEW.md` at the repository root for the PR head SHA `<headSha>`. Use `gh api repos/<owner>/<repo>/contents/REVIEW.md?ref=<headSha> --jq '.path'`. If it does not exist at root, search the repo tree for any file named `REVIEW.md` via `gh api repos/<owner>/<repo>/git/trees/<headSha>?recursive=1 --jq '.tree[] | select(.path | endswith("REVIEW.md")) | .path'` and pick the shortest path.
>
> Return strict JSON: `{ "reviewMdPath": string | null }`.

If `reviewMdPath` is null, post a single comment to the PR explaining `REVIEW.md` could not be found and abort. Do not flag any issues without it (false-positive risk is too high).

---

### Step 3 — PR summary (Sonnet)

Spawn a `general-purpose` agent with `model: "sonnet"`. Prompt:

> Summarize the PR for downstream reviewers.
>
> Run `gh pr view <number> --json title,body,additions,deletions,changedFiles,files` and `gh pr diff <number>` (truncate to first ~3000 lines if larger).
>
> Output strict JSON:
>
> ```
> {
>   "title": string,
>   "intent": string,            // 1-2 sentences in English describing the change goal
>   "touchedAreas": string[],    // domain folders, e.g. ["app/[locale]/(auth)/login", "hooks/api", "lib/api/api.ts", "schemas"]
>   "changedFiles": [{ "path": string, "additions": number, "deletions": number, "status": string }],
>   "diffExcerpt": string        // truncated unified diff (max 80k chars), used by downstream agents
> }
> ```

Pass this object to the five parallel reviewers in Step 4.

---

### Step 4 — Five parallel Sonnet reviewers

> **Read-only mandate for every spawned agent (Steps 1–5).** Each agent's ONLY output is the JSON described in its prompt. An agent MUST NOT post, edit, or delete anything on the PR: never run `gh pr comment`, `gh issue comment`, `gh pr review`, or any `gh api` call with `-X POST`/`-X PATCH`/`-X PUT`/`-X DELETE`. Only the orchestrator posts, and only once, in Step 8. Any agent that writes to the PR is a pipeline violation and causes duplicate comments. **Each agent is also a leaf node: it does its own work in its own context and MUST NOT call the `Agent`/`Task` tool or spawn any sub-agent.** A spawned agent that spawns further agents is a pipeline violation.

Spawn the following five agents **in parallel** in a single message, all with `subagent_type: "general-purpose"` and `model: "sonnet"`. Each must return strict JSON of the shape:

```json
{
  "issues": [
    {
      "file": "src/...",
      "startLine": 12,
      "endLine": 18,
      "category": "review-md-compliance | bug | history | past-comment | code-comment",
      "severity": "blocker | major | minor",
      "title": "Short Turkish phrase",
      "explanation": "Turkish, 1-3 sentences. Cite REVIEW.md section or concrete reasoning.",
      "evidence": "Optional verbatim quote from REVIEW.md or the changed code",
      "suggestion": "Turkish, one-line concrete fix"
    }
  ]
}
```

#### Agent #1 — REVIEW.md compliance

> You are auditing a NextJS-Template PR against the repository's conventions captured in `REVIEW.md` at the repo root.
>
> 1. Fetch `REVIEW.md` content: `gh api repos/<owner>/<repo>/contents/<reviewMdPath>?ref=<headSha> --jq '.content' | base64 -d`.
> 2. Read the full PR diff (provided by the orchestrator as `diffExcerpt`, plus run `gh pr diff <number>` if needed).
> 3. For every **changed line** (only lines added or modified in this PR), check whether it violates a rule in REVIEW.md sections **3 (Konvansiyonlar)**, **4 (Anti-pattern'ler)** or **5 (Review'da KESİNLİKLE Flag'lenecekler)**.
> 4. Apply REVIEW.md section **6 (Görmezden Gelinecekler)** as a hard filter — if a finding falls under that list, drop it.
>
> Anchor every issue to a section/quote from REVIEW.md (`evidence` field). Do not invent rules. Do not flag pre-existing code that the PR did not touch. Output the JSON schema above — do NOT post or modify any PR comment; return only the JSON.

#### Agent #2 — Shallow bug scan (Next.js 16 + React 19 specific)

> You are looking for concrete Next.js / React / TypeScript bugs in the changed lines of this NextJS-Template PR.
>
> Read the diff via `gh pr diff <number>`. Only flag bugs in **added or modified lines**. Focus on:
>
> **Next.js 16 / App Router:**
>
> - A new `middleware.ts` file (this repo uses `src/proxy.ts` instead — blocker).
> - `import` from `next/router` (App Router uses `next/navigation`).
> - Adding webpack config to `next.config.ts` (Turbopack is default).
> - `"use client"` added to a `page.tsx`/`layout.tsx` that doesn't need it (interactive UI should be split into a `*Content.tsx`).
> - Server component using browser APIs / event handlers / `useState` without `"use client"`.
> - Hardcoded paths like `/login` or `/dashboard` instead of `getLocalizedPath(ROUTES.X, locale)`.
> - New protected/auth route not added to `protectedRoutes`/`authRoutes` lists in `src/lib/config/routes.ts` — `proxy.ts` and `AuthHydrator` will not guard it.
>
> **React 19:**
>
> - Stale closure / missing or wrong `useEffect`/`useMemo`/`useCallback` dependency arrays (and unjustified `eslint-disable react-hooks/exhaustive-deps`).
> - Direct state mutation followed by `setState` (`arr.push(x); setArr(arr)`).
> - List render using `key={index}` when a stable id is available, or duplicate keys (`react/no-array-index-key` warns).
> - `useState(expensiveExpr())` without lazy initializer; cases where `useRef` is the right primitive instead of `useState`.
> - Conditional or out-of-order hook calls.
> - Missing cleanup in `useEffect` (intervals, subscriptions, WebSockets, AbortController).
> - `useState(() => new QueryClient())` outside of `QueryProvider.tsx` — App Router remounts would discard the cache.
>
> **TanStack Query:**
>
> - Missing query key parameters (e.g., id, `i18n.language`, page/filter params).
> - Numeric `staleTime`/`gcTime` overrides without justification (defaults live in `QueryProvider.tsx`).
> - Missing `queryClient.invalidateQueries` after a mutation that changes server state.
> - Missing `queryClient.clear()` on session-impacting mutations (login/logout/deactivate paterni).
> - Numeric query key like `["users", id]` instead of using a `userKeys` factory.
>
> **Forms:**
>
> - New form without a Zod schema in `src/schemas/`.
> - React Hook Form + `zodResolver` paterni bypass'lı (doğrudan `<input>` + manual state).
> - `Controller`/`FormField` (shadcn `Form` + RHF) yerine ham `<input>`.
> - Submit handler swallowing errors / loading state UI'a yansıtılmamış.
>
> **Auth & API:**
>
> - Direct `fetch()` veya yeni `axios.create()` (must go through `src/lib/api/api.ts`).
> - Manual `Authorization: Bearer ...` header (this repo uses HttpOnly cookies + `withCredentials: true`).
> - Removing `X-Requested-With: XMLHttpRequest` or `withCredentials: true` from the axios instance — CSRF defense breaks.
> - Token written anywhere (localStorage outside `auth-storage` flag, sessionStorage, URL query, console, error message).
> - Reading profile fields out of `localStorage` (only `isAuthenticated` flag is persisted; profile re-fetched from `/users/me`).
> - Modifying `_retry`/`refreshPromise` deduplication in `api.ts` interceptor (could cause infinite refresh loops).
> - Removing `sessionRequestInFlight` module-level guard from `AuthHydrator.tsx`.
>
> **Security:**
>
> - `dangerouslySetInnerHTML` on untrusted input without sanitization.
> - `NEXT_PUBLIC_*` env exposing a secret (these are in the client bundle).
> - `process.env.X` direct usage instead of `import { env } from "@/env"`.
> - Open redirect from user input via `router.push(userInput)` or `<Link href={userInput}>`.
>
> **Toast:**
>
> - Manual `toast.error(error.message)` in a hook when the api interceptor already shows the toast (duplicate notifications).
> - `alert()` instead of `toast`.
>
> **i18n:**
>
> - Hardcoded user-facing string anywhere in JSX or props instead of `t(key)`.
> - `t(key)` call without the key existing in BOTH `src/i18n/locales/en/<ns>.json` and `src/i18n/locales/tr/<ns>.json`.
> - New namespace not registered in `src/i18n/config.ts` `resources` + `ns` array.
> - Validation messages hardcoded outside the schema factory `getXSchema(t)` pattern.
>
> **Styling:**
>
> - Inline `style={{}}` (except motion `initial`/`animate` or CSS-variable patterns).
> - Hardcoded hex color (e.g., `bg-[#1677ff]`) instead of theme tokens (`bg-primary`, `text-muted-foreground`).
> - New `.css` file (other than the existing `globals.css`).
>
> Use **REVIEW.md section 6 (Görmezden Gelinecekler)** as a filter — anything in that list must be dropped, even if technically suboptimal. Output strict JSON per the shared schema.

#### Agent #3 — Git blame & history

> Investigate whether the PR's changes contradict prior intent in the same files.
>
> For each changed file, run `gh api repos/<owner>/<repo>/commits?path=<path>&per_page=20 --jq '.[] | {sha,commit:.commit.message,author:.commit.author.name}'` and `gh pr list --state merged --search "<filename>" --json number,title,url --limit 10`.
>
> Flag an issue when:
>
> - The PR reverts a recent fix (commit message indicates a bug fix on the same lines/region within the last 90 days).
> - The PR re-introduces a pattern that a previous commit explicitly removed (look for `revert`, `fix`, `refactor` messages on the same path).
> - A recent commit on the same area suggests a constraint the PR may break (e.g., `proxy.ts`, `api.ts`, `AuthHydrator.tsx`, `auth.store.ts` are tightly coordinated — changes to one without the others may break a prior fix).
>
> Be conservative: only flag with `severity: major` or `blocker` if the contradiction is direct and the prior commit message is explicit. Otherwise omit. Output strict JSON.

#### Agent #4 — Past PR comments on touched files

> Discover whether reviewers previously raised concerns on the files this PR touches.
>
> For each changed file, run `gh search prs --repo <owner>/<repo> --json number,title,url "<filename>"` and for the top 5 results fetch `gh api repos/<owner>/<repo>/pulls/<n>/comments --jq '.[] | {path,line,body,user:.user.login}'`.
>
> Flag if:
>
> - A reviewer previously rejected an identical pattern that is being reintroduced here.
> - A previously-agreed convention (e.g., "use `getLocalizedPath`", "wrap with `AuthHydrator` flow", "no manual `Authorization` header", "use `userKeys` factory", "split page.tsx server / \*Content.tsx client") is being violated again.
>
> Quote the prior comment in `evidence`. Skip noise. Output strict JSON.

#### Agent #5 — Inline code-comment compliance & TypeScript-specific

> Audit comments, JSDoc, and TypeScript usage added by this PR. The repo style discourages narrating the obvious; use REVIEW.md section 5 (KESİNLİKLE Flag'lenecekler) and the project's general no-noise stance.
>
> Flag:
>
> - New comments that describe **what** the code does when the identifier already says it (`// fetch user — fetchUser()`).
> - Comments that reference the current ticket or PR (`// added for issue X`, `// per Ali's review`) — these rot in the codebase.
> - `TODO` without a tracker reference or owner.
> - Stale comments that contradict adjacent code after the change.
> - New `any` introduced — generic or `unknown` + narrowing should be used (`@typescript-eslint/no-explicit-any` warns).
> - New `!` non-null assertion (`@typescript-eslint/no-non-null-assertion` warns).
> - `as` cast'i with type forcing (especially `as any`, `as unknown as X`).
> - Inline `({a, b}: {a: string})` props in new components instead of `interface XProps`.
> - Interface name with `I`-prefix (eslint custom rule disallows it).
> - Template literal interpolation of `null`/`undefined`/`any` (`restrict-template-expressions` is `error`).
> - i18n: any user-facing string added without going through `useTranslation` / `t(...)`.
> - Default export added to a file that should use named export (anything other than `page.tsx`/`layout.tsx`/`error.tsx`/`loading.tsx`/`not-found.tsx`).
> - Relative `../` imports instead of `@/` alias.
> - File added that exceeds `max-lines: 300` or function exceeding the per-folder limit (components 150, hooks 80, api 120).
>
> Do NOT flag commented-out code unless it is clearly leftover debug. Output strict JSON.

---

### Step 5 — Per-issue confidence scoring (Haiku)

Aggregate all `issues` from the five reviewers. For each issue, spawn a `general-purpose` agent with `model: "haiku"` (or batch them in a single Haiku call passing an array — preferred for speed; Haiku is sufficient for the 0/25/50/75/100 bucketing task). Prompt:

> Score the confidence that this is a real, actionable issue worth posting on a PR review.
>
> Use the rubric below — pick the closest band, then return the integer.
>
> - **0**: Not an issue. Misreads the diff, contradicts REVIEW.md "Görmezden Gelinecekler", or describes a hypothetical that the code does not actually do.
> - **25**: Probably noise. Generic best-practice rather than a repo-specific rule. Linter/TypeScript would catch it.
> - **50**: Plausible but unverified. The reasoning is sound but lacks a direct REVIEW.md anchor or a concrete reproduction.
> - **75**: Likely correct. Anchored in REVIEW.md or a clear Next.js/React/TS bug pattern, with a specific file:line reference; minor uncertainty about user intent.
> - **100**: Definitely correct. Bug or rule violation visible in the diff, with verbatim REVIEW.md quote or unambiguous reasoning. Suggested fix is concrete.
>
> Input: `{ issue: <issue-json>, reviewMdExcerpt: <relevant section> }`.
> Output strict JSON: `{ "confidence": 0|25|50|75|100, "reason": "one short sentence" }`. Return only the JSON — do NOT post or modify any PR comment.

---

### Step 6 — Filter

Drop every issue whose `confidence < 70`. The threshold is fixed.

With the rubric's 0/25/50/75/100 bands, a threshold of 70 admits the **75 ("Likely correct")** and **100 ("Definitely correct")** tiers and rejects everything ≤ 50.

If no issues remain, post a comment indicating a clean review (still mark with the `<!-- review:done -->` sentinel) and end.

---

### Step 7 — Re-check eligibility

Re-run Step 1 quickly (the PR may have been closed, marked draft, or already commented during the run). If now ineligible, abort without posting.

---

### Step 8 — Post the review comment

Build the comment in **Turkish**. For each surviving issue, generate a permanent GitHub link using the **full head SHA** captured in Step 1:

```
https://github.com/<owner>/<repo>/blob/<headSha>/<file>#L<startLine>-L<endLine>
```

Comment template:

```markdown
## /review — N bulgu

<!-- review:done -->

### 1. <issue.title>

**Dosya:** [<file>#L<startLine>-L<endLine>](permalink)
**Kategori:** <category> · **Önem:** <severity>

<issue.explanation>

> <issue.evidence> (REVIEW.md alıntısı veya kod kanıtı — varsa)

**Öneri:** <issue.suggestion>

---

### 2. ...

---

🤖 Generated with [Claude Code](https://claude.ai/code)
```

If `N == 0`, the body is:

```markdown
## /review — temiz

<!-- review:done -->

Bu PR'da REVIEW.md kurallarına aykırı veya tespit edilebilir bir bug bulunamadı.

🤖 Generated with [Claude Code](https://claude.ai/code)
```

Post via:

```
gh pr comment <number> --body-file <tmpfile>
```

Use `--body-file` (not `--body`) to preserve markdown formatting and avoid shell-escaping issues.

---

## Hard rules for the orchestrator

- **Never edit files.** This command only reviews.
- **Only the orchestrator posts, and only in Step 8.** Spawned agents (Steps 1–5) are read-only: they return JSON and never call `gh pr comment`, `gh issue comment`, `gh pr review`, or a writing `gh api` (`-X POST/PATCH/PUT/DELETE`). If a sub-agent reports it already posted a comment, do not post again — verify the PR state and reconcile to exactly one correct comment.
- **No nested agents.** Spawned agents are leaf nodes — they complete their task in their own context and never call the `Agent`/`Task` tool or spawn sub-agents. Only the orchestrator spawns, exactly at Steps 1, 2, 3, 4, and 5.
- **Never post more than one comment per run.** All findings are batched into a single comment.
- **Never post without `REVIEW.md`** — abort instead. The whole pipeline relies on it for false-positive control.
- **Always use the full head SHA** in permalinks, captured at Step 1, even if the PR receives new commits during the run. The review applies to the SHA you actually read.
- **Never flag pre-existing code** the PR did not modify. The "changed lines" rule is non-negotiable for sections 3-5 of REVIEW.md.
- **Confidence threshold is 70**. Do not lower it; do not weight your own opinion against the Haiku score.
- **Do not skip Step 7.** A PR that flipped to draft or got closed mid-run must not receive a comment.
- **Agent prompts are English; the user-facing comment is Turkish.**
