# Frontend-only project rules (UI-first)

## Scope
- This repo is **frontend only** for now. Do not add backend code, API clients, auth flows, database layers, or server infrastructure unless explicitly requested.
- Build **UI and component architecture first**; functionality and data wiring will be added later.

## Component-first development
- Prefer small, composable React components in `src/components/`.
- Avoid duplicated UI code: if a pattern appears twice, extract a component.
- Keep components presentational by default; avoid premature business logic.

## Structure conventions
- `src/components/` reusable UI components
- `src/pages/` route/page-level composition (if/when routing is added)
- `src/styles/` global styles and tokens (if needed)

## Guardrails
- No copy/paste styling across pages; use shared components and tokens.
- Keep changes focused on UI unless asked otherwise.

