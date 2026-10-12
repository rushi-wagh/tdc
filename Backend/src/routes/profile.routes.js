import { Router } from "express";
import authenticate from "../middlewares/auth.middleware.js";
import { getDashboardProfiles } from "../controllers/profile.controller.js";

const router = Router();

router.get("/dashboard", authenticate, getDashboardProfiles);

export default router;