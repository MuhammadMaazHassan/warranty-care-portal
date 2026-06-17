import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
  getCampaigns,
  getCampaignDetail,
  createCampaign,
  updateCampaign,
  updateCampaignSteps,
  enrollCampaign,
  deleteCampaign
} from "../controllers/campaigns.controller.js";

const router = Router();

router.get("/", requireAuth, getCampaigns);
router.get("/:id", requireAuth, getCampaignDetail);
router.post("/", requireAuth, createCampaign);
router.put("/:id", requireAuth, updateCampaign);
router.post("/:id/steps", requireAuth, updateCampaignSteps);
router.post("/:id/enroll", requireAuth, enrollCampaign);
router.delete("/:id", requireAuth, deleteCampaign);

export default router;
