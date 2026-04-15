create table chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index chats_user_id_idx on chats(user_id);
create index chats_updated_at_idx on chats(updated_at desc);
create index chat_messages_chat_id_idx on chat_messages(chat_id);

alter table chats enable row level security;
alter table chat_messages enable row level security;

create policy "Users can read own chats"
  on chats for select using (auth.uid() = user_id);
create policy "Users can insert own chats"
  on chats for insert with check (auth.uid() = user_id);
create policy "Users can update own chats"
  on chats for update using (auth.uid() = user_id);
create policy "Users can delete own chats"
  on chats for delete using (auth.uid() = user_id);

create policy "Users can read own chat messages"
  on chat_messages for select
  using (exists (select 1 from chats where chats.id = chat_messages.chat_id and chats.user_id = auth.uid()));
create policy "Users can insert own chat messages"
  on chat_messages for insert
  with check (exists (select 1 from chats where chats.id = chat_messages.chat_id and chats.user_id = auth.uid()));
