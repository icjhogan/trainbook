-- Composite index for the hot access pattern.
--
-- feed/page.tsx and app/api/chat/route.ts both filter workouts by user_id and order by
-- date_iso desc. The single-column indexes from 001 (user_id, date_iso) can't serve that
-- filter+sort as efficiently as a composite. Additive and idempotent (IF NOT EXISTS) so it
-- is safe to apply on any environment, including ones already carrying the 001 indexes.

create index if not exists workouts_user_id_date_iso_idx
  on workouts (user_id, date_iso desc);
