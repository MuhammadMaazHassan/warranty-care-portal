import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { uploadCsvMiddleware, handleCsvUpload } from "../controllers/csv.controller.js";

const router = Router();

router.post("/upload", requireAuth, uploadCsvMiddleware, handleCsvUpload);

export default router;
