import { Router } from "express";
import authenticate from "../middlewares/auth.middleware.js";
import { getSuggestions } from "../controllers/match.controller.js";

const router = Router();

router.get("/:profileId/suggestions", authenticate, getSuggestions);

export default router;