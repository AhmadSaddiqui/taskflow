import { Request, Response, NextFunction } from "express"
import { verifyAccessToken } from "../../lib/auth"

export interface AuthenticatedUser {
  id: string
  sid?: string | undefined
  email?: string | undefined
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser | undefined
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" })
  }

  // ensure non-undefined before use
  const token = header.split(" ")[1]!
  const payload = verifyAccessToken(token)
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" })
  }

  req.user = {
    id: payload.sub,
    sid: payload.sid ?? undefined,
    email: payload.email ?? undefined,
  }

  return next()
}
