import { Router } from "express";
import authenticate from "../middlewares/auth.middleware.js";
import { getCandidateExplanation, getSuggestions } from "../controllers/match.controller.js";

const router = Router();

router.get("/:profileId/suggestions", authenticate, getSuggestions);
router.get("/:profileId/suggestions/:candidateProfileId/explanation", authenticate, getCandidateExplanation);

export default router;