import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// Configure CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Middleware for parsing JSON and URL-encoded data
app.use(express.json({ limit: "16kb" }));  // Restricting body size for security
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));  // Serving static files from the "public" folder
app.use(cookieParser());  // Handling secure cookies

// Import routes
import authRouter from "./routes/auth.routes.js";  // Importing authentication routes
import itemRouter from "./routes/item.routes.js";  // Importing item-related routes (new routes as per your previous request)

app.use("/api/v1/auth", authRouter);  // Authentication routes
app.use("/api/v1/items", itemRouter);  // Item-related routes

// ✅ Fix: Export `app` correctly
export { app };
