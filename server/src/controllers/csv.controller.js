import { inngest } from "../lib/inngest.js";

// We don't need multer anymore because the frontend pre-maps the CSV
// and sends it as a JSON array (leadsList).
export const uploadCsvMiddleware = (req, res, next) => next();

export const handleCsvUpload = async (req, res) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { leadsList, attested, mergeStrategy = "update" } = req.body;

    if (!leadsList || !Array.isArray(leadsList) || leadsList.length === 0) {
      return res.status(400).json({ message: "No valid leads provided for import." });
    }

    if (!attested || attested === "false" || attested === false) {
      return res.status(400).json({
        message: "You must attest that contacts have consented to be contacted.",
      });
    }

    // Enforce HOMEOWNER limits
    if (req.user.role.toUpperCase() === "HOMEOWNER") {
      if (leadsList.length > 1000) {
        return res.status(400).json({
          message: "Homeowners can upload a maximum of 1000 rows per file.",
        });
      }
    }

    if (leadsList.length > 100000) {
      return res.status(400).json({
        message: "Maximum 100,000 rows allowed per file.",
      });
    }

    // Fire background Inngest event with pre-mapped rows
    await inngest.send({
      name: "csv/import.started",
      data: {
        rows: leadsList,
        mergeStrategy,
        companyId: req.user.companyId,
        userId: req.user.id,
        userRole: req.user.role,
        userName: req.user.name || req.user.email,
      },
    });

    return res.json({
      message: "CSV import started successfully in the background.",
      rowCount: leadsList.length,
    });
  } catch (error) {
    console.error("CSV Upload Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
