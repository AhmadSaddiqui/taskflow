import { z } from "zod"

// ---------- Signup ----------
export const signupSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

// ---------- Signin ----------
export const signinSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
})

// ---------- Refresh ----------
export const refreshSchema = z.object({
  // refresh token comes from cookie; body usually empty
})

// ---------- Signout ----------
export const signoutSchema = z.object({
  // may include sessionId or none, handled via cookie
})

// ---------- Types ----------
export type SignupInput = z.infer<typeof signupSchema>
export type SigninInput = z.infer<typeof signinSchema>
