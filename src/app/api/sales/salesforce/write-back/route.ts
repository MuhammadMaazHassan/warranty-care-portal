import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { getAuthenticatedClient } from "@/lib/salesforce-service";

/**
 * POST /api/sales/salesforce/write-back
 * SW-CRM-006: Write lead status changes back to Salesforce.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const companyId = session.companyId;
    if (!companyId) {
      return NextResponse.json({ message: "No company associated" }, { status: 403 });
    }

    const { leadId } = await request.json();
    if (!leadId) {
      return NextResponse.json({ message: "leadId is required" }, { status: 400 });
    }

    // Find the lead and verify it has a Salesforce external ID
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, companyId },
    });

    if (!lead) {
      return NextResponse.json({ message: "Lead not found" }, { status: 404 });
    }

    if (!lead.externalId) {
      return NextResponse.json(
        { message: "Lead has no Salesforce external ID — it was not synced from Salesforce." },
        { status: 400 }
      );
    }

    const auth = await getAuthenticatedClient(companyId);
    if (!auth) {
      return NextResponse.json(
        { message: "No active Salesforce connection." },
        { status: 400 }
      );
    }

    const { client } = auth;

    // Build the write-back payload (status changes)
    const sfUpdatePayload: Record<string, any> = {};

    // Map portal status to Salesforce Status field
    if (lead.status) {
      sfUpdatePayload.Status = lead.status;
    }

    // Write back consent fields
    if (lead.emailOptIn !== undefined) {
      sfUpdatePayload.HasOptedOutOfEmail = !lead.emailOptIn; // Inverted
    }

    try {
      await client.updateRecord("Lead", lead.externalId, sfUpdatePayload);

      // Log success
      await prisma.syncLog.create({
        data: {
          companyId,
          direction: "OUTBOUND",
          action: "WRITE_BACK",
          status: "SUCCESS",
          recordCount: 1,
          message: `Lead ${lead.firstName} ${lead.lastName} (${lead.externalId}) written back to Salesforce`,
        },
      });

      // Add timeline entry
      await prisma.leadTimeline.create({
        data: {
          leadId: lead.id,
          type: "SYNC_UPDATE",
          description: `Status written back to Salesforce by ${session.name || session.email}`,
          metadata: { direction: "OUTBOUND", sfFields: Object.keys(sfUpdatePayload) },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully wrote back changes for ${lead.firstName} ${lead.lastName}`,
      });
    } catch (sfError: any) {
      // Log the Salesforce API error
      await prisma.syncLog.create({
        data: {
          companyId,
          direction: "OUTBOUND",
          action: "WRITE_BACK",
          status: "ERROR",
          errorCount: 1,
          message: `Write-back failed for ${lead.externalId}: ${sfError.message}`,
        },
      });

      return NextResponse.json(
        { message: `Salesforce write-back failed: ${sfError.message}` },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("[Salesforce Write-back] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
