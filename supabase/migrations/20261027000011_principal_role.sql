-- Multi-branch S1a: the PRINCIPAL role (college-wide, read-only on student data).
-- ALTER TYPE ... ADD VALUE must be committed before any function or policy can use the new value,
-- so it lives in its own migration.
alter type public.user_role add value if not exists 'PRINCIPAL';
