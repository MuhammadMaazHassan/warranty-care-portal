import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
  getSegments,
  createSegment,
  deleteSegment,
  evaluateSegment
} from "../controllers/segments.controller.js";

const router = Router();

router.get("/", requireAuth, getSegments);
router.post("/", requireAuth, createSegment);
router.delete("/:id", requireAuth, deleteSegment);
router.get("/:id/evaluate", requireAuth, evaluateSegment);

export default router;
