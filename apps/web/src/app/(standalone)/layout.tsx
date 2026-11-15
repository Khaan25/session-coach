// /cli/approve asks one question, so it sits in the auth card, not the dashboard shell. /cli stays signed-in only
// through PROTECTED in lib/supabase/proxy.ts, which goes by path.
export { default } from "@/app/(auth)/layout";
