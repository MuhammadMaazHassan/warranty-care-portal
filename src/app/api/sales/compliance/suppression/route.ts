import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

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
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
    const search = searchParams.get("search") || "";

    const where: any = { companyId };
    if (search) {
      where.value = { contains: search, mode: "insensitive" };
    }

    const [suppressedItems, total] = await Promise.all([
      prisma.suppressionList.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.suppressionList.count({ where }),
    ]);

    return NextResponse.json({
      suppressedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Suppression GET] Error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { value, reason } = body;

    if (!value || typeof value !== "string") {
      return NextResponse.json({ message: "Invalid value parameter" }, { status: 400 });
    }

    // Normalize: lowercase if email, digits-only if phone number
    const isEmail = value.includes("@");
    const normalizedValue = isEmail
      ? value.trim().toLowerCase()
      : value.replace(/\D/g, "");

    if (!normalizedValue) {
      return NextResponse.json({ message: "Value cannot be empty after normalization" }, { status: 400 });
    }

    // Upsert suppression list record
    const item = await prisma.suppressionList.upsert({
      where: {
        companyId_value: {
          companyId,
          value: normalizedValue,
        },
      },
      create: {
        companyId,
        value: normalizedValue,
        reason: reason || "UNSUBSCRIBE",
      },
      update: {
        reason: reason || "UNSUBSCRIBE",
      },
    });

    // Automatically set corresponding Lead consent to false if a matching Lead exists
    if (isEmail) {
      await prisma.lead.updateMany({
        where: { companyId, email: normalizedValue },
        data: {
          emailOptIn: false,
          consentSource: "Manual Suppression",
          consentTimestamp: new Date(),
        },
      });
    } else {
      await prisma.lead.updateMany({
        where: {
          companyId,
          phone: { contains: normalizedValue.slice(-10) },
        },
        data: {
          smsOptIn: false,
          consentSource: "Manual Suppression",
          consentTimestamp: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error("[Suppression POST] Error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const companyId = session.companyId;
    if (!companyId) {
      return NextResponse.json({ message: "No company associated" }, { status: 403 });
    }

    const body = await request.json();
    const { id, value } = body;

    if (!id && !value) {
      return NextResponse.json({ message: "Must provide either id or value" }, { status: 400 });
    }

    if (id) {
      // Find item first to ensure tenant boundaries
      const existing = await prisma.suppressionList.findUnique({
        where: { id },
      });

      if (!existing || existing.companyId !== companyId) {
        return NextResponse.json({ message: "Record not found or unauthorized" }, { status: 404 });
      }

      await prisma.suppressionList.delete({
        where: { id },
      });
    } else {
      const isEmail = value.includes("@");
      const normalizedValue = isEmail
        ? value.trim().toLowerCase()
        : value.replace(/\D/g, "");

      try {
        await prisma.suppressionList.delete({
          where: {
            companyId_value: {
              companyId,
              value: normalizedValue,
            },
          },
        });
      } catch (e) {
        return NextResponse.json({ message: "Record not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Suppression DELETE] Error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
