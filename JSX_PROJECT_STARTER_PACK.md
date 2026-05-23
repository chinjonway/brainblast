# JSX Project Starter Pack

Use this as the starting point for a new JSX / React project.

## What To Create

Create a new folder for the new project, then set up a clean app scaffold first.

Recommended structure:

- `package.json`
- `index.html`
- `src/main.jsx`
- `src/App.jsx` or your main JSX file
- `.github/copilot-instructions.md`
- `AI_DEPLOYMENT_WORKFLOW.md`
- `AI_DEPLOYMENT_PROMPT_SHORT.md`
- `wrangler.toml` if deploying to Cloudflare Pages
- `functions/` if the app needs server-side API routes

## What To Copy

Copy only reusable guidance files and source code you actually want to reuse:

- `.github/copilot-instructions.md`
- `AI_DEPLOYMENT_WORKFLOW.md`
- `AI_DEPLOYMENT_PROMPT_SHORT.md`
- any shared JSX components or utility files

## What Not To Copy

Do not copy build or local machine artifacts:

- `dist/`
- `node_modules/`
- `.wrangler/`
- `.dev.vars`
- old deployment logs

## Recommended AI Workflow

1. Read the current files first.
2. Identify the app structure before editing.
3. Make the smallest safe change.
4. Keep API keys and secrets server-side only.
5. Validate with a build after edits.
6. If deployment files changed, commit, push, and redeploy.
7. Verify the live app after deploy.

## Starter Prompt For The Next AI

```text
You are starting a new JSX/React project.

Follow this workflow:
1. Read the current files first.
2. Determine whether the task is UI, build, API, or deployment related.
3. Create or adjust the minimal project structure needed.
4. Keep secrets server-side only if the project uses APIs.
5. If using Cloudflare Pages, make sure the build output and functions folder are configured correctly.
6. Validate changes with a build.
7. If deployment files changed, commit, push, and redeploy.
8. Check the live result after deploy.

If the project is missing files, create the clean scaffold first instead of patching around a broken setup.
If something fails, fix the root cause and verify again.
```

## Optional Cloudflare Pages Setup

If the new project will use Cloudflare Pages, use these defaults:

- Build command: `npm run build`
- Build output directory: `dist`
- Functions folder: `functions`
- Required secret: `ANTHROPIC_API_KEY` or another API key depending on the app

## Short Version

If you want the shortest possible instruction to paste into an AI, use this:

```text
Create a clean JSX/React project in this folder. Read the current files first, make the smallest safe change, keep secrets server-side, validate with a build, and if deployment files change then commit, push, redeploy, and verify the live app.
```
