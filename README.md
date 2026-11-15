# Task register

A small Next.js 15 application with a tRPC backend and an in-memory task list. All UI text and documentation are in English. Use fictional task data only.

## Run locally

Use Node.js 22 LTS and npm. Extract the archive and open the `task-manager` directory containing `package.json`:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm start
```

Open http://127.0.0.1:3147. For development, use `npm run dev` instead of the build/start steps. The server binds to loopback by default. There are no environment variables, credentials, database services or migrations to configure.

## Behavior

- `/` renders the current task list on the server for each request.
- `/tasks/new` creates a task and returns to the list with a one-time **Task created.** confirmation.
- `/tasks/[id]/edit` edits an existing task and can clear its description. A successful save returns to the list with a one-time **Task updated.** confirmation.
- Delete opens an inline confirmation. **Cancel** or Escape keeps the task and restores focus to its Delete control. Confirmed deletion shows feedback; failures appear beside the task and can be retried.
- Blank or whitespace-only titles are rejected on the client and server.
- Pending mutations disable submission and show progress. Failed saves preserve typed values. Missing tasks have an explicit error/page.
- Field errors appear on blur or submission, are associated with their inputs, and focus the first invalid field on submission.
- The list displays normalized saved values. Counters measure trimmed lengths. Overlong pasted text stays intact and shows an error rather than being silently clipped.
- Create and edit both open a fresh task list after confirmation. Form entry/exit uses ordinary document links, so native browser warnings protect changed drafts when following links, going Back, reloading or closing a tab. This trades page loads for predictable freshness and navigation protection. A confirmed save bypasses the warning. Browser support governs the warning, especially on mobile app termination.
- Saves remain disabled until navigation begins. Leaving during a pending request prevents a late redirect; it does not cancel a write already received by the server. Failed saves preserve the draft for retry. Drafts are not stored outside the open form.
- If you try to leave during a save and then choose Stay, a confirmed result appears on the form with **Back to tasks**. Saving is disabled after that confirmation to prevent duplicate creation. A response arriving during a slow departure preserves the destination you chose.
- Deleting an already-removed task reconciles the list. A missing task in an open edit form offers an explicit **Create as new task** action to preserve the draft.

The interface uses a warm paper surface, a serif page heading and locally served Inter for working content. Task rows keep the title, optional description, UTC creation time and visible Edit/Delete labels together. On small screens the action labels become accessible icons. On small screens the date and actions move below the text. Keyboard focus, field errors, pending states and reduced-motion preferences are supported. The font is bundled through Fontsource; no external font service is needed at runtime.

The model keeps the requested field names: `id` (UUID), `titulo` (required string), `descricao` (optional string), and `dataCriacao` (UTC ISO 8601 timestamp). Titles are trimmed and limited to 120 characters; descriptions are trimmed and limited to 2,000. Empty descriptions become absent. Duplicate titles are allowed. Updating replaces editable fields while preserving identity and creation time.

## Quick walkthrough

1. Choose **New task**, enter a title and optional description, then choose **Create task**. The list shows the task and **Task created.**
2. Choose **Edit**, change the fields, then **Save changes**. The list shows the saved values and **Task updated.** Reloading clears the confirmation.
3. While editing, change a field and choose **Back to tasks**. Stay on the page in the browser warning to keep the draft, or leave to discard it.
4. Choose **Delete**. **Cancel** or Escape keeps the task; **Delete task** removes it.

## Structure and decisions

- `src/server/store.ts`: a Map and a small store class.
- `src/server/router.ts`: tRPC procedures, Zod input validation, and readable errors.
- `src/app/api/trpc/[trpc]/route.ts`: the Fetch adapter exposing the router over HTTP.
- `src/app/page.tsx`: request-time server rendering using a direct tRPC caller.
- `src/components/task-list.tsx`: list interactions and deletion.
- `src/components/task-form.tsx`: shared create/edit form with React hooks.
- `src/lib/trpc.ts`: the typed browser client. Only the router type is imported into it.
- `src/server/router.test.ts`: isolated router behavior tests.
- `src/server/http.test.ts`: real Fetch-adapter contract test.
- `e2e/tasks.spec.ts`: Chromium workflow and delayed-navigation regressions; `playwright.config.ts` starts its own production server on port 3150 and refuses to reuse another server.

The server uses a direct tRPC caller to preload tasks, avoiding a redundant HTTP request to itself. The browser uses tRPC over HTTP for mutations. The list is marked `force-dynamic` and the API sends `Cache-Control: no-store`, so mutable tasks are not treated as build-time content.

A process-global store lets the separately bundled page and API handlers use the same memory in one Node process. **Run one process. Data disappears on restart and is neither shared across replicas nor guaranteed in serverless runtimes.** There is no database, file persistence, authentication, or multi-user isolation. This is a local demonstration; exposing it to untrusted users would require access control and deployment-specific safeguards.

The list loads all tasks at once. Infinite scrolling is omitted because the exercise uses a small in-memory list and asks for a simple implementation.

## Versions

Next.js 15.5.29 follows the assignment's explicit v15 requirement. React 19.3.1 and tRPC 11.28.2 are pinned, with all exact dependency versions in the lockfile. TypeScript 5.9.3 is retained for Next.js 15 tooling compatibility. The PostCSS override pins 8.5.33 to address advisories in Next.js 15's transitive version without switching framework major versions.

## Verification

`npm test` runs 5 router tests against independent store instances and 1 HTTP-adapter test in an isolated test process. They cover CRUD, optional descriptions, trimming and length boundaries, UUID uniqueness, missing/invalid IDs, preservation of creation time, non-mutation on rejected input, defensive copies, untyped JSON validation, readable HTTP errors, and the no-store response header.

Manual browser validation covers empty state, title validation, creation with and without a description, editing, clearing a description, list deletion, success feedback, and a stale edit after the task was deleted. HTTP checks verify actual API validation and request-time task content in the returned HTML. The production build and TypeScript check must pass before delivery.

To reproduce stale-edit recovery, open a task in two browser tabs. Delete it from the list in one tab, then save changes from its already-open edit form in the other. The form should explain the missing task and retain the entered values. **Create as new task** creates a replacement only when clicked. A page reload on the missing task shows the not-found page.

Run `npm run format:check` to verify formatting, or `npm run format` to apply the project's formatter.

### Optional browser regression

The app does not need a browser installation to run. To run the packaged Playwright test:

Use a separate extraction or stop a preview running from the same directory: the command rebuilds that directory's `.next` output.

```sh
npx playwright install chromium
npm run test:e2e
```

The command builds the app, starts an isolated production server at http://127.0.0.1:3150, and stops it after the test. Leave that port free. It does not use the interactive preview on port 3147. The test covers create/edit returns, one-time confirmations, full overlong input and validation focus, a canceled unsaved-changes warning, description clearing, and deletion confirmation/cancellation. Playwright manages an isolated browser profile. Generated results are excluded from the source archive.

A second boundary test queues a mock acknowledgement during a delayed reload and verifies that the chosen destination is preserved. It writes no task. Browser Back also checks fresh rows and cleared feedback with the back/forward cache enabled.
