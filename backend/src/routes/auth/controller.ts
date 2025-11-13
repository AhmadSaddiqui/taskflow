import { Request, Response } from "express"
import { signupSchema, signinSchema } from "./schema"
import { hashPassword, verifyPassword, signAccessToken, generateRefreshToken, setRefreshCookie, clearRefreshCookie } from "../../lib/auth"
import { prisma } from "../../lib/prisma"
import {
  rotateSession, createSession
} from "./service"
import { env } from "../../env"
// ---------- Signup ----------
export async function signupHandler(req: Request, res: Response) {
  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { email, password } = parsed.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: "Email already exists" })

  const hashed = await hashPassword(password)
  const user = await prisma.user.create({ data: { email, password: hashed } })

  const session = await createSession(user.id, req.headers["user-agent"], req.ip)
  setRefreshCookie(res, session.refreshToken)

  return res.status(201).json({ accessToken: session.accessToken })
}

// ---------- Signin ----------
export async function signinHandler(req: Request, res: Response) {
  const parsed = signinSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ error: "Invalid credentials" })

  const ok = await verifyPassword(password, user.password)
  if (!ok) return res.status(401).json({ error: "Invalid credentials" })

  const session = await createSession(user.id, req.headers["user-agent"], req.ip)
  setRefreshCookie(res, session.refreshToken)

  return res.status(200).json({ accessToken: session.accessToken })
}

// ---------- Refresh ----------
export async function refreshHandler(req: Request, res: Response) {
  try {
    const oldToken = req.cookies?.[env.COOKIE_NAME_REFRESH]
    if (!oldToken) {
      return res.status(401).json({ error: "Missing refresh token" })
    }

    // find the session matching this refresh token hash
    const allSessions = await prisma.session.findMany({
      where: { revokedAt: null },
      include: { user: true },
    })

    let validSession: { id: string; userId: string } | null = null

    // iterate and verify the provided token against stored hashes
    for (const s of allSessions) {
      const isValid = await import("../../lib/auth").then(({ verifyRefreshToken }) =>
        verifyRefreshToken(oldToken, s.refreshTokenHash),
      )
      if (isValid) {
        validSession = { id: s.id, userId: s.userId }
        break
      }
    }

    if (!validSession) {
      // invalid or reused token
      clearRefreshCookie(res)
      return res.status(401).json({ error: "Invalid or expired session" })
    }

    // rotate the session (invalidate old + issue new)
    const rotated = await rotateSession(validSession.userId, oldToken)
    if (!rotated) {
      clearRefreshCookie(res)
      return res.status(403).json({ error: "Session rotation failed" })
    }

    // attach new refresh cookie + return new access token
    setRefreshCookie(res, rotated.refreshToken)

    return res.status(200).json({ accessToken: rotated.accessToken })
  } catch (err) {
    console.error("refreshHandler error:", err)
    return res.status(500).json({ error: "Server error during token refresh" })
  }
}
// ---------- Signout ----------
export async function signoutHandler(_req: Request, res: Response) {
  clearRefreshCookie(res)
  return res.status(204).send()
}
