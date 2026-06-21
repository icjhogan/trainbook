-- Harden UPDATE RLS policies with WITH CHECK.
--
-- The original UPDATE policies on `workouts` (001) and `chats` (003) only had a
-- USING clause. USING controls which existing rows a user may target; WITH CHECK
-- validates the row's NEW values. Without WITH CHECK, a user could issue
--   update workouts set user_id = '<other-user>' where id = '<own-id>'
-- and transfer their own row into another tenant's RLS scope. Adding WITH CHECK
-- forbids the post-update row from leaving the user's own scope.

drop policy if exists "Users can update own workouts" on workouts;
create policy "Users can update own workouts"
  on workouts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own chats" on chats;
create policy "Users can update own chats"
  on chats for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
