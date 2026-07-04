import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { requireAuth, requireRole, requireNoApplicationPending } from "@/lib/auth-guards";

export const Route = createFileRoute("/instructor/payouts")({
  beforeLoad: async () => {
    const session = await requireAuth("/instructor/payouts");
    const hasRole = await requireRole(session.user.id, "instructor");
    if (!hasRole) throw redirect({ to: "/teach" });
    await requireNoApplicationPending(session.user.id);
  },
  component: PayoutsPage,
});

type Payout = {
  id: string;
  gross_cents: number;
  platform_fee_cents: number;
  net_cents: number;
  status: string;
  created_at: string;
  course_id: string;
  courses: { title: string } | null;
};

function PayoutsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["payouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("id, gross_cents, platform_fee_cents, net_cents, status, created_at, course_id, courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Payout[];
    },
  });

  const totals = (data ?? []).reduce(
    (acc, p) => {
      acc.gross += p.gross_cents;
      acc.fee += p.platform_fee_cents;
      acc.net += p.net_cents;
      if (p.status === "accrued") acc.accrued += p.net_cents;
      else acc.paid += p.net_cents;
      return acc;
    },
    { gross: 0, fee: 0, net: 0, accrued: 0, paid: 0 },
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl">Payouts</h1>
          <Link to="/instructor" className="text-sm text-brand hover:underline">← Back to Studio</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card label="Gross earnings" value={formatPrice(totals.gross)} />
          <Card label="Platform fee" value={formatPrice(totals.fee)} />
          <Card label="Accrued (unpaid)" value={formatPrice(totals.accrued)} accent />
          <Card label="Paid out" value={formatPrice(totals.paid)} />
        </div>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && (!data || data.length === 0) && (
          <div className="border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
            No sales yet. Payouts appear here after students pay for your courses.
          </div>
        )}

        <div className="border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {data?.map((p) => (
            <div key={p.id} className="p-4 flex items-center gap-4 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.courses?.title ?? "Course"}</div>
                <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-serif">{formatPrice(p.net_cents)}</div>
                <div className="text-[10px] text-muted-foreground">Gross {formatPrice(p.gross_cents)} · Fee {formatPrice(p.platform_fee_cents)}</div>
              </div>
              <Badge variant={p.status === "paid" ? "default" : "secondary"} className="capitalize">{p.status}</Badge>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? "border-brand/40 bg-brand/5" : "border-border bg-card"}`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="font-serif text-xl">{value}</div>
    </div>
  );
}
