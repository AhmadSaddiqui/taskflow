import crypto from "crypto"
import argon2 from "argon2"
import jwt from "jsonwebtoken"
import { Response } from "express"
import { env } from "../env"

// --- Import JWT types directly (no re-declare) ---
import type { JwtPayload, SignOptions, Secret } from "jsonwebtoken"

// ---------------------------------------------------------
// PASSWORD HELPERS
// ---------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password)
}

// ---------------------------------------------------------
// JWT HELPERS (ACCESS TOKEN)
// ---------------------------------------------------------

export interface AccessTokenPayload extends JwtPayload {
  sub: string
  sid?: string
  email?: string
}

/** Create a short-lived access token. */
export function signAccessToken(payload: AccessTokenPayload): string {
  const secret: Secret = env.JWT_ACCESS_SECRET
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as any } // e.g. "15m"
  return jwt.sign(payload, secret, options)
}

/** Verify and decode an access token safely. */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET as Secret) as AccessTokenPayload
  } catch {
    return null
  }
}

// ---------------------------------------------------------
// REFRESH TOKEN HELPERS
// ---------------------------------------------------------

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export async function hashRefreshToken(token: string): Promise<string> {
  return argon2.hash(token, { type: argon2.argon2id })
}

export async function verifyRefreshToken(token: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, token)
}

// ---------------------------------------------------------
// COOKIE HELPERS
// ---------------------------------------------------------

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(env.COOKIE_NAME_REFRESH, token, {
    httpOnly: true,
    secure: env.SECURE_COOKIES,
    sameSite: "lax",
    path: "/auth/refresh",
    maxAge: parseDuration(env.JWT_REFRESH_TTL),
  })
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(env.COOKIE_NAME_REFRESH, {
    httpOnly: true,
    secure: env.SECURE_COOKIES,
    sameSite: "lax",
    path: "/auth/refresh",
  })
}

// ---------------------------------------------------------
// UTIL: Parse TTL strings like “15m”, “7d” into milliseconds
// ---------------------------------------------------------

function parseDuration(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/)
  if (!match) return 0
  const value = parseInt(match[1] ?? "0", 10)
  const unit = match[2]
  switch (unit) {
    case "s": return value * 1000
    case "m": return value * 60 * 1000
    case "h": return value * 60 * 60 * 1000
    case "d": return value * 24 * 60 * 60 * 1000
    default:  return 0
  }
}
