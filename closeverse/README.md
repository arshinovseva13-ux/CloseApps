# CLOSEVERSE

CLOSEVERSE is a modular personal workspace for tasks, projects, notes, knowledge, calendar events, personal finance, and focus sessions.

## Run

Open through a static web server. ES modules and Service Worker do not work correctly from a file:// URL. On GitHub Pages, the app lives at /CloseApps/closeverse/.

## Preview 0.1 features

- Dashboard with task summary and recent notes.
- Task manager with completion, filtering, priorities, deadlines, project assignment and search.
- Projects with descriptions, colors and task progress.
- Notes with tags, search and editing.
- Knowledge library with links and tags.
- Two-week calendar combining events and dated tasks.
- Personal income and expense tracking with category summaries.
- Focus timer with 25/5/15-minute modes, pause and reset.
- Universal search (Ctrl/Cmd + K).
- Light/dark theme, responsive navigation, quick-create actions.
- JSON backup/restore and local browser storage; service-worker shell cache.

## Architecture

- index.html: app shell.
- assets/css: design tokens, layout, reusable components.
- assets/js/storage.js: state schema, localStorage and import/export.
- Separate modules for tasks, projects, notes, finance, calendar, knowledge, focus, search, settings and routing.
- sw.js and manifest.json: installability and app-shell caching.

## Limitations

This is a local-first web prototype, not a completed SaaS. Accounts, cloud sync, shared workspaces, server database, AI features and external notifications are not implemented. Browser localStorage is not encrypted; do not store secrets. Export backups regularly. The focus timer runs while the page remains open.

## Next phases

1. Add automated tests and accessibility checks.
2. Add IndexedDB, schema migrations and optional local encryption.
3. Add a backend and authentication only if cloud sync is required.
4. Add CI, documentation and safe versioned releases.

CLOSEVERSE Preview 0.1.