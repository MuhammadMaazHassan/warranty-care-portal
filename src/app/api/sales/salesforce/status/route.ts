import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

/**
 * GET /api/sales/salesforce/status
 * Returns the current Salesforce connection status, last sync info, and summary metrics.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const companyId = session.companyId;
    if (!companyId) {
      return NextResponse.json({ message: "No company associated" }, { status: 403 });
    }

    const connection = await prisma.salesforceConnection.findUnique({
      where: { companyId },
      select: {
        id: true,
        instanceUrl: true,
        environment: true,
        syncInterval: true,
        isActive: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncMessage: true,
        clientId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json({
        connected: false,
        environment: null,
        syncInterval: 15,
        lastSyncAt: null,
        lastSyncStatus: null,
        clientIdMasked: null,
      });
    }

    // Get total synced lead count
    const syncedLeadCount = await prisma.lead.count({
      where: { companyId, source: "SALESFORCE" },
    });

    return NextResponse.json({
      connected: connection.isActive,
      environment: connection.environment,
      instanceUrl: connection.instanceUrl,
      syncInterval: connection.syncInterval,
      lastSyncAt: connection.lastSyncAt,
      lastSyncStatus: connection.lastSyncStatus,
      lastSyncMessage: connection.lastSyncMessage,
      clientIdMasked: connection.clientId
        ? `${connection.clientId.slice(0, 8)}••••${connection.clientId.slice(-4)}`
        : null,
      syncedLeadCount,
      connectedSince: connection.createdAt,
    });
  } catch (error) {
    console.error("[Salesforce Status] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/sales/salesforce/status
 * Update connection settings (sync interval, environment).
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const companyId = session.companyId;
    if (!companyId) {
      return NextResponse.json({ message: "No company associated" }, { status: 403 });
    }

    const body = await request.json();
    const { syncInterval } = body;

    const updateData: Record<string, any> = {};
    if (syncInterval !== undefined) {
      updateData.syncInterval = parseInt(syncInterval, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    await prisma.salesforceConnection.update({
      where: { companyId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Salesforce Status PATCH] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
