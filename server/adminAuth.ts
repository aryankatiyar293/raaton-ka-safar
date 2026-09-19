import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { createAdminAccount, createAdminSession, deleteAdminSession, getAdminByEmail, getAdminBySession } from "./db";
import { ENV } from "./_core/env";

export const ADMIN_COOKIE = "broken_songs_admin";
const SESSION_DAYS = 7;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, expected] = encoded.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const target = Buffer.from(expected, "hex");
  return target.length === actual.length && timingSafeEqual(target, actual);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(req: Request, name: string) {
  const cookieHeader = req.headers.cookie ?? "";
  const value = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : "";
}

function setAdminCookie(res: Response, token: string) {
  res.cookie(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export async function ensureAdminAccount() {
  if (!ENV.adminEmail || !ENV.adminPassword) return undefined;
  const existing = await getAdminByEmail(ENV.adminEmail);
  if (existing) return existing;
  return createAdminAccount({
    email: ENV.adminEmail.toLowerCase(),
    passwordHash: hashPassword(ENV.adminPassword),
    mustChangePassword: 1,
  });
}

export async function loginAdmin(email: string, password: string, res: Response) {
  const normalized = email.trim().toLowerCase();
  await ensureAdminAccount();
  const admin = await getAdminByEmail(normalized);
  if (!admin || !verifyPassword(password, admin.passwordHash)) return undefined;
  const token = randomBytes(32).toString("hex");
  await createAdminSession({
    tokenHash: hashToken(token),
    adminId: admin.id,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
  });
  setAdminCookie(res, token);
  return { id: admin.id, email: admin.email, mustChangePassword: Boolean(admin.mustChangePassword) };
}

export async function getAdminFromRequest(req: Request) {
  const token = readCookie(req, ADMIN_COOKIE);
  if (!token) return undefined;
  return getAdminBySession(hashToken(token));
}

export async function logoutAdmin(req: Request, res: Response) {
  const token = readCookie(req, ADMIN_COOKIE);
  if (token) await deleteAdminSession(hashToken(token));
  res.clearCookie(ADMIN_COOKIE, { httpOnly: true, secure: ENV.isProduction, sameSite: "lax", path: "/" });
}

export function requireAdmin(req: Request, res: Response, next: () => void) {
  getAdminFromRequest(req)
    .then((admin) => {
      if (!admin) {
        res.status(401).json({ error: "Admin authentication required" });
        return;
      }
      (req as Request & { admin?: typeof admin }).admin = admin;
      next();
    })
    .catch(() => res.status(500).json({ error: "Unable to verify admin session" }));
}
