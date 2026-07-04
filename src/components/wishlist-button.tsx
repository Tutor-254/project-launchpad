import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

export function WishlistButton({ courseId, variant = "outline" }: { courseId: string; variant?: "outline" | "ghost" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: saved } = useQuery({
    queryKey: ["wishlisted", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("course_id")
        .eq("course_id", courseId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate({ to: "/auth", search: { redirect: window.location.pathname } });
        throw new Error("Sign in required");
      }
      if (saved) {
        const { error } = await supabase.from("wishlists").delete().eq("course_id", courseId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wishlists").insert({ course_id: courseId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(saved ? "Removed from wishlist" : "Saved to wishlist");
      qc.invalidateQueries({ queryKey: ["wishlisted", courseId] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onError: (e: Error) => {
      if (e.message !== "Sign in required") toast.error(e.message);
    },
  });

  return (
    <Button
      type="button"
      variant={variant}
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      className="gap-2"
      aria-pressed={!!saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
    >
      <Heart className={`size-4 ${saved ? "fill-current text-brand" : ""}`} />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
