import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Notification = {
  id: string;
  type: string;
  payload: any;
  read_at: string | null;
  created_at: string;
};

export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifs } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,type,payload,read_at,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Notification[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("notifications").update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id).is("read_at", null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const unread = notifs?.filter((n) => !n.read_at).length ?? 0;

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors outline-none" aria-label="Notifications">
          <Bell className="size-5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-accent-warm text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0 max-h-[70vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="font-serif text-lg">Notifications</div>
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs text-brand hover:underline inline-flex items-center gap-1"
            >
              <Check className="size-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {notifs?.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">You're all caught up.</div>
          )}
          {notifs?.map((n) => (
            <NotificationItem key={n.id} n={n} />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationItem({ n }: { n: Notification }) {
  const { text, to, params } = renderNotification(n);
  const inner = (
    <div className={`p-3 border-b border-border last:border-0 hover:bg-secondary/40 transition-colors ${!n.read_at ? "bg-brand/5" : ""}`}>
      <div className="text-sm">{text}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
    </div>
  );
  return to ? (
    <Link to={to as any} params={params as any}>{inner}</Link>
  ) : (
    <div>{inner}</div>
  );
}

function renderNotification(n: Notification): { text: string; to?: string; params?: any } {
  const p = n.payload ?? {};
  switch (n.type) {
    case "answer.new":
      return {
        text: `${p.is_instructor_answer ? "Instructor" : "Someone"} answered your question "${p.question_title ?? ""}"`,
        to: "/learn/$courseId",
        params: { courseId: p.course_id },
      };
    case "question.new":
      return {
        text: `New question on your course: "${p.title ?? ""}"`,
        to: "/instructor/$courseId",
        params: { courseId: p.course_id },
      };
    case "review.new":
      return {
        text: `${p.rating}★ review on ${p.course_title ?? "your course"}`,
        to: "/instructor/$courseId",
        params: { courseId: p.course_id },
      };
    default:
      return { text: n.type };
  }
}
