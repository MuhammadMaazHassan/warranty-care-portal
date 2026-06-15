import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ComplianceService } from "@/lib/compliance-service";


export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { sender, body, channel, companyId } = data;

    if (!sender || !body || !channel || !companyId) {
      return NextResponse.json(
        { message: "Missing required parameters: sender, body, channel, companyId" },
        { status: 400 }
      );
    }

    if (channel !== "SMS" && channel !== "EMAIL") {
      return NextResponse.json({ message: "Channel must be either 'SMS' or 'EMAIL'" }, { status: 400 });
    }

    // 1. Process via Compliance Service keywords
    const result = await ComplianceService.handleInboundKeyword(companyId, sender, body, channel);

    if (result.isComplianceAction) {
      return NextResponse.json({
        success: true,
        isComplianceAction: true,
        replyText: result.replyText,
        message: "Inbound message processed as a compliance keywords transaction",
      });
    }

    // 2. If it's NOT a compliance action, log as a standard inbound reply on the lead timeline
    const isSms = channel === "SMS";
    const normalizedContact = isSms
      ? sender.replace(/\D/g, "")
      : sender.trim().toLowerCase();

    // Find the lead(s) for this company matching the contact info
    const leads = await prisma.lead.findMany({
      where: {
        companyId,
        OR: [
          { email: normalizedContact },
          { phone: { contains: normalizedContact.slice(-10) } },
        ],
      },
    });

    if (leads.length > 0) {
      for (const lead of leads) {
        await prisma.leadTimeline.create({
          data: {
            leadId: lead.id,
            type: "REPLY_RECEIVED",
            description: `Received inbound ${channel.toLowerCase()} reply: "${body.slice(0, 150)}${body.length > 150 ? "..." : ""}"`,
            metadata: { body, channel, sender },
          },
        });
      }

      return NextResponse.json({
        success: true,
        isComplianceAction: false,
        processed: true,
        leadsMatched: leads.length,
        message: "Logged inbound reply on lead timeline",
      });
    }

    return NextResponse.json({
      success: true,
      isComplianceAction: false,
      processed: false,
      message: "No matching lead found to attach this reply to",
    });
  } catch (error: any) {
    console.error("[Inbound Webhook] Error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
