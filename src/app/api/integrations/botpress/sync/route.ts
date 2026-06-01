import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { syncTicketToERP } from "@/lib/erp-service";

// Helper to check authentication
function isAuthorized(request: Request): boolean {
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");

  const secret = process.env.BOTPRESS_API_SECRET || process.env.SESSION_SECRET || "super_secret_key_change_me_in_production";

  if (secretParam === secret) return true;
  if (apiKeyHeader === secret) return true;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token === secret) return true;
  }

  return false;
}

export async function POST(request: Request) {
  try {
    // 1. Verify Authentication
    if (!isAuthorized(request)) {
      return NextResponse.json({ message: "Unauthorized integration request" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      ticketId, 
      status, 
      priority, 
      isEmergency, 
      draftResponse,
      description,
      chatSummary,
      summary,
      extractedInfo,
      specificInfo
    } = body;

    if (!ticketId) {
      return NextResponse.json({ 
        message: "ticketId is required to perform sync operations" 
      }, { status: 400 });
    }

    // 2. Resolve Ticket
    let ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return NextResponse.json({ 
        message: `Ticket not found: ${ticketId}` 
      }, { status: 404 });
    }

    // 3. Update Ticket fields if specified
    const updatedData: any = {};
    if (status) updatedData.status = status;
    if (priority) updatedData.priority = priority;
    if (isEmergency !== undefined) {
      updatedData.isEmergency = !!isEmergency;
      if (isEmergency) {
        updatedData.priority = "URGENT";
        updatedData.status = "ESCALATED";
      }
    }
    if (draftResponse !== undefined) {
      updatedData.draftResponse = draftResponse;
    }
    if (description !== undefined) {
      updatedData.description = description;
    }
    const finalSummary = chatSummary || summary;
    if (finalSummary !== undefined) {
      updatedData.chatSummary = finalSummary;
    }
    const finalExtracted = extractedInfo || specificInfo;
    if (finalExtracted !== undefined) {
      updatedData.extractedInfo = typeof finalExtracted === "object" ? JSON.stringify(finalExtracted) : String(finalExtracted);
    }

    if (Object.keys(updatedData).length > 0) {
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: updatedData
      });

      // Trigger ERP synchronization if resolved
      if (ticket.erpSyncStatus === "SYNCED" || status === "RESOLVED") {
        try {
          await syncTicketToERP(ticket.id);
        } catch (erpError) {
          console.error(`[Orchestration Sync] Automated ERP sync update failed for Ticket #${ticket.id}:`, erpError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      ticketStatus: ticket.status,
      ticketPriority: ticket.priority,
      isEmergency: ticket.isEmergency,
    });

  } catch (error: any) {
    console.error("[Orchestration Sync] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
