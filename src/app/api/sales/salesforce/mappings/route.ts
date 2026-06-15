import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

/**
 * GET /api/sales/salesforce/mappings
 * SW-CRM-007: Return all field mappings for the company.
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

    const mappings = await prisma.salesforceFieldMapping.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(mappings);
  } catch (error) {
    console.error("[Salesforce Mappings] GET Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/sales/salesforce/mappings
 * Create or update a field mapping.
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

    const { salesforceField, portalField, description, isActive, isConsentField } =
      await request.json();

    if (!salesforceField || !portalField) {
      return NextResponse.json(
        { message: "salesforceField and portalField are required" },
        { status: 400 }
      );
    }

    const mapping = await prisma.salesforceFieldMapping.upsert({
      where: {
        companyId_salesforceField: {
          companyId,
          salesforceField,
        },
      },
      create: {
        companyId,
        salesforceField,
        portalField,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        isConsentField: isConsentField || false,
      },
      update: {
        portalField,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        isConsentField: isConsentField || false,
      },
    });

    return NextResponse.json(mapping);
  } catch (error) {
    console.error("[Salesforce Mappings] POST Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/sales/salesforce/mappings
 * Remove a field mapping.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const companyId = session.companyId;
    if (!companyId) {
      return NextResponse.json({ message: "No company associated" }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ message: "Mapping id is required" }, { status: 400 });
    }

    // Verify the mapping belongs to this company
    const mapping = await prisma.salesforceFieldMapping.findFirst({
      where: { id, companyId },
    });

    if (!mapping) {
      return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
    }

    await prisma.salesforceFieldMapping.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Salesforce Mappings] DELETE Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
