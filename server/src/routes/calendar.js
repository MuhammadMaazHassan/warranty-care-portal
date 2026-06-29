import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
  getCalendarEvents,
  createCalendarEvent,
  getCalendarSuggestions,
  updateCalendarEvent,
  transitionCalendarEvent
} from "../controllers/calendar.controller.js";

const router = Router();

router.get("/", requireAuth, getCalendarEvents);
router.post("/", requireAuth, createCalendarEvent);
router.post("/suggestions", requireAuth, getCalendarSuggestions);
router.patch("/:id/status", requireAuth, transitionCalendarEvent);
router.patch("/:id", requireAuth, updateCalendarEvent);

export default router;
