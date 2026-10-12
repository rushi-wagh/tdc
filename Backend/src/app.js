import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import profileRouter from "./routes/profile.routes.js";
import matchRouter from "./routes/match.routes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
}));
app.use(cookieParser());
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/profiles", profileRouter);
app.use("/api/v1/matches", matchRouter);

export { app };
export default app;