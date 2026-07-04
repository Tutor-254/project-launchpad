
REVOKE EXECUTE ON FUNCTION public.tg_mark_instructor_answer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_new_answer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_new_question() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_new_review() FROM PUBLIC, anon, authenticated;
