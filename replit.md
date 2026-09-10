# Alarm Manager

## Overview

A full-stack alarm management web application (Italian UI). Users can create, edit, clone, and manage alarms with rich configuration options including alarm types (once, specific dates, weekly), ringtones, volume control, vibration, auto-snooze, and auto-delete. Includes backup/restore functionality.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

- `artifacts/alarm-app/` — React frontend (alarm list, editor, activation screen, settings)
- `artifacts/api-server/` — Express API server with alarm CRUD, backup/restore, settings endpoints
- `lib/db/` — Database schema (alarms, backups, settings tables)
- `lib/api-spec/` — OpenAPI specification
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod validation schemas

## Key Features

- Alarm CRUD with all properties (name, time, type, ringtone, volume, vibration, snooze, auto-delete)
- Three alarm types: once, specific dates (multi-date calendar), weekly (day selector with select-all)
- Visual clock face picker + manual time input
- Alarm activation screen with mute, dismiss, snooze (configurable duration), clone
- Auto-snooze with max snooze count (including unlimited option)
- Gradual volume increase
- Backup/restore system with retention policy
- Skip next occurrence
- Clone alarm functionality

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Tables

- `alarms` — stores alarm configuration (name, time, type, dates, days, ringtone, volume, vibration, snooze settings)
- `backups` — stores alarm data backups with timestamps
- `settings` — app-level settings (auto-backup config, retention days)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
