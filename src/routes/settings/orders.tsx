import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { requireAuth } from "@/lib/auth-guards";

export const Route = createFileRoute("/settings/orders")({
  beforeLoad: async () => {
    await requireAuth("/settings/orders");
  },
  component: OrdersPage,
});

type Order = {
  id: string;
  amount_cents: number;
  discount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  course_id: string;
  courses: { title: string } | null;
  payments: { mpesa_receipt: string | null; status: string }[] | null;
};

function statusVariant(s: string): "default" | "secondary" | "outline" | "destructive" {
  if (s === "paid") return "default";
  if (s === "failed" || s === "cancelled" || s === "refunded") return "destructive";
  return "secondary";
}

function OrdersPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, amount_cents, discount_cents, currency, status, created_at, course_id, courses(title), payments(mpesa_receipt, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Order[];
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <h1 className="font-serif text-3xl mb-8">Your orders</h1>
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && (!data || data.length === 0) && (
          <div className="border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
            No orders yet. Explore the <Link to="/courses" className="text-brand underline">catalogue</Link>.
          </div>
        )}
        <div className="space-y-3">
          {data?.map((o) => {
            const receipt = o.payments?.find((p) => p.mpesa_receipt)?.mpesa_receipt;
            return (
              <div key={o.id} className="border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link to="/courses/$courseId" params={{ courseId: o.course_id }} className="font-medium hover:text-brand truncate block">
                    {o.courses?.title ?? "Course"}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()} · Order {o.id.slice(0, 8)}
                    {receipt && <> · Receipt {receipt}</>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif">{formatPrice(o.amount_cents)}</div>
                  <Badge variant={statusVariant(o.status)} className="mt-1 capitalize text-[10px]">
                    {o.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
