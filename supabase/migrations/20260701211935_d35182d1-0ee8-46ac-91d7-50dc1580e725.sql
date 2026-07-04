
-- Enums
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending','awaiting_payment','paid','failed','cancelled','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_provider AS ENUM ('mpesa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('initiated','pending','success','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_status AS ENUM ('accrued','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend coupons if columns missing
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_uses integer;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS used_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  discount_cents integer NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  currency text NOT NULL DEFAULT 'KES',
  coupon_id uuid REFERENCES public.coupons(id),
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.orders(user_id);
CREATE INDEX ON public.orders(course_id);
CREATE INDEX ON public.orders(status);

GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_owner_read" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider public.payment_provider NOT NULL DEFAULT 'mpesa',
  provider_ref text,              -- CheckoutRequestID
  merchant_request_id text,
  mpesa_receipt text,
  phone text,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  status public.payment_status NOT NULL DEFAULT 'initiated',
  raw_callback jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payments(order_id);
CREATE INDEX ON public.payments(provider_ref);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_owner_read" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id
    AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Coupon redemptions
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupon_redemptions_owner_read" ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Payouts
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  gross_cents integer NOT NULL CHECK (gross_cents >= 0),
  platform_fee_cents integer NOT NULL CHECK (platform_fee_cents >= 0),
  net_cents integer NOT NULL CHECK (net_cents >= 0),
  status public.payout_status NOT NULL DEFAULT 'accrued',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
CREATE INDEX ON public.payouts(instructor_id);

GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payouts_instructor_read" ON public.payouts FOR SELECT TO authenticated
  USING (auth.uid() = instructor_id OR public.has_role(auth.uid(), 'admin'));
