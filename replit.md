# Vipti Voice Assistant

Vipti is a warm Hindi/Hinglish AI conversation companion with browser microphone input, server-side AI chat, and optional voice playback.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port supplied by the workflow, usually 8080)
- `pnpm --filter @workspace/vipti run dev` — run the Vite web client (port supplied by the workflow, usually 26250)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required server secret: `OPENAI_API_KEY` — enables real Vipti chat and server-generated Suno audio; keep it server-side
- Runtime-managed: `DATABASE_URL` — the Replit PostgreSQL connection string
- Existing `SESSION_SECRET` is preserved for the project environment

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/vipti/src/App.tsx` — chat UI, browser speech recognition, conversation context, approved local memory, and voice playback
- `artifacts/api-server/src/routes/vipti.ts` — server-side AI chat and speech proxy; the OpenAI key never enters the browser bundle
- `lib/api-spec/openapi.yaml` — source of truth for the chat and speech contracts
- `lib/api-zod` and `lib/api-client-react` — generated request/response types and React Query hooks
- `lib/db/src/schema` — Drizzle schema source (currently empty; the companion's approved memory is local-only)

## Architecture decisions

- Browser voice input uses `SpeechRecognition` / `webkitSpeechRecognition` with `hi-IN`; unsupported browsers receive a clear typed-input fallback.
- The current conversation is sent as bounded context with each chat request; it is not persisted as a transcript.
- Memory is intentionally opt-in: only phrases beginning with “remember that…” or “yaad rakhna…” are stored in browser local storage and can be cleared in Settings.
- Server-generated OpenAI speech is preferred; the Suno button falls back to the browser's Hindi/English speech synthesis when the server provider is unavailable.

## Product

- Type or speak Hindi/Hinglish messages and receive context-aware Vipti replies.
- Use “सुनो” on any Vipti reply for audio playback.
- Review and clear user-approved memories from Settings.

## User preferences

- Keep the existing pnpm workspace and API connection; do not expose `OPENAI_API_KEY` in frontend code.

## Gotchas

- Microphone input requires browser support and microphone permission; HTTPS or localhost is typically required by browsers.
- Add `OPENAI_API_KEY` through Replit Secrets before testing live AI chat or server-side TTS.
- Run `pnpm run typecheck` from the workspace root so project-reference libraries are built before artifact checks.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
