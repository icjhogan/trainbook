-- Preserve the semantic + full-text RRF search from 007, but add a deterministic branch
-- for the numeric shorthand athletes use when recalling workouts. PostgreSQL tokenizes
-- "450" and "450m" as different lexemes, and natural-language FTS requires every retained
-- term to match. Extracting three-digit distances (plus 2-3 digit m/s shorthand) lets
-- "450", "450m", and plural "450s" match the same workout without letting "450" match
-- "1450", treating clock components as distances, or extracting part of a year such as
-- "2025".

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
      source.*,
      to_tsvector('english', source.search_text) as doc
    from (
      select
        w.id, w.date, w.date_iso, w.workout_type, w.event_focus, w.exercises,
        w.technical_cues, w.personal_notes, w.embedding,
        concat_ws(' ',
          w.date,
          w.date_iso::text,
          w.workout_type,
          array_to_string(w.event_focus, ' '),
          w.exercises::text,
          array_to_string(w.technical_cues, ' '),
          w.personal_notes,
          w.raw_text
        ) as search_text
      from workouts w
      where w.user_id = p_user_id
    ) source
  ),
  numeric_terms as (
    select distinct match[2] as term
    from regexp_matches(
      coalesce(p_query_text, ''),
      '(^|[^0-9])([0-9]{3})\M',
      'gi'
    ) as match
    union
    select distinct match[2] as term
    from regexp_matches(
      coalesce(p_query_text, ''),
      '(^|[^0-9])([0-9]{2,3})[[:space:]]*(?:m|s)\M',
      'gi'
    ) as match
  ),
  vec as (
    select id, row_number() over (order by embedding <=> p_query_embedding) as rank
    from searchable
    where p_query_embedding is not null and embedding is not null
    order by embedding <=> p_query_embedding
    limit p_match_count * 2
  ),
  fts as (
    select
      id,
      row_number() over (
        order by ts_rank_cd(doc, websearch_to_tsquery('english', p_query_text)) desc
      ) as rank
    from searchable
    where p_query_text is not null
      and p_query_text <> ''
      and doc @@ websearch_to_tsquery('english', p_query_text)
    order by ts_rank_cd(doc, websearch_to_tsquery('english', p_query_text)) desc
    limit p_match_count * 2
  ),
  exact_numeric as (
    select
      s.id,
      row_number() over (
        order by count(distinct n.term) desc, s.date_iso desc nulls last, s.id
      ) as rank
    from searchable s
    join numeric_terms n
      on lower(s.search_text) ~ (
        '(^|[^0-9])' || n.term ||
        '[[:space:]]*(?:met(?:er|re)s?|m|s)?([^[:alnum:]]|$)'
      )
    group by s.id, s.date_iso
    order by count(distinct n.term) desc, s.date_iso desc nulls last, s.id
    limit p_match_count * 2
  )
  select
    s.id, s.date, s.date_iso, s.workout_type, s.event_focus, s.exercises,
    s.technical_cues, s.personal_notes,
    coalesce(1.0 / (p_rrf_k + vec.rank), 0.0) +
      coalesce(1.0 / (p_rrf_k + fts.rank), 0.0) +
      coalesce(2.0 / (p_rrf_k + exact_numeric.rank), 0.0) as score
  from searchable s
  left join vec on vec.id = s.id
  left join fts on fts.id = s.id
  left join exact_numeric on exact_numeric.id = s.id
  where vec.id is not null or fts.id is not null or exact_numeric.id is not null
  order by score desc
  limit p_match_count;
$$;
