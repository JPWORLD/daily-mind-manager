-- Migration: enterprise_init (2026-01-22)
-- Target: PostgreSQL

BEGIN;

-- Enum
DO $$ BEGIN
  CREATE TYPE "PostStatus" AS ENUM ('DRAFT','PUBLISHED','SCHEDULED','ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Authors
CREATE TABLE IF NOT EXISTS "Author" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password" text,
  "role" text NOT NULL DEFAULT 'editor',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Tags
CREATE TABLE IF NOT EXISTS "Tag" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL UNIQUE
);

-- Categories
CREATE TABLE IF NOT EXISTS "Category" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL UNIQUE
);

-- Posts
CREATE TABLE IF NOT EXISTS "Post" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "summary" text,
  "content" text NOT NULL,
  "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
  "image" text,
  "views" integer NOT NULL DEFAULT 0,
  "authorId" integer REFERENCES "Author"("id") ON DELETE SET NULL,
  "scheduledFor" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- PostVersions
CREATE TABLE IF NOT EXISTS "PostVersion" (
  "id" serial PRIMARY KEY,
  "postId" integer NOT NULL REFERENCES "Post"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "title" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- Post <-> Tag join
CREATE TABLE IF NOT EXISTS "_PostToTag" (
  "A" integer NOT NULL REFERENCES "Post"("id") ON DELETE CASCADE,
  "B" integer NOT NULL REFERENCES "Tag"("id") ON DELETE CASCADE,
  PRIMARY KEY ("A", "B")
);

-- Post <-> Category join
CREATE TABLE IF NOT EXISTS "_PostToCategory" (
  "A" integer NOT NULL REFERENCES "Post"("id") ON DELETE CASCADE,
  "B" integer NOT NULL REFERENCES "Category"("id") ON DELETE CASCADE,
  PRIMARY KEY ("A", "B")
);

CREATE INDEX IF NOT EXISTS "Post_createdAt_idx" ON "Post" ("createdAt");
CREATE INDEX IF NOT EXISTS "Post_status_idx" ON "Post" ("status");

COMMIT;
