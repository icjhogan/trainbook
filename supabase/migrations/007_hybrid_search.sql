-- Hybrid retrieval over the training log: fuses pgvector cosine similarity with Postgres
-- full-text search via Reciprocal Rank Fusion (RRF). See U4 / KTD3.
--
-- SECURITY INVOKER (the Postgres default, stated explicitly) so the function runs as the
-- calling user and RLS (auth.uid() = user_id) applies. The explicit p_user_id parameter is
-- belt-and-suspenders scoping AND lets a future non-session caller (e.g. MCP) pass the id.
--
-- p_query_embedding is nullable: when null (e.g. the embedding API was unavailable), the
-- vector CTE contributes nothing and the function degrades to keyword-only search — the
-- query-path resilience the plan calls for, handled in SQL so the tool can't half-fail.
--
-- No vector index in v1: at < ~10k rows a sequential scan is fast and 100%-recall. Add HNSW
-- (m=16, ef_construction=200) when the corpus grows.

create or replace function hybrid_search(
  p_user_id uuid,
  p_query_text text,
  p_query_embedding vector(1024) default null,
  p_match_count int default 10,
  p_rrf_k int default 50
)
returns table (
  id uuid,
  date text,
  date_iso date,
  workout_type text,
  event_focus text[],
  exercises jsonb,
  technical_cues text[],
  personal_notes text,
  score double precision
)
language sql
security invoker
set search_path = public
as $$
  with searchable as (
    select
      w.id, w.date, w.date_iso, w.workout_type, w.event_focus, w.exercises,
      w.technical_cues, w.personal_notes, w.embedding,
      to_tsvector('english',
        coalesce(w.workout_type, '') || ' ' ||
        coalesce(array_to_string(w.event_focus, ' '), '') || ' ' ||
        coalesce(w.exercises::text, '') || ' ' ||
        coalesce(array_to_string(w.technical_cues, ' '), '') || ' ' ||
        coalesce(w.personal_notes, '') || ' ' ||
        coalesce(w.raw_text, '')
      ) as doc
    from workouts w
    where w.user_id = p_user_id
  ),
  vec as (
    select id, row_number() over (order by embedding <=> p_query_embedding) as rank
    from searchable
    where p_query_embedding is not null and embedding is not null
    order by embedding <=> p_query_embedding
    limit p_match_count * 2
  ),
  fts as (
    select id, row_number() over (order by ts_rank(doc, plainto_tsquery('english', p_query_text)) desc) as rank
    from searchable
    where p_query_text is not null and doc @@ plainto_tsquery('english', p_query_text)
    limit p_match_count * 2
  )
  select
    s.id, s.date, s.date_iso, s.workout_type, s.event_focus, s.exercises,
    s.technical_cues, s.personal_notes,
    coalesce(1.0 / (p_rrf_k + vec.rank), 0.0) + coalesce(1.0 / (p_rrf_k + fts.rank), 0.0) as score
  from searchable s
  left join vec on vec.id = s.id
  left join fts on fts.id = s.id
  where vec.id is not null or fts.id is not null
  order by score desc
  limit p_match_count;
$$;
