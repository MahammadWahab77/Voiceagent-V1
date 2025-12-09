-- Function to increment analytics atomically
-- Run this in your Supabase SQL Editor

create or replace function increment_analytics(p_student_id uuid, p_duration int)
returns void as $$
begin
  insert into student_analytics (student_id, total_sessions, total_duration, last_active)
  values (p_student_id, 1, p_duration, now())
  on conflict (student_id) do update
  set total_sessions = student_analytics.total_sessions + 1,
      total_duration = student_analytics.total_duration + p_duration,
      last_active = now();
end;
$$ language plpgsql;
