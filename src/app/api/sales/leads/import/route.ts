import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

interface ImportLead {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  tags?: string[];
  emailOptIn?: boolean;
  smsOptIn?: boolean;
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
    const { leadsList, mergeStrategy, attested } = body as {
      leadsList: ImportLead[];
      mergeStrategy: "skip" | "update" | "create";
      attested: boolean;
    };

    // 1. Consent Attestation check (SW-CSV-005)
    if (!attested) {
      return NextResponse.json({ message: "You must attest that contacts have consented to be contacted." }, { status: 400 });
    }

    if (!leadsList || !Array.isArray(leadsList)) {
      return NextResponse.json({ message: "Invalid lead list payload." }, { status: 400 });
    }

    // 2. Homeowner limits validation (SW-CSV-006)
    if (session.role === "HOMEOWNER") {
      const existingCount = await prisma.lead.count({
        where: { ownerId: session.id },
      });
      const limit = 500;
      if (existingCount + leadsList.length > limit) {
        return NextResponse.json({
          message: `Homeowner accounts are limited to a maximum of ${limit} leads total. You currently have ${existingCount} leads and are trying to import ${leadsList.length}.`
        }, { status: 400 });
      }
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; name: string; reason: string }> = [];

    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Process leads sequentially (or batch-resolved for speed)
    for (let i = 0; i < leadsList.length; i++) {
      const rowNum = i + 1;
      const rawLead = leadsList[i];
      const {
        firstName,
        lastName,
        email,
        phone,
        street,
        city,
        state,
        zipCode,
        tags,
        emailOptIn,
        smsOptIn,
      } = rawLead;

      // Ingestion validation (SW-LEAD-002)
      if (!firstName || !lastName) {
        errors.push({ row: rowNum, name: `${firstName || ""} ${lastName || ""}`, reason: "First name and last name are required." });
        continue;
      }

      if (email && !emailRegex.test(email)) {
        errors.push({ row: rowNum, name: `${firstName} ${lastName}`, reason: `Invalid email format: ${email}` });
        continue;
      }

      // Check duplicates inside tenant/company by email or phone (SW-LEAD-003)
      let duplicateLead = null;
      if (email || phone) {
        duplicateLead = await prisma.lead.findFirst({
          where: {
            companyId,
            OR: [
              email ? { email } : undefined,
              phone ? { phone } : undefined,
            ].filter(Boolean) as any,
          },
        });
      }

      const optInSource = emailOptIn || smsOptIn ? "CSV Import Opt-in Column" : null;
      const optInTimestamp = emailOptIn || smsOptIn ? new Date() : null;

      if (duplicateLead) {
        if (mergeStrategy === "skip") {
          skippedCount++;
          continue;
        } else if (mergeStrategy === "update") {
          // Update details on existing record
          await prisma.lead.update({
            where: { id: duplicateLead.id },
            data: {
              firstName,
              lastName,
              street: street || duplicateLead.street,
              city: city || duplicateLead.city,
              state: state || duplicateLead.state,
              zipCode: zipCode || duplicateLead.zipCode,
              tags: Array.from(new Set([...(duplicateLead.tags || []), ...(tags || [])])),
              emailOptIn: emailOptIn !== undefined ? !!emailOptIn : duplicateLead.emailOptIn,
              smsOptIn: smsOptIn !== undefined ? !!smsOptIn : duplicateLead.smsOptIn,
              consentSource: optInSource || duplicateLead.consentSource,
              consentTimestamp: optInTimestamp || duplicateLead.consentTimestamp,
              timeline: {
                create: {
                  type: "SYNC_UPDATE",
                  description: `Lead details updated via CSV import by ${session.name || session.email}`,
                },
              },
            },
          });
          updatedCount++;
          continue;
        }
      }

      // Create new lead
      await prisma.lead.create({
        data: {
          companyId,
          source: "CSV",
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          street: street || null,
          city: city || null,
          state: state || null,
          zipCode: zipCode || null,
          status: "New",
          ownerId: session.id,
          tags: tags || [],
          emailOptIn: !!emailOptIn,
          smsOptIn: !!smsOptIn,
          consentSource: optInSource,
          consentTimestamp: optInTimestamp,
          timeline: {
            create: {
              type: "IMPORT",
              description: `Lead imported via CSV file by ${session.name || session.email}`,
            },
          },
        },
      });

      createdCount++;
    }

    return NextResponse.json({
      totalProcessed: leadsList.length,
      createdCount,
      updatedCount,
      skippedCount,
      errorsCount: errors.length,
      errors,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
