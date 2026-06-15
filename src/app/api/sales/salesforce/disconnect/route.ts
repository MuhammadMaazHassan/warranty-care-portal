import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

/**
 * POST /api/sales/salesforce/disconnect
 * SW-CRM-003: Disconnect from Salesforce.
 * Deactivates the connection and clears tokens.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const companyId = session.companyId;
    if (!companyId) {
      return NextResponse.json({ message: "No company associated" }, { status: 403 });
    }

    const connection = await prisma.salesforceConnection.findUnique({
      where: { companyId },
    });

    if (!connection) {
      return NextResponse.json({ message: "No Salesforce connection found" }, { status: 404 });
    }

    // Deactivate and clear sensitive tokens
    await prisma.salesforceConnection.update({
      where: { companyId },
      data: {
        isActive: false,
        accessToken: "",
        refreshToken: "",
      },
    });

    // Log the disconnection
    await prisma.syncLog.create({
      data: {
        companyId,
        direction: "INBOUND",
        action: "OAUTH_DISCONNECT",
        status: "SUCCESS",
        message: "Salesforce connection disconnected by admin.",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Salesforce Disconnect] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
