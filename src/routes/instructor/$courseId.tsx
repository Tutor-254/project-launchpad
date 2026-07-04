import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ImageIcon, Plus, Trash2, UploadCloud, Video } from "lucide-react";
import { requireAuth, requireRole, requireNoApplicationPending } from "@/lib/auth-guards";

export const Route = createFileRoute("/instructor/$courseId")({
  beforeLoad: async () => {
    const session = await requireAuth("/instructor");
    const hasRole = await requireRole(session.user.id, "instructor");
    if (!hasRole) throw redirect({ to: "/teach" });
    await requireNoApplicationPending(session.user.id);
  },
  component: CourseEditor,
});

type Section = { id: string; title: string; position: number };
type Lecture = {
  id: string;
  section_id: string;
  title: string;
  position: number;
  duration_seconds: number | null;
  video_path: string | null;
  is_preview: boolean;
};

function CourseEditor() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ["edit-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, categories(id,name,slug), course_sections(*, lectures(*))")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: cats } = useQuery({
    queryKey: ["all-cats"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const [form, setForm] = useState<any>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      setForm({
        title: course.title,
        subtitle: course.subtitle ?? "",
        description: course.description ?? "",
        price_cents: course.price_cents,
        level: course.level,
        language: course.language,
        category_id: course.category_id,
        thumbnail_url: course.thumbnail_url,
      });
      if (course.thumbnail_url) {
        supabase.storage.from("course-thumbnails").createSignedUrl(course.thumbnail_url, 3600)
          .then(({ data }) => setThumbPreview(data?.signedUrl ?? null));
      }
    }
  }, [course]);

  const saveCourse = useMutation({
    mutationFn: async () => {
      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `course-${courseId.slice(0, 8)}`;
      const { error } = await supabase.from("courses").update({ ...form, slug }).eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["edit-course", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishToggle = useMutation({
    mutationFn: async () => {
      const isPublished = course!.status === "published";
      const { error } = await supabase.from("courses")
        .update({ status: isPublished ? "draft" : "published", published_at: isPublished ? null : new Date().toISOString() })
        .eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edit-course", courseId] });
      toast.success(course!.status === "published" ? "Unpublished" : "Published to the library");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCourse = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      navigate({ to: "/instructor" });
    },
  });

  async function handleThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `${user.id}/${courseId}/thumb-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("course-thumbnails").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    await supabase.from("courses").update({ thumbnail_url: path }).eq("id", courseId);
    setForm((f: any) => ({ ...f, thumbnail_url: path }));
    const { data } = await supabase.storage.from("course-thumbnails").createSignedUrl(path, 3600);
    setThumbPreview(data?.signedUrl ?? null);
    toast.success("Thumbnail updated");
  }

  const addSection = useMutation({
    mutationFn: async () => {
      const nextPos = (course?.course_sections ?? []).length;
      const { error } = await supabase.from("course_sections").insert({ course_id: courseId, title: "New section", position: nextPos });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-course", courseId] }),
  });

  if (isLoading || !form) return <div className="p-16 text-center text-muted-foreground">Loading...</div>;

  const sections: any[] = (course!.course_sections ?? []).sort((a: any, b: any) => a.position - b.position);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/instructor" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand">
            <ArrowLeft className="size-4" /> Studio
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{course!.status}</Badge>
            <Button variant="outline" onClick={() => publishToggle.mutate()}>
              {course!.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button onClick={() => saveCourse.mutate()} className="bg-brand text-brand-foreground hover:bg-brand/90">
              Save
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-10">
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-serif text-xl mb-4">Basics</h2>
            <div className="space-y-4">
              <Field label="Title">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Subtitle">
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
              </Field>
              <Field label="Description">
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={8} />
              </Field>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl">Curriculum</h2>
              <Button variant="outline" size="sm" onClick={() => addSection.mutate()}>
                <Plus className="mr-1 size-4" /> Add section
              </Button>
            </div>
            <div className="space-y-4">
              {sections.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No sections yet.</p>
              )}
              {sections.map((s) => (
                <SectionEditor key={s.id} section={s} courseId={courseId} onChange={() => qc.invalidateQueries({ queryKey: ["edit-course", courseId] })} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-serif text-lg mb-4">Thumbnail</h3>
            <div
              onClick={() => fileRef.current?.click()}
              className="aspect-video bg-secondary rounded-lg flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-border hover:border-brand"
            >
              {thumbPreview ? (
                <img src={thumbPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="size-8 mx-auto mb-2" />
                  <div className="text-xs">Click to upload</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleThumb} />
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-serif text-lg">Details</h3>
            <Field label="Category">
              <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {cats?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Level">
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Price (KES)">
              <Input
                type="number"
                min={0}
                value={form.price_cents / 100}
                onChange={(e) => setForm({ ...form, price_cents: Math.max(0, Math.round(Number(e.target.value) * 100)) })}
              />
            </Field>
            <Field label="Language">
              <Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
            </Field>
          </section>

          <button
            onClick={() => confirm("Delete this course? This cannot be undone.") && deleteCourse.mutate()}
            className="text-xs text-destructive hover:underline flex items-center gap-1"
          >
            <Trash2 className="size-3" /> Delete course
          </button>
        </aside>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SectionEditor({ section, courseId, onChange }: { section: Section & { lectures: Lecture[] }; courseId: string; onChange: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState(section.title);
  const lectures = (section.lectures ?? []).sort((a: any, b: any) => a.position - b.position);

  async function saveTitle() {
    if (title === section.title) return;
    await supabase.from("course_sections").update({ title }).eq("id", section.id);
    onChange();
  }
  async function del() {
    if (!confirm("Delete this section?")) return;
    await supabase.from("course_sections").delete().eq("id", section.id);
    onChange();
  }
  async function addLecture() {
    await supabase.from("lectures").insert({
      section_id: section.id,
      title: "New lecture",
      position: lectures.length,
    });
    onChange();
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 bg-secondary/40 px-4 py-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} className="h-8 bg-card font-medium" />
        <Button variant="ghost" size="sm" onClick={del}><Trash2 className="size-4 text-destructive" /></Button>
      </div>
      <ul className="divide-y divide-border">
        {lectures.map((l) => (
          <LectureEditor key={l.id} lecture={l} onChange={onChange} userId={user?.id} courseId={courseId} />
        ))}
      </ul>
      <div className="p-3 bg-card">
        <Button variant="outline" size="sm" onClick={addLecture}><Plus className="mr-1 size-3" />Add lecture</Button>
      </div>
    </div>
  );
}

function LectureEditor({ lecture, onChange, userId, courseId }: { lecture: Lecture; onChange: () => void; userId?: string; courseId: string }) {
  const [title, setTitle] = useState(lecture.title);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function saveTitle() {
    if (title === lecture.title) return;
    await supabase.from("lectures").update({ title }).eq("id", lecture.id);
    onChange();
  }
  async function del() {
    if (!confirm("Delete lecture?")) return;
    await supabase.from("lectures").delete().eq("id", lecture.id);
    onChange();
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const path = `${userId}/${courseId}/${lecture.id}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("course-videos").upload(path, file, { upsert: true });
      if (error) throw error;

      const duration = await getVideoDuration(file);
      await supabase.from("lectures").update({ video_path: path, duration_seconds: Math.round(duration) }).eq("id", lecture.id);
      toast.success("Video uploaded");
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <li className="px-4 py-2 flex items-center gap-2">
      <Video className={`size-4 ${lecture.video_path ? "text-brand" : "text-muted-foreground"}`} />
      <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} className="h-8 flex-1" />
      <label className="flex items-center">
        <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <UploadCloud className="size-4" />
          <span className="ml-1 text-xs">{uploading ? "..." : lecture.video_path ? "Replace" : "Upload"}</span>
        </Button>
        <input ref={fileRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={upload} />
      </label>
      <Button variant="ghost" size="sm" onClick={del}><Trash2 className="size-4 text-destructive" /></Button>
    </li>
  );
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      resolve(v.duration || 0);
      URL.revokeObjectURL(v.src);
    };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });
}
