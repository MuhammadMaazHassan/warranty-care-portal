import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

/**
 * GET /api/sales/salesforce/logs
 * SW-CRM-008: Return paginated sync logs for the company (audit trail).
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const direction = searchParams.get("direction"); // "INBOUND" | "OUTBOUND" | null

    const where: any = { companyId };
    if (direction && (direction === "INBOUND" || direction === "OUTBOUND")) {
      where.direction = direction;
    }

    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.syncLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Salesforce Logs] GET Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
