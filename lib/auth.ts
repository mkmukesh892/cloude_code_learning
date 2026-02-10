import { betterAuth } from "better-auth";
import { headers } from "next/headers";
import { Database } from "bun:sqlite";
import { nextCookies } from "better-auth/next-js";

const db = new Database(process.env.DB_PATH || "data/app.db");

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3008",
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    nextCookies()
  ]
});

export type Session = typeof auth.$Infer.Session;

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}
