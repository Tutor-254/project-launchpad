import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration } from "@/lib/format";
import { ArrowLeft, Award, Check, PlayCircle } from "lucide-react";
import { QASection } from "@/components/qa-section";
import { ReviewsSection } from "@/components/reviews-section";
import { issueCertificateIfComplete } from "@/lib/certificates.functions";
import { requireAuth } from "@/lib/auth-guards";
import { AssessmentPanel } from "@/components/assessment/assessment-panel";

export const Route = createFileRoute("/learn/$courseId")({
  beforeLoad: async () => {
    await requireAuth("/learn");
  },
  component: LearnPlayer,
});

function LearnPlayer() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeLectureId, setActiveLectureId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: course } = useQuery({
    queryKey: ["learn-course", courseId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title, course_sections(id,title,position, lectures(id,title,position,duration_seconds,video_path))")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["lecture-progress", courseId, user?.id],
    enabled: !!user && !!course,
    queryFn: async () => {
      const lectureIds: string[] = (course!.course_sections ?? []).flatMap((s: any) => (s.lectures ?? []).map((l: any) => l.id));
      if (!lectureIds.length) return [];
      const { data } = await supabase
        .from("lecture_progress")
        .select("lecture_id, completed, last_position_seconds")
        .eq("user_id", user!.id)
        .in("lecture_id", lectureIds);
      return data ?? [];
    },
  });

  const completedSet = useMemo(() => new Set((progress ?? []).filter((p: any) => p.completed).map((p: any) => p.lecture_id)), [progress]);
  const positionMap = useMemo(() => {
    const m = new Map<string, number>();
    (progress ?? []).forEach((p: any) => m.set(p.lecture_id, p.last_position_seconds ?? 0));
    return m;
  }, [progress]);

  const allLectures = useMemo(() => {
    if (!course) return [] as any[];
    return (course.course_sections ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .flatMap((s: any) => (s.lectures ?? []).sort((a: any, b: any) => a.position - b.position));
  }, [course]);

  useEffect(() => {
    if (!activeLectureId && allLectures.length) {
      const firstIncomplete = allLectures.find((l) => !completedSet.has(l.id)) ?? allLectures[0];
      setActiveLectureId(firstIncomplete.id);
    }
  }, [allLectures, activeLectureId, completedSet]);

  const activeLecture = allLectures.find((l) => l.id === activeLectureId);

  useEffect(() => {
    setVideoUrl(null);
    if (!activeLecture?.video_path) return;
    let cancelled = false;
    supabase.storage
      .from("course-videos")
      .createSignedUrl(activeLecture.video_path, 7200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          console.error("[video signed URL]", error?.message ?? "no URL returned", "path:", activeLecture.video_path);
          // Signal to the player that the path exists but signing failed
          setVideoUrl("ERROR");
          return;
        }
        setVideoUrl(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [activeLecture?.video_path]);

  // Restore playback position on load
  useEffect(() => {
    if (!videoUrl || videoUrl === "ERROR" || !videoRef.current || !activeLectureId) return;
    const start = positionMap.get(activeLectureId) ?? 0;
    if (start > 3) {
      try { videoRef.current.currentTime = start; } catch { /* ignore */ }
    }
  }, [videoUrl, activeLectureId, positionMap]);

  // Persist position every 10s while playing
  useEffect(() => {
    if (!user || !activeLectureId || !videoUrl || videoUrl === "ERROR") return;
    const el = videoRef.current;
    if (!el) return;
    let last = 0;
    const onTime = () => {
      const t = Math.floor(el.currentTime);
      if (t - last < 10) return;
      last = t;
      supabase.from("lecture_progress").upsert(
        { user_id: user.id, lecture_id: activeLectureId, last_position_seconds: t, completed: false },
        { onConflict: "user_id,lecture_id", ignoreDuplicates: false },
      ).then(() => {});
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [user, activeLectureId, videoUrl]);

  const markComplete = useMutation({
    mutationFn: async (lectureId: string) => {
      if (!user) return;
      await supabase.from("lecture_progress").upsert(
        { user_id: user.id, lecture_id: lectureId, completed: true },
        { onConflict: 'user_id,lecture_id' }
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lecture-progress", courseId] }),
  });

  const issueCert = useServerFn(issueCertificateIfComplete);
  const [certCode, setCertCode] = useState<string | null>(null);

  function handleEnded() {
    if (activeLecture) markComplete.mutate(activeLecture.id);
    const idx = allLectures.findIndex((l) => l.id === activeLectureId);
    if (idx >= 0 && idx < allLectures.length - 1) setActiveLectureId(allLectures[idx + 1].id);
  }

  const total = allLectures.length;
  const completed = completedSet.size;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  // Auto-issue certificate on 100%
  useEffect(() => {
    if (total > 0 && completed === total && !certCode) {
      issueCert({ data: { courseId } })
        .then((r) => {
          setCertCode(r.code);
          if (r.issued) toast.success("Certificate earned! View it in Certificates.");
        })
        .catch(() => { /* ignore — not fully complete or error */ });
    }
  }, [total, completed, courseId, certCode, issueCert]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/learn" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand">
            <ArrowLeft className="size-4" /> My learning
          </Link>
          <div className="flex items-center gap-3 flex-1 justify-end max-w-md">
            {certCode && (
              <Link to="/verify/$code" params={{ code: certCode }} className="text-xs text-brand hover:underline inline-flex items-center gap-1">
                <Award className="size-3.5" /> Certificate
              </Link>
            )}
            <span className="text-xs text-muted-foreground">{completed}/{total} lectures</span>
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 grid lg:grid-cols-[1fr_360px]">
        <div className="bg-black flex flex-col">
          {activeLecture ? (
            videoUrl === "ERROR" ? (
              <div className="w-full aspect-video flex flex-col items-center justify-center text-white/60 gap-2">
                <PlayCircle className="size-10 opacity-40" />
                <span className="text-sm">Video unavailable — the instructor may need to re-upload this lecture.</span>
              </div>
            ) : videoUrl ? (
              <video
                key={activeLecture.id}
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay
                onEnded={handleEnded}
                className="w-full aspect-video bg-black"
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center text-white/60">
                {activeLecture.video_path ? "Loading video..." : "No video uploaded for this lecture yet."}
              </div>
            )
          ) : (
            <div className="w-full aspect-video flex items-center justify-center text-white/60">
              No lectures available.
            </div>
          )}
          {activeLecture && (
            <div className="bg-card p-6 flex items-center justify-between">
              <div>
                <h1 className="font-serif text-2xl">{activeLecture.title}</h1>
                <div className="text-xs text-muted-foreground mt-1">{course?.title}</div>
              </div>
              <Button
                onClick={() => markComplete.mutate(activeLecture.id)}
                disabled={completedSet.has(activeLecture.id)}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {completedSet.has(activeLecture.id) ? <><Check className="mr-1 size-4" /> Completed</> : "Mark complete"}
              </Button>
            </div>
          )}

          <div className="bg-background flex-1">
            <Tabs defaultValue="qa" className="max-w-4xl mx-auto p-6">
              <TabsList>
                <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="assessments">Assessments</TabsTrigger>
              </TabsList>
              <TabsContent value="qa" className="mt-6">
                <QASection courseId={courseId} lectureId={activeLectureId} canPost={true} />
              </TabsContent>
              <TabsContent value="reviews" className="mt-6">
                <ReviewsSection courseId={courseId} canReview={true} />
              </TabsContent>
              <TabsContent value="assessments" className="mt-6">
                <AssessmentPanel courseId={courseId} certCode={certCode} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <aside className="border-l border-border bg-card overflow-y-auto max-h-[calc(100vh-4rem-49px)]">
          {(course?.course_sections ?? []).sort((a: any, b: any) => a.position - b.position).map((s: any) => {
            const lectures = (s.lectures ?? []).sort((a: any, b: any) => a.position - b.position);
            return (
              <div key={s.id} className="border-b border-border">
                <div className="px-4 py-3 bg-secondary/40 text-sm font-medium">{s.title}</div>
                <ul>
                  {lectures.map((l: any) => (
                    <li key={l.id}>
                      <button
                        onClick={() => setActiveLectureId(l.id)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm hover:bg-secondary/50 transition-colors ${
                          l.id === activeLectureId ? "bg-brand/10 border-l-2 border-brand" : ""
                        }`}
                      >
                        {completedSet.has(l.id) ? (
                          <Check className="size-4 text-brand shrink-0" />
                        ) : (
                          <PlayCircle className="size-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="flex-1">{l.title}</span>
                        <span className="text-xs text-muted-foreground">{formatDuration(l.duration_seconds)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </aside>
      </main>
    </div>
  );
}
