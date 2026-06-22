-- Track when each workout's embedding was last computed, so the backfill can detect
-- stale/missing embeddings (embedding is null OR updated_at > embedded_at) and re-embed
-- only what changed. See U2 / KTD9 in the read-only agentic assistant plan.
alter table workouts add column if not exists embedded_at timestamptz;
