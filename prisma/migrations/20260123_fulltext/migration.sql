-- Add a full-text index for posts content+title to speed up search
-- This migration is Postgres-specific.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a GIN index on the expression combining title and content
CREATE INDEX IF NOT EXISTS posts_fulltext_idx
ON "Post"
USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')));

-- Optional trigram index to accelerate ILIKE / similarity queries on title
CREATE INDEX IF NOT EXISTS posts_title_trgm_idx
ON "Post"
USING GIN (title gin_trgm_ops);
