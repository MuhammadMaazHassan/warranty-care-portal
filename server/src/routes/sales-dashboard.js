import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getDashboardStats, exportDashboardCsv } from "../controllers/sales-dashboard.controller.js";

const router = Router();

router.get("/", requireAuth, getDashboardStats);
router.get("/export", requireAuth, exportDashboardCsv);

export default router;
