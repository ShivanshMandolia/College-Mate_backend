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
import itemRouter from "./routes/item.routes.js";  // Importing item-related routes
import complaintRouter from "./routes/complaint.routes.js";
import placemnentRouter from "./routes/placement.routes.js";
import eventRouter from "./routes/event.routes.js";  // Event routes with nested reactions

// Use routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/items", itemRouter);
app.use("/api/v1/comp", complaintRouter);
app.use("/api/v1/placement", placemnentRouter);
app.use("/api/v1/events", eventRouter);  // reactions routes are nested inside events now

// Export app correctly
export { app };
