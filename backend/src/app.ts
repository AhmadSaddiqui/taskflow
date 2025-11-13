// import express from "express"
// import helmet from "helmet"
// import cors from "cors"
// import cookieParser from "cookie-parser"
// import pinoHttp from "pino-http"
// import { requestId } from "./middlewares/request-id"
// import { errorHandler } from "./middlewares/error"
// import { logger } from "./logger"
// import { health } from "./routes/health"
// import authRouter from "./routes/auth"

// export const app = express()

// // -----------------------------------------------------
// // 1️⃣  Security & Middleware setup (order matters)
// // -----------------------------------------------------

// // Unique request IDs for tracing
// app.use(requestId)

// // HTTP headers for security
// app.use(helmet())

// // CORS — must allow credentials for cookies
// app.use(
//   cors({
//     origin: process.env.CORS_ORIGIN || "http://localhost:3000",
//     credentials: true, // allows cookies in browser
//   })
// )

// // Parse cookies & JSON
// app.use(cookieParser())
// app.use(express.json({ limit: "1mb" }))

// // -----------------------------------------------------
// // 2️⃣  Logging
// // -----------------------------------------------------
// app.use(
//   pinoHttp({
//     logger,
//     customProps: (req) => ({ requestId: (req as any).id }),
//   })
// )

// // -----------------------------------------------------
// // 3️⃣  Routes
// // -----------------------------------------------------
// app.use("/auth", authRouter) // ✅ now cookie + cors middlewares are active
// app.use(health)

// // -----------------------------------------------------
// // 4️⃣  404 + Global Error Handling
// // -----------------------------------------------------
// app.use((req, res) => {
//   res.status(404).json({ error: "NotFound", path: req.path })
// })

// // Error handler (always last)
// app.use(errorHandler)
import express from "express"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"
import pinoHttp from "pino-http"
import { requestId } from "./middlewares/request-id"
import { errorHandler } from "./middlewares/error"
import { logger } from "./logger"
import { health } from "./routes/health"
import authRouter from "./routes/auth"

export const app = express()

// ---- Security and body parsing (must be first) ----
app.use(helmet())
app.use(
  cors({
    origin: "http://localhost:3000", // your frontend or Postman
    credentials: true, // <-- allows cookies to be sent
  })
)
app.use(cookieParser())
app.use(express.json({ limit: "1mb" }))

// ---- Logging ----
app.use(requestId)
app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({ requestId: (req as any).id }),
  })
)

// ---- Routes ----
app.use("/auth", authRouter) // <--- cookies now parsed correctly
app.use(health)

// ---- 404 + Error handling ----
app.use((req, res) => res.status(404).json({ error: "NotFound", path: req.path }))
app.use(errorHandler)
