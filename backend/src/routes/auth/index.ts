import { Router } from "express"
import { signupHandler, signinHandler, refreshHandler, signoutHandler } from "./controller"

const router = Router()

router.post("/signup", signupHandler)
router.post("/signin", signinHandler)
router.post("/refresh", refreshHandler)
router.post("/signout", signoutHandler)

export default router
