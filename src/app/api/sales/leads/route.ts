import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const tag = searchParams.get("tag") || "all";

    // Enforce workspace-level scoping
    const companyId = session.companyId;
    if (!companyId) {
      return NextResponse.json({ message: "User is not associated with a company." }, { status: 403 });
    }

    const where: any = { companyId };

    // Role-based lead visibility scoping:
    // Homeowners see their own uploaded leads. Admins/Staff see all leads of the tenant.
    if (session.role === "HOMEOWNER") {
      where.ownerId = session.id;
    }

    // Status filter
    if (status !== "all") {
      where.status = status;
    }

    // Tag filter (Postgres array contains check)
    if (tag !== "all") {
      where.tags = { has: tag };
    }

    // Search query mapping (First Name, Last Name, Email, Phone)
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        owner: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Fetch leads error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.companyId;
    if (!companyId) {
      return NextResponse.json({ message: "User is not associated with a company." }, { status: 403 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      street,
      city,
      state,
      zipCode,
      status,
      tags,
      emailOptIn,
      smsOptIn,
      consentSource,
      customFields,
    } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ message: "First name and last name are required." }, { status: 400 });
    }

    // Create lead with manual source
    const lead = await prisma.lead.create({
      data: {
        companyId,
        source: "MANUAL",
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        street: street || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        status: status || "New",
        ownerId: session.id, // Assigned to creator
        tags: tags || [],
        emailOptIn: !!emailOptIn,
        smsOptIn: !!smsOptIn,
        consentSource: consentSource || (emailOptIn || smsOptIn ? "Manual Form" : null),
        consentTimestamp: emailOptIn || smsOptIn ? new Date() : null,
        customFields: customFields || null,
        timeline: {
          create: {
            type: "IMPORT",
            description: `Lead created manually by ${session.name || session.email}`,
          },
        },
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
