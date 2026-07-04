// Daraja (M-Pesa Lipa Na M-Pesa Online) client. Server-only.
// Uses process.env — never imported from client code.

const BASES = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
} as const;

function daraja_base() {
  const env = (process.env.MPESA_ENV ?? "sandbox").toLowerCase();
  return env === "production" ? BASES.production : BASES.sandbox;
}

export function normalizeMsisdn(input: string): string {
  const digits = input.replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("0")) n = "254" + n.slice(1);
  else if (n.startsWith("7") && n.length === 9) n = "254" + n;
  else if (n.startsWith("254")) n = n;
  if (!/^2547\d{8}$/.test(n)) {
    throw new Error("Enter a valid Safaricom number (e.g. 07XX XXX XXX)");
  }
  return n;
}

async function getAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("M-Pesa credentials not configured");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${daraja_base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Daraja OAuth failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

function timestampAndPassword() {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
  return { ts, password, shortcode };
}

export type StkPushResult = {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
};

export async function stkPush(params: {
  phone: string; // 2547XXXXXXXX
  amount: number; // whole KES
  accountRef: string; // e.g. order id short
  description: string;
  callbackUrl: string;
}): Promise<StkPushResult> {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortcode || !passkey) throw new Error("M-Pesa shortcode / passkey not configured");

  const token = await getAccessToken();
  const { ts, password } = timestampAndPassword();
  const body = {
    BusinessShortCode: Number(shortcode),
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.max(1, Math.round(params.amount)),
    PartyA: Number(params.phone),
    PartyB: Number(shortcode),
    PhoneNumber: Number(params.phone),
    CallBackURL: params.callbackUrl,
    AccountReference: params.accountRef.slice(0, 12),
    TransactionDesc: params.description.slice(0, 40),
  };

  const res = await fetch(`${daraja_base()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as StkPushResult & { errorMessage?: string };
  if (!res.ok || json.errorMessage) {
    throw new Error(json.errorMessage ?? `STK Push failed: ${res.status}`);
  }
  return json;
}
