import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

const PLATFORM_FEE_BPS = 1500;

function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const Route = createFileRoute("/api/public/mpesa/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const expected = process.env.MPESA_CALLBACK_SECRET ?? "";
        if (!expected || !safeEq(token, expected)) {
          return new Response("Invalid token", { status: 401 });
        }

        const body = (await request.json()) as {
          Body?: {
            stkCallback?: {
              MerchantRequestID: string;
              CheckoutRequestID: string;
              ResultCode: number;
              ResultDesc: string;
              CallbackMetadata?: { Item: Array<{ Name: string; Value?: string | number }> };
            };
          };
        };

        const cb = body?.Body?.stkCallback;
        if (!cb) {
          return Response.json({ ResultCode: 0, ResultDesc: "ignored" });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Locate payment row
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, order_id, amount_cents, status")
          .eq("provider_ref", cb.CheckoutRequestID)
          .maybeSingle();

        if (!payment) {
          console.warn("mpesa.callback: unknown CheckoutRequestID", cb.CheckoutRequestID);
          return Response.json({ ResultCode: 0, ResultDesc: "no-op" });
        }

        const success = cb.ResultCode === 0;
        const items = cb.CallbackMetadata?.Item ?? [];
        const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value as string | undefined;

        await supabaseAdmin
          .from("payments")
          .update({
            status: success ? "success" : "failed",
            mpesa_receipt: receipt ?? null,
            raw_callback: cb as unknown as never,
          })
          .eq("id", payment.id);


        if (!success) {
          await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", payment.order_id);
          return Response.json({ ResultCode: 0, ResultDesc: "recorded" });
        }

        // Load order + course for provisioning
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, user_id, course_id, amount_cents, coupon_id, status")
          .eq("id", payment.order_id)
          .single();
        if (!order) return Response.json({ ResultCode: 0, ResultDesc: "no-order" });

        if (order.status !== "paid") {
          await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", order.id);

          // Enroll
          await supabaseAdmin
            .from("enrollments")
            .upsert(
              { user_id: order.user_id, course_id: order.course_id },
              { onConflict: "user_id,course_id" },
            );

          // Payout ledger
          const { data: course } = await supabaseAdmin
            .from("courses")
            .select("instructor_id")
            .eq("id", order.course_id)
            .single();
          if (course?.instructor_id) {
            const fee = Math.floor((order.amount_cents * PLATFORM_FEE_BPS) / 10000);
            const net = order.amount_cents - fee;
            await supabaseAdmin.from("payouts").insert({
              instructor_id: course.instructor_id,
              order_id: order.id,
              course_id: order.course_id,
              gross_cents: order.amount_cents,
              platform_fee_cents: fee,
              net_cents: net,
              status: "accrued",
            });
          }

          // Coupon redemption bookkeeping
          if (order.coupon_id) {
            await supabaseAdmin.from("coupon_redemptions").insert({
              coupon_id: order.coupon_id,
              user_id: order.user_id,
              order_id: order.id,
            });
            const { data: coupon } = await supabaseAdmin
              .from("coupons")
              .select("redemptions")
              .eq("id", order.coupon_id)
              .single();
            if (coupon) {
              await supabaseAdmin
                .from("coupons")
                .update({ redemptions: (coupon.redemptions ?? 0) + 1 })
                .eq("id", order.coupon_id);
            }
          }

        }

        return Response.json({ ResultCode: 0, ResultDesc: "ok" });
      },
    },
  },
});
