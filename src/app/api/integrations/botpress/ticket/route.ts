import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateWarrantyYear } from "@/lib/utils";
import { generateTicketId } from "@/lib/ticket-utils";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      email, 
      propertyId, 
      issueType, 
      description, 
      isEmergency = false, 
      priority, 
      kbReferences = []
    } = data;

    if (!email || !issueType || !description) {
      return NextResponse.json(
        { message: "email, issueType, and description are required fields" },
        { status: 400 }
      );
    }

    // 1. Resolve homeowner
    const homeowner = await prisma.user.findUnique({
      where: { email },
      include: { properties: true }
    });

    if (!homeowner) {
      return NextResponse.json(
        { message: `Homeowner with email ${email} not found` },
        { status: 404 }
      );
    }

    // 2. Resolve property
    let selectedPropertyId = propertyId;
    let warrantyYear = 1;

    if (!selectedPropertyId && homeowner.properties.length > 0) {
      selectedPropertyId = homeowner.properties[0].id;
    }

    if (selectedPropertyId) {
      const property = homeowner.properties.find(p => p.id === selectedPropertyId) 
        || await prisma.property.findUnique({ where: { id: selectedPropertyId } });
        
      if (property && property.coeDate) {
        warrantyYear = calculateWarrantyYear(property.coeDate);
      }
    }

    // 3. Resolve ticket priority
    let ticketPriority = priority || "MEDIUM";
    if (isEmergency) {
      ticketPriority = "URGENT";
    }

    // 4. Create the Ticket
    const ticketId = await generateTicketId();
    const ticket = await prisma.ticket.create({
      data: {
        id: ticketId,
        issueType,
        description,
        chatSummary: data.chatSummary || data.summary || null,
        extractedInfo: data.extractedInfo 
          ? (typeof data.extractedInfo === "object" ? JSON.stringify(data.extractedInfo) : String(data.extractedInfo))
          : (data.specificInfo ? (typeof data.specificInfo === "object" ? JSON.stringify(data.specificInfo) : String(data.specificInfo)) : null),
        kbReferences: kbReferences && Array.isArray(kbReferences) && kbReferences.length > 0 ? JSON.stringify(kbReferences) : null,
        propertyId: selectedPropertyId || null,
        homeownerId: homeowner.id,
        isEmergency,
        priority: ticketPriority,
        warrantyYear,
        erpSyncStatus: "PENDING"
      }
    });

    console.log(`[BOTPRESS INTEGRATION] Ticket #${ticket.id} generated successfully for ${email}`);

    return NextResponse.json({
      success: true,
      message: "Ticket created successfully",
      ticketId: ticket.id,
      warrantyYear
    });

  } catch (error) {
    console.error("Botpress ticket generation error:", error);
    return NextResponse.json(
      { message: "Internal server error during ticket generation" },
      { status: 500 }
    );
  }
}
