# CLAUDE.md

We're building the app described in @SPEC.MD. Read that file for general architectural tasks or to double-check the exact database structure, tech stack or application architecture.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A note-taking web app with rich text editing (TipTap), user authentication (better-auth), and public note sharing. Built with Next.js App Router, Bun runtime, TypeScript, TailwindCSS, and SQLite.

## Commands

```bash
# Development server
bun run dev

# Production build
bun run build

# Start production server
bun run start

# Lint
bun run lint
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `BETTER_AUTH_SECRET` - Auth secret (32+ chars)
- `DB_PATH` - SQLite database path (default: `data/app.db`)

## Architecture

### Application Layers
- **Presentation**: Next.js pages/components in `app/`, TailwindCSS styling
- **API**: REST endpoints at `app/api/` (Route Handlers)
- **Data Access**: SQLite via Bun's SQLite client, helpers in `lib/db.ts`
- **Auth**: better-auth integration with session management

### Key Routes (per SPEC.MD)
- `/` - Landing page
- `/dashboard` - Authenticated notes list
- `/notes/[id]` - Note editor (TipTap)
- `/p/[slug]` - Public read-only note view
- `/api/notes` - Notes CRUD endpoints
- `/api/notes/:id/share` - Toggle public sharing

### Database Schema
SQLite tables: `user`, `session`, `account`, `verification` (better-auth), and `notes` (app data). See SPEC.MD section 5 for full schema.

### TipTap Editor
Uses StarterKit with headings (H1-H3), bold, italic, bullet lists, inline code, code blocks, and horizontal rules. Content stored as JSON in `notes.content_json`.
