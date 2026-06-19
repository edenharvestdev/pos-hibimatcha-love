const REQUIRED_IN_PRODUCTION = ["DATABASE_URL", "JWT_SECRET"] as const;

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production";
  const missing = REQUIRED_IN_PRODUCTION.filter((k) => !process.env[k]?.trim());

  if (isProd && missing.length > 0) {
    console.error(`[ENV] Missing required variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (!process.env.JWT_SECRET?.trim()) {
    console.warn("[ENV] JWT_SECRET is not set — auth will fail");
  }

  if (isProd && process.env.JWT_SECRET === "super-secret-backend-key") {
    console.error("[ENV] Change JWT_SECRET before production deploy");
    process.exit(1);
  }
}

export function getEnvStatus() {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    database: !!process.env.DATABASE_URL,
    jwt: !!process.env.JWT_SECRET,
    s3: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET),
    pusher: !!(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY),
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_FROM_NUMBER),
    promptpayWebhook: !!process.env.PROMPTPAY_WEBHOOK_SECRET,
  };
}
