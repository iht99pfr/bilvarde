import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  // Strip channel_binding param — not supported by Neon HTTP driver
  const cleanUrl = url.replace(/[&?]channel_binding=[^&]*/g, "");
  return neon(cleanUrl);
}
