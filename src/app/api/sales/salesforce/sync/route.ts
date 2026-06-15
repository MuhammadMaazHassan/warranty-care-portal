import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import {
  getAuthenticatedClient,
  mapSalesforceRecordToLead,
  DEFAULT_FIELD_MAPPINGS,
} from "@/lib/salesforce-service";

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

    const auth = await getAuthenticatedClient(companyId);
    if (!auth) {
      return NextResponse.json(
        { message: "No active Salesforce connection." },
        { status: 400 }
      );
    }

    const { client, connection } = auth;

    // Fetch field mappings
    const mappings = await prisma.salesforceFieldMapping.findMany({
      where: { companyId, isActive: true },
    });
    const activeMappings = mappings.length > 0 ? mappings : DEFAULT_FIELD_MAPPINGS.map(m => ({
      ...m, isConsentField: m.isConsentField || false,
    }));

    // Build SOQL with SystemModstamp filter for incremental fetch
    const sfFields = ["Id", "SystemModstamp", ...activeMappings.map(m => m.salesforceField)];
    const uniqueFields = [...new Set(sfFields)];

    let soql = `SELECT ${uniqueFields.join(", ")} FROM Lead`;

    if (connection.lastSyncAt) {
      const lastSync = connection.lastSyncAt.toISOString().replace("Z", "+00:00");
      soql += ` WHERE SystemModstamp > ${lastSync}`;
    }

    soql += " ORDER BY SystemModstamp ASC";

    // Fetch via REST API (incremental syncs are typically smaller)
    let allRecords: Record<string, any>[] = [];
    let result = await client.query(soql);
    allRecords = result.records;

    while (!result.done && result.nextRecordsUrl) {
      result = await client.queryMore(result.nextRecordsUrl);
      allRecords.push(...result.records);
    }

    if (allRecords.length === 0) {
      // No changes since last sync
      await prisma.salesforceConnection.update({
        where: { companyId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "SUCCESS",
          lastSyncMessage: "No new or modified records found.",
        },
      });

      await prisma.syncLog.create({
        data: {
          companyId,
          direction: "INBOUND",
          action: "INCREMENTAL_SYNC",
          status: "SUCCESS",
          recordCount: 0,
          message: "No new or modified records found.",
        },
      });

      return NextResponse.json({
        success: true,
        totalProcessed: 0,
        message: "No new or modified records found.",
      });
    }

    // Process and upsert leads
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const sfRecord of allRecords) {
      try {
        const leadData = mapSalesforceRecordToLead(sfRecord, activeMappings as any);

        if (!leadData.firstName || !leadData.lastName) {
          errorCount++;
          errors.push(`Missing required fields for record ${sfRecord.Id || "unknown"}`);
          continue;
        }

        const externalId = leadData.externalId;
        delete leadData.externalId;

        const existing = externalId
          ? await prisma.lead.findFirst({
            where: { companyId, externalId },
          })
          : null;

        if (existing) {
          await prisma.lead.update({
            where: { id: existing.id },
            data: {
              ...leadData,
              source: "SALESFORCE",
              timeline: {
                create: {
                  type: "SYNC_UPDATE",
                  description: "Lead updated via Salesforce incremental sync",
                },
              },
            },
          });
          updatedCount++;
        } else {
          await prisma.lead.create({
            data: {
              companyId,
              source: "SALESFORCE",
              externalId: externalId || null,
              firstName: leadData.firstName,
              lastName: leadData.lastName,
              email: leadData.email || null,
              phone: leadData.phone || null,
              street: leadData.street || null,
              city: leadData.city || null,
              state: leadData.state || null,
              zipCode: leadData.zipCode || null,
              status: leadData.status || "New",
              emailOptIn: leadData.emailOptIn ?? false,
              smsOptIn: leadData.smsOptIn ?? false,
              consentSource: leadData.emailOptIn || leadData.smsOptIn ? "Salesforce Sync" : null,
              consentTimestamp: leadData.emailOptIn || leadData.smsOptIn ? new Date() : null,
              customFields: leadData.customFields || null,
              timeline: {
                create: {
                  type: "IMPORT",
                  description: "Lead imported via Salesforce incremental sync",
                },
              },
            },
          });
          createdCount++;
        }
      } catch (recordError: any) {
        errorCount++;
        errors.push(recordError.message || "Unknown error");
      }
    }

    const syncStatus = errorCount > 0 && (createdCount + updatedCount) > 0
      ? "WARNING"
      : errorCount > 0
        ? "ERROR"
        : "SUCCESS";

    const message = `Incremental sync complete. Created: ${createdCount}, Updated: ${updatedCount}, Errors: ${errorCount}`;

    await prisma.salesforceConnection.update({
      where: { companyId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: syncStatus,
        lastSyncMessage: message,
      },
    });

    await prisma.syncLog.create({
      data: {
        companyId,
        direction: "INBOUND",
        action: "INCREMENTAL_SYNC",
        status: syncStatus,
        recordCount: createdCount + updatedCount,
        errorCount,
        message,
        metadata: errors.length > 0 ? { errors: errors.slice(0, 50) } : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      totalProcessed: allRecords.length,
      createdCount,
      updatedCount,
      errorCount,
      status: syncStatus,
      message,
    });
  } catch (error: any) {
    console.error("[Salesforce Sync] Error:", error);

    try {
      const session = await getServerSession(request);
      if (session?.companyId) {
        await prisma.syncLog.create({
          data: {
            companyId: session.companyId,
            direction: "INBOUND",
            action: "INCREMENTAL_SYNC",
            status: "ERROR",
            message: error.message || "Incremental sync failed",
          },
        });
        await prisma.salesforceConnection.update({
          where: { companyId: session.companyId },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: "ERROR",
            lastSyncMessage: error.message || "Incremental sync failed",
          },
        });
      }
    } catch {
      // Swallow secondary logging errors
    }

    return NextResponse.json(
      { message: error.message || "Incremental sync failed" },
      { status: 500 }
    );
  }
}
