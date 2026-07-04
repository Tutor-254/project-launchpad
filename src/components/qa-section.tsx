import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function QASection({
  courseId,
  lectureId,
  canPost,
}: {
  courseId: string;
  lectureId?: string | null;
  canPost: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [scope, setScope] = useState<"lecture" | "course">(lectureId ? "lecture" : "course");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: questions } = useQuery({
    queryKey: ["questions", courseId, scope === "lecture" ? lectureId : "course"],
    queryFn: async () => {
      let q = supabase
        .from("questions")
        .select("id,title,body,created_at,lecture_id,user_id, profiles!questions_user_profile_fkey(display_name,avatar_url)")
        .eq("course_id", courseId)
        .eq("hidden", false)
        .order("created_at", { ascending: false });
      if (scope === "lecture" && lectureId) q = q.eq("lecture_id", lectureId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const ask = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (!title.trim()) throw new Error("Add a title");
      const { error } = await supabase.from("questions").insert({
        course_id: courseId,
        lecture_id: scope === "lecture" ? lectureId ?? null : null,
        user_id: user.id,
        title: title.trim().slice(0, 200),
        body: body.trim().slice(0, 4000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question posted");
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["questions", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeQ = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions", courseId] }),
  });

  return (
    <div>
      {lectureId && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setScope("lecture")}
            className={`px-3 py-1.5 text-xs rounded-full border ${scope === "lecture" ? "bg-brand text-brand-foreground border-brand" : "border-border"}`}
          >
            This lecture
          </button>
          <button
            onClick={() => setScope("course")}
            className={`px-3 py-1.5 text-xs rounded-full border ${scope === "course" ? "bg-brand text-brand-foreground border-brand" : "border-border"}`}
          >
            All course questions
          </button>
        </div>
      )}

      {canPost && user && (
        <div className="border border-border rounded-2xl p-4 mb-6 bg-card space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ask a question…"
            maxLength={200}
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Provide details (optional)"
            rows={3}
            maxLength={4000}
          />
          <div className="flex justify-end">
            <Button onClick={() => ask.mutate()} disabled={ask.isPending} className="bg-brand text-brand-foreground hover:bg-brand/90">
              Post question
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {questions?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No questions yet.</p>
        )}
        {questions?.map((q: any) => (
          <QuestionThread
            key={q.id}
            question={q}
            open={openId === q.id}
            onToggle={() => setOpenId(openId === q.id ? null : q.id)}
            canDelete={user?.id === q.user_id}
            onDelete={() => removeQ.mutate(q.id)}
            currentUserId={user?.id}
            canAnswer={canPost}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionThread({
  question,
  open,
  onToggle,
  canDelete,
  onDelete,
  currentUserId,
  canAnswer,
}: {
  question: any;
  open: boolean;
  onToggle: () => void;
  canDelete: boolean;
  onDelete: () => void;
  currentUserId?: string;
  canAnswer: boolean;
}) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const { data: answers } = useQuery({
    queryKey: ["answers", question.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("answers")
        .select("id,body,is_instructor_answer,created_at,user_id, profiles!answers_user_profile_fkey(display_name,avatar_url)")
        .eq("question_id", question.id)
        .eq("hidden", false)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const answer = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Sign in required");
      if (!reply.trim()) throw new Error("Empty reply");
      const { error } = await supabase.from("answers").insert({
        question_id: question.id,
        user_id: currentUserId,
        body: reply.trim().slice(0, 4000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["answers", question.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="border border-border rounded-xl bg-card">
      <button onClick={onToggle} className="w-full text-left p-4 flex items-start gap-3 hover:bg-secondary/30 transition-colors">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-brand/10 text-brand text-xs">
            {(question.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{question.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {question.profiles?.display_name ?? "Learner"} · {new Date(question.created_at).toLocaleDateString()}
          </div>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {question.body && (
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{question.body}</p>
          )}
          {canDelete && (
            <button onClick={onDelete} className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
              <Trash2 className="size-3" /> Delete question
            </button>
          )}

          <div className="space-y-3 pl-4 border-l-2 border-border">
            {answers?.length === 0 && <p className="text-xs text-muted-foreground">No answers yet.</p>}
            {answers?.map((a: any) => (
              <div key={a.id} className="flex gap-3">
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback className="bg-brand/10 text-brand text-xs">
                    {(a.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="font-medium">{a.profiles?.display_name ?? "Learner"}</span>
                    {a.is_instructor_answer && (
                      <Badge className="bg-accent-warm text-white text-[10px] px-1.5 py-0">Instructor</Badge>
                    )}
                    <span className="text-muted-foreground">· {new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{a.body}</p>
                </div>
              </div>
            ))}
          </div>

          {canAnswer && currentUserId && (
            <div className="flex gap-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply…"
                rows={2}
                maxLength={4000}
                className="flex-1"
              />
              <Button
                onClick={() => answer.mutate()}
                disabled={answer.isPending}
                className="bg-brand text-brand-foreground hover:bg-brand/90 self-end"
              >
                <MessageCircle className="mr-1 size-4" /> Reply
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
