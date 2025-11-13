import { prisma } from "../../lib/prisma"
import {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
  signAccessToken,
} from "../../lib/auth"
import { env } from "../../env"

export interface SessionData {
  userId: string
  sessionId: string
  accessToken: string
  refreshToken: string
}

/** Create a new session for the user */
export async function createSession(
  userId: string,
  userAgent?: string | null,
  ip?: string | null
): Promise<SessionData> {
  const refreshToken = generateRefreshToken()
  const refreshHash = await hashRefreshToken(refreshToken)

  const expiresAt = new Date(Date.now() + parseTTL(env.JWT_REFRESH_TTL))
  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: refreshHash,
      userAgent: userAgent ?? null,
      ip: ip ?? null,
      expiresAt,
    },
  })

  const accessToken = signAccessToken({ sub: userId, sid: session.id })
  return { userId, sessionId: session.id, accessToken, refreshToken }
}

/** Verify and rotate a refresh token */
export async function rotateSession(userId: string, oldToken: string): Promise<SessionData | null> {
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null },
  })

  for (const session of sessions) {
    const valid = await verifyRefreshToken(oldToken, session.refreshTokenHash)
    if (valid) {
      // revoke old session
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), lastUsedAt: new Date() },
      })

      // create new one (reuse userAgent/IP if you want)
      return await createSession(userId)
    }
  }

  return null
}

/** Revoke all sessions for a user (signout everywhere) */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

/** Revoke one specific session */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  })
}

// -------- utility ------------
function parseTTL(ttl: string): number {
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
