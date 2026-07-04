import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const [{ data: courses }, { data: profiles }] = await Promise.all([
          supabase.from("courses").select("id, updated_at").eq("status", "published"),
          supabase.from("profiles").select("username, updated_at").not("username", "is", null),
        ]);

        const staticEntries = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/courses", changefreq: "daily", priority: "0.9" },
          { path: "/teach", changefreq: "monthly", priority: "0.5" },
          { path: "/auth", changefreq: "yearly", priority: "0.3" },
        ];

        const dynamic = [
          ...(courses ?? []).map((c) => ({ path: `/courses/${c.id}`, lastmod: c.updated_at, changefreq: "weekly", priority: "0.8" })),
          ...(profiles ?? []).map((p: any) => ({ path: `/u/${p.username}`, lastmod: p.updated_at, changefreq: "weekly", priority: "0.6" })),
        ];

        const urls = [...staticEntries, ...dynamic].map((e: any) => [
          "  <url>",
          `    <loc>${BASE_URL}${e.path}</loc>`,
          e.lastmod ? `    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : null,
          e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
          e.priority ? `    <priority>${e.priority}</priority>` : null,
          "  </url>",
        ].filter(Boolean).join("\n"));

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
