import prisma from "../lib/prisma.js";
import { parseAsync } from "json2csv";

export const getDashboardStats = async (req, res) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const companyId = req.user.companyId;

    // Aggregate queries
    const [
      totalLeads,
      newLeads,
      nurturingLeads,
      appointmentSetLeads,
      closedWonLeads,
      activeCampaignsCount,
      recentTimelineEvents,
      upcomingAppointments,
      salesforceConnection,
    ] = await prisma.$transaction([
      prisma.lead.count({ where: { companyId } }),
      prisma.lead.count({ where: { companyId, status: "New" } }),
      prisma.lead.count({ where: { companyId, status: "Nurturing" } }),
      prisma.lead.count({ where: { companyId, status: "Appointment Set" } }),
      prisma.lead.count({ where: { companyId, status: "Closed Won" } }),
      prisma.campaign.count({ where: { companyId, status: "Active" } }),
      prisma.leadTimeline.findMany({
        where: { lead: { companyId } },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { lead: { select: { firstName: true, lastName: true } } },
      }),
      prisma.salesAppointment.findMany({
        where: {
          lead: { companyId },
          time: { gte: new Date() },
          status: "CONFIRMED",
        },
        take: 5,
        orderBy: { time: "asc" },
        include: { lead: { select: { firstName: true, lastName: true } } },
      }),
      prisma.salesforceConnection.findUnique({
        where: { companyId },
        select: { lastSyncAt: true, lastSyncStatus: true, isActive: true },
      }),
    ]);

    return res.json({
      leads: {
        total: totalLeads,
        new: newLeads,
        nurturing: nurturingLeads,
        appointmentSet: appointmentSetLeads,
        closedWon: closedWonLeads,
      },
      campaigns: {
        activeCount: activeCampaignsCount,
      },
      recentActivity: recentTimelineEvents,
      upcomingAppointments,
      crmSyncHealth: salesforceConnection || null,
    });
  } catch (error) {
    console.error("Sales dashboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const exportDashboardCsv = async (req, res) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { type } = req.query; // e.g. "leads"

    if (type === "leads") {
      const leads = await prisma.lead.findMany({
        where: { companyId: req.user.companyId },
        include: { owner: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });

      const flatLeads = leads.map((l) => ({
        ID: l.id,
        FirstName: l.firstName,
        LastName: l.lastName,
        Email: l.email,
        Phone: l.phone,
        Status: l.status,
        Source: l.source,
        Owner: l.owner ? l.owner.name || l.owner.email : "Unassigned",
        CreatedAt: l.createdAt.toISOString(),
      }));

      const csv = await parseAsync(flatLeads);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=leads-export-${new Date().toISOString()}.csv`);
      return res.send(csv);
    }

    return res.status(400).json({ message: "Invalid export type" });
  } catch (error) {
    console.error("Sales dashboard export error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
