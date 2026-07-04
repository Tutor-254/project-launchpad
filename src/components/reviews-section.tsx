import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function ReviewsSection({ courseId, canReview }: { courseId: string; canReview: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: reviews } = useQuery({
    queryKey: ["reviews", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id,rating,comment,created_at,user_id, profiles!reviews_user_profile_fkey(display_name,avatar_url)")
        .eq("course_id", courseId)
        .eq("hidden", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: myReview } = useQuery({
    queryKey: ["my-review", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id,rating,comment")
        .eq("course_id", courseId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment ?? "");
    }
  }, [myReview]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("reviews").upsert(
        { course_id: courseId, user_id: user.id, rating, comment: comment.trim() || null },
        { onConflict: "user_id,course_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(myReview ? "Review updated" : "Review posted");
      qc.invalidateQueries({ queryKey: ["reviews", courseId] });
      qc.invalidateQueries({ queryKey: ["my-review", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!myReview) return;
      const { error } = await supabase.from("reviews").delete().eq("id", myReview.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review removed");
      setComment("");
      setRating(5);
      qc.invalidateQueries({ queryKey: ["reviews", courseId] });
      qc.invalidateQueries({ queryKey: ["my-review", courseId] });
    },
  });

  const avg = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({
    n,
    count: reviews?.filter((r) => r.rating === n).length ?? 0,
  }));
  const total = reviews?.length ?? 0;

  return (
    <section>
      <h2 className="font-serif text-2xl mb-4">Reviews</h2>

      <div className="grid md:grid-cols-[220px_1fr] gap-8 mb-8 p-6 border border-border rounded-2xl bg-card">
        <div className="text-center border-r border-border pr-6">
          <div className="font-serif text-5xl text-brand">{avg.toFixed(1)}</div>
          <Stars value={Math.round(avg)} className="justify-center my-2" />
          <div className="text-xs text-muted-foreground">{total} review{total !== 1 && "s"}</div>
        </div>
        <div className="space-y-1.5">
          {dist.map((d) => (
            <div key={d.n} className="flex items-center gap-3 text-xs">
              <span className="w-3 text-muted-foreground">{d.n}</span>
              <Star className="size-3 text-accent-warm fill-accent-warm" />
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent-warm" style={{ width: total ? `${(d.count / total) * 100}%` : 0 }} />
              </div>
              <span className="w-8 text-right text-muted-foreground">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {canReview && user && (
        <div className="border border-border rounded-2xl p-5 mb-8 bg-card">
          <div className="font-serif text-lg mb-3">{myReview ? "Update your review" : "Write a review"}</div>
          <StarPicker value={rating} onChange={setRating} />
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 1000))}
            placeholder="Share what you learned…"
            rows={4}
            className="mt-3"
          />
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {myReview ? "Update review" : "Post review"}
            </Button>
            {myReview && (
              <Button variant="ghost" onClick={() => remove.mutate()} disabled={remove.isPending}>
                <Trash2 className="mr-1 size-4" /> Delete
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {reviews?.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
        {reviews?.map((r: any) => (
          <div key={r.id} className="flex gap-4 pb-6 border-b border-border last:border-0">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-brand/10 text-brand text-sm">
                {(r.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="font-medium text-sm">{r.profiles?.display_name ?? "Learner"}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <Stars value={r.rating} className="mb-2" />
              {r.comment && <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{r.comment}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`size-3.5 ${n <= value ? "text-accent-warm fill-accent-warm" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star className={`size-6 ${n <= (hover || value) ? "text-accent-warm fill-accent-warm" : "text-muted-foreground/40"}`} />
        </button>
      ))}
    </div>
  );
}
