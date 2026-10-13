import { Router } from "express";
import authenticate from "../middlewares/auth.middleware.js";
import {
	createProfileNote,
	getDashboardProfiles,
	getProfileDetails,
	getProfileNotes,
} from "../controllers/profile.controller.js";

const router = Router();

router.get("/dashboard", authenticate, getDashboardProfiles);
router.get("/:profileId/notes", authenticate, getProfileNotes);
router.post("/:profileId/notes", authenticate, createProfileNote);
router.get("/:profileId", authenticate, getProfileDetails);

export default router;
