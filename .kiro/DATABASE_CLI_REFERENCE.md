# Supabase CLI Reference Guide

**Quick reference for database operations via CLI**

---

## Installation

```bash
# Install Supabase CLI globally
npm install -g supabase

# Or use via npx (no installation needed)
npx supabase@latest <command>
```

---

## Essential Commands

### 1. Check Migration Status

```bash
# List all applied migrations for your project
supabase migration list --project-ref nhvvgoilwseiagzbbhmx

# Output shows: Migration ID | Remote Status | Local Status | Timestamp
```

### 2. Generate TypeScript Types

```bash
# Generate types from live database
supabase gen types typescript --project-id nhvvgoilwseiagzbbhmx > src/integrations/supabase/types.ts

# Regenerate after database schema changes
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### 3. Push Local Migrations

```bash
# If you have local migrations in supabase/migrations/
supabase db push --project-ref nhvvgoilwseiagzbbhmx
```

### 4. Create New Migration

```bash
# Generate a new migration file (when working locally with docker)
supabase migration new <migration_name>

# Example:
supabase migration new add_user_preferences
```

### 5. Link Project

```bash
# Link your Supabase project (store credentials locally)
supabase link --project-ref nhvvgoilwseiagzbbhmx

# Verify link
supabase projects list
```

---

## Your Project Credentials

```
Project ID (ref): nhvvgoilwseiagzbbhmx
Project URL: https://nhvvgoilwseiagzbbhmx.supabase.co
Database: PostgreSQL 14.5
```

---

## Common Workflows

### Workflow 1: After Database Schema Changes

```bash
# 1. Regenerate types to get latest schema
supabase gen types typescript --project-id nhvvgoilwseiagzbbhmx > src/integrations/supabase/types.ts

# 2. Check for TypeScript errors
npm run build

# 3. If errors, update code to match new types
npm run lint --fix

# 4. Test your changes
npm run test
```

### Workflow 2: Verify Database is Up-to-Date

```bash
# 1. Check migration status
supabase migration list --project-ref nhvvgoilwseiagzbbhmx

# 2. Verify types are fresh
# (look at timestamp on src/integrations/supabase/types.ts)
ls -la src/integrations/supabase/types.ts

# 3. If types are old, regenerate
supabase gen types typescript --project-id nhvvgoilwseiagzbbhmx > src/integrations/supabase/types.ts

# 4. Rebuild
npm run build
```

### Workflow 3: Sync With Team

```bash
# If teammates have made database schema changes:

# 1. Pull their code
git pull origin main

# 2. Regenerate types from live database
supabase gen types typescript --project-id nhvvgoilwseiagzbbhmx > src/integrations/supabase/types.ts

# 3. Rebuild and test
npm run build
npm run test
```

---

## Debugging

### Check PostgreSQL Version

```bash
supabase projects info --project-ref nhvvgoilwseiagzbbhmx
```

### View Migration History in Detail

```bash
supabase migration list --project-ref nhvvgoilwseiagzbbhmx
```

### Check for Type Generation Errors

```bash
# If types fail to generate, check:
supabase gen types typescript --project-id nhvvgoilwseiagzbbhmx 2>&1

# Common issues:
# - Project ID incorrect
# - Project not found or access denied
# - Database schema has unsupported types
```

---

## Environment Setup

These are already in your `.env` file:

```env
SUPABASE_PROJECT_ID="nhvvgoilwseiagzbbhmx"
SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_URL="https://nhvvgoilwseiagzbbhmx.supabase.co"
VITE_SUPABASE_PROJECT_ID="nhvvgoilwseiagzbbhmx"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://nhvvgoilwseiagzbbhmx.supabase.co"
```

---

## Quick Reference: Command Syntax

```bash
# All commands follow this pattern:
supabase <category> <action> [options]

# Categories:
# - migration: Work with database migrations
# - db: Database operations
# - projects: Project management
# - gen: Code generation (types, etc.)
# - link: Link to project
# - branch: Work with branches
# - function: Edge function management
```

---

## Current Status

- **Last types generated:** September 29, 2026
- **Latest migration applied:** 2026-10-01
- **Build status:** ✅ Passing
- **TypeScript status:** ✅ No errors

---

## Next Time You Need To...

### Add a new table to the database
1. Use Supabase Dashboard or create migration
2. Run: `supabase gen types typescript --project-id nhvvgoilwseiagzbbhmx > src/integrations/supabase/types.ts`
3. Use new types in your code
4. Run: `npm run build`

### Check if database changed
1. Run: `supabase migration list --project-ref nhvvgoilwseiagzbbhmx`
2. Compare timestamp with `src/integrations/supabase/types.ts`
3. If newer migrations exist, regenerate types

### Share database schema with team
1. Push your migrations: `supabase db push --project-ref nhvvgoilwseiagzbbhmx`
2. Team regenerates types: `supabase gen types typescript --project-id nhvvgoilwseiagzbbhmx > src/integrations/supabase/types.ts`
3. Commit both migration files and types

---

## Need Help?

```bash
# See all available commands
supabase help

# See help for specific command
supabase migration help
supabase db help
supabase gen help

# Enable debug logging
supabase <command> --debug
```

---

## Useful Resources

- **Supabase CLI Docs:** https://supabase.com/docs/reference/cli/introduction
- **PostgreSQL Docs:** https://www.postgresql.org/docs/14/
- **Your Project Dashboard:** https://app.supabase.com/project/nhvvgoilwseiagzbbhmx

---

**Last Updated:** September 29, 2026
