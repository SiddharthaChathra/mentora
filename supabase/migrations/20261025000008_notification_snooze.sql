-- UX2-10: snooze a notification for a day. Hidden from the list and unread count until it wakes.
alter table public.notifications add column snoozed_until timestamptz;

-- Users may only touch their own rows (existing RLS policy); column grant keeps every other field read-only.
grant update (snoozed_until) on public.notifications to authenticated;
