import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import { createOrder, initiateMpesaPayment, getOrderStatus } from "@/lib/checkout.functions";
import { formatPrice } from "@/lib/format";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  priceCents: number;
};

type Stage = "review" | "phone" | "waiting" | "success" | "failed";

export function CheckoutDialog({ open, onOpenChange, courseId, courseTitle, priceCents }: Props) {
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState(priceCents);
  const [discount, setDiscount] = useState(0);
  const [stage, setStage] = useState<Stage>("review");
  const [message, setMessage] = useState<string>("");

  const createOrderFn = useServerFn(createOrder);
  const initiatePayFn = useServerFn(initiateMpesaPayment);
  const statusFn = useServerFn(getOrderStatus);

  useEffect(() => {
    if (!open) {
      setStage("review");
      setOrderId(null);
      setAmount(priceCents);
      setDiscount(0);
      setCoupon("");
      setPhone("");
      setMessage("");
    }
  }, [open, priceCents]);

  const createOrderMut = useMutation({
    mutationFn: () => createOrderFn({ data: { courseId, couponCode: coupon || null } }),
    onSuccess: (res) => {
      setOrderId(res.order.id);
      setAmount(res.order.amount_cents);
      setDiscount(res.order.discount_cents);
      setStage("phone");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payMut = useMutation({
    mutationFn: () => initiatePayFn({ data: { orderId: orderId!, phone } }),
    onSuccess: (res) => {
      setStage("waiting");
      setMessage(res.customerMessage ?? "Check your phone for the M-Pesa prompt.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Poll for status once we're waiting
  useEffect(() => {
    if (stage !== "waiting" || !orderId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await statusFn({ data: { orderId } });
        if (cancelled) return;
        if (res.status === "paid") {
          setStage("success");
          toast.success("Payment received — you're enrolled!");
          setTimeout(() => {
            onOpenChange(false);
            navigate({ to: "/learn/$courseId", params: { courseId: res.courseId } });
          }, 1200);
        } else if (res.status === "failed" || res.status === "cancelled") {
          setStage("failed");
          setMessage("Payment was not completed. You can try again.");
        }
      } catch {
        // ignore
      }
    };
    const iv = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [stage, orderId, statusFn, navigate, onOpenChange, courseId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Enroll in course</DialogTitle>
          <DialogDescription className="line-clamp-2">{courseTitle}</DialogDescription>
        </DialogHeader>

        {stage === "review" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/40 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Price</span><span>{formatPrice(priceCents)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-brand"><span>Coupon</span><span>−{formatPrice(discount)}</span></div>
              )}
              <div className="flex justify-between font-serif text-lg pt-2 border-t border-border">
                <span>Total</span><span>{formatPrice(amount)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon">Coupon code (optional)</Label>
              <Input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="e.g. LAUNCH20" />
            </div>
            <Button className="w-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => createOrderMut.mutate()} disabled={createOrderMut.isPending}>
              {createOrderMut.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Continue to payment
            </Button>
          </div>
        )}

        {stage === "phone" && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Total to pay: <strong className="text-foreground">{formatPrice(amount)}</strong>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2"><Smartphone className="size-4" /> M-Pesa phone number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" autoFocus />
              <p className="text-xs text-muted-foreground">You'll get an STK prompt to enter your M-Pesa PIN.</p>
            </div>
            <Button className="w-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => payMut.mutate()} disabled={payMut.isPending || !phone}>
              {payMut.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Send STK prompt
            </Button>
          </div>
        )}

        {stage === "waiting" && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-brand mx-auto" />
            <p className="font-serif text-lg">Waiting for payment…</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{message}</p>
          </div>
        )}

        {stage === "success" && (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="size-10 text-brand mx-auto" />
            <p className="font-serif text-lg">You're enrolled!</p>
            <p className="text-sm text-muted-foreground">Redirecting you to the course…</p>
          </div>
        )}

        {stage === "failed" && (
          <div className="py-8 text-center space-y-3">
            <XCircle className="size-10 text-destructive mx-auto" />
            <p className="font-serif text-lg">Payment not completed</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button variant="outline" onClick={() => setStage("phone")}>Try again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
