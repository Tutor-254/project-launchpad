import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { BookOpen } from "lucide-react";

export type CourseCardData = {
  id: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  level: string;
  instructor_id: string;
  profiles?: { display_name: string | null } | null;
};

export function CourseCard({ course }: { course: CourseCardData }) {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    if (!course.thumbnail_url) return;
    let cancelled = false;
    supabase.storage
      .from("course-thumbnails")
      .createSignedUrl(course.thumbnail_url, 7200)
      .then(({ data }) => {
        if (!cancelled) setThumb(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [course.thumbnail_url]);

  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: course.id }}
      className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all"
    >
      <div className="aspect-video bg-gradient-to-br from-brand/20 to-accent-warm/20 relative overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand/40">
            <BookOpen className="size-12" />
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>{course.level}</span>
        </div>
        <h3 className="font-serif text-lg leading-tight line-clamp-2 group-hover:text-brand transition-colors">
          {course.title}
        </h3>
        {course.subtitle && <p className="text-xs text-muted-foreground line-clamp-2">{course.subtitle}</p>}
        <div className="flex-1" />
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground truncate max-w-[15ch]">
            {course.profiles?.display_name ?? "Instructor"}
          </span>
          <span className="font-serif text-base font-semibold text-brand">
            {formatPrice(course.price_cents)}
          </span>
        </div>
      </div>
    </Link>
  );
}
