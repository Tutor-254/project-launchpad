import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLATFORM_FEE_BPS = 1500; // 15%

type CreateOrderInput = { courseId: string; couponCode?: string | null };

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateOrderInput) => {
    if (!data?.courseId || typeof data.courseId !== "string") throw new Error("courseId required");
    return { courseId: data.courseId, couponCode: data.couponCode?.trim() || null };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: course, error: cErr } = await supabase
      .from("courses")
      .select("id, title, price_cents, instructor_id, status")
      .eq("id", data.courseId)
      .single();
    if (cErr || !course) throw new Error("Course not found");
    if (course.status !== "published") throw new Error("Course is not available");
    if (!course.price_cents || course.price_cents <= 0) throw new Error("Course is free — enroll directly");

    // Reject duplicate enrollment
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", data.courseId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) throw new Error("You are already enrolled in this course");

    // Optional coupon lookup
    let couponId: string | null = null;
    let discount = 0;
    if (data.couponCode) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("id, code, percent_off, active, max_redemptions, redemptions, expires_at, course_id")
        .eq("code", data.couponCode)
        .maybeSingle();
      if (!coupon || !coupon.active) throw new Error("Invalid coupon code");
      if (coupon.course_id && coupon.course_id !== course.id) throw new Error("Coupon not valid for this course");
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error("Coupon has expired");
      if (coupon.max_redemptions !== null && coupon.redemptions >= coupon.max_redemptions) throw new Error("Coupon fully redeemed");
      const pct = Math.max(0, Math.min(100, coupon.percent_off ?? 0));
      discount = Math.floor((course.price_cents * pct) / 100);
      couponId = coupon.id;
    }


    const amount = Math.max(0, course.price_cents - discount);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        course_id: course.id,
        amount_cents: amount,
        discount_cents: discount,
        coupon_id: couponId,
        currency: "KES",
        status: "pending",
      })
      .select("id, amount_cents, discount_cents, currency, status")
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Failed to create order");

    return { order, courseTitle: course.title };
  });

type PayInput = { orderId: string; phone: string };

export const initiateMpesaPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PayInput) => {
    if (!data?.orderId || !data?.phone) throw new Error("orderId and phone required");
    return { orderId: data.orderId, phone: data.phone };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { normalizeMsisdn, stkPush } = await import("@/lib/mpesa.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const phone = normalizeMsisdn(data.phone);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, course_id, amount_cents, status")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("Order not found");
    if (order.user_id !== userId) throw new Error("Not your order");
    if (order.status === "paid") throw new Error("Order already paid");

    // Build callback URL from request host so preview and prod both work.
    const host = getRequestHost();
    const forwardedProto = getRequestHeader("x-forwarded-proto") ?? "https";
    const token = process.env.MPESA_CALLBACK_SECRET!;
    const callbackUrl = `${forwardedProto}://${host}/api/public/mpesa/callback?token=${encodeURIComponent(token)}`;

    // If amount is fractional (cents), M-Pesa expects whole KES; assume amount_cents is minor units where 100 = KES 1.
    const amountKes = Math.max(1, Math.round(order.amount_cents / 100));

    const stk = await stkPush({
      phone,
      amount: amountKes,
      accountRef: order.id.slice(0, 8),
      description: `Order ${order.id.slice(0, 8)}`,
      callbackUrl,
    });

    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      provider: "mpesa",
      provider_ref: stk.CheckoutRequestID,
      merchant_request_id: stk.MerchantRequestID,
      phone,
      amount_cents: order.amount_cents,
      status: "pending",
    });

    await supabaseAdmin
      .from("orders")
      .update({ status: "awaiting_payment" })
      .eq("id", order.id);

    return { checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage };
  });

export const getOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status, course_id, user_id")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("Order not found");
    if (order.user_id !== userId) throw new Error("Not your order");
    return { status: order.status, courseId: order.course_id };
  });

export const PLATFORM_FEE_BASIS_POINTS = PLATFORM_FEE_BPS;
