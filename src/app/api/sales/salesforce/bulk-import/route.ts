import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import {
  getAuthenticatedClient,
  mapSalesforceRecordToLead,
  parseBulkCSV,
  DEFAULT_FIELD_MAPPINGS,
} from "@/lib/salesforce-service";

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

    const auth = await getAuthenticatedClient(companyId);
    if (!auth) {
      return NextResponse.json(
        { message: "No active Salesforce connection. Please connect first." },
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

    // Build the SOQL query from the active mappings
    const sfFields = ["Id", ...activeMappings.map(m => m.salesforceField)];
    const uniqueFields = [...new Set(sfFields)];
    const soql = `SELECT ${uniqueFields.join(", ")} FROM Lead`;

    let allRecords: Record<string, any>[] = [];
    let usedBulkApi = false;

    try {
      // Try Bulk API 2.0 first for large datasets
      const job = await client.createBulkQueryJob(soql);

      // Poll for job completion (max 60 seconds)
      let jobStatus = job;
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        jobStatus = await client.getBulkJobStatus(job.id);
        if (jobStatus.state === "JobComplete") break;
        if (jobStatus.state === "Failed" || jobStatus.state === "Aborted") {
          throw new Error(`Bulk job ${jobStatus.state}`);
        }
      }

      if (jobStatus.state === "JobComplete") {
        const csvResults = await client.getBulkQueryResults(job.id);
        allRecords = parseBulkCSV(csvResults);
        usedBulkApi = true;
      } else {
        throw new Error("Bulk job timed out");
      }
    } catch (bulkError) {
      // Fallback to REST API if Bulk fails
      console.warn("[Salesforce Bulk] Falling back to REST API:", bulkError);
      let result = await client.query(soql);
      allRecords = result.records;

      // Handle pagination
      while (!result.done && result.nextRecordsUrl) {
        result = await client.queryMore(result.nextRecordsUrl);
        allRecords.push(...result.records);
      }
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
          errors.push(`Missing required fields for SF record ${sfRecord.Id || "unknown"}`);
          continue;
        }

        const externalId = leadData.externalId;
        delete leadData.externalId;

        // Upsert: check if lead with this externalId exists
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
                  description: "Lead updated via Salesforce Bulk API import",
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
                  description: "Lead imported via Salesforce Bulk API",
                },
              },
            },
          });
          createdCount++;
        }
      } catch (recordError: any) {
        errorCount++;
        errors.push(recordError.message || "Unknown error processing record");
      }
    }

    // Determine sync status
    const syncStatus = errorCount > 0 && (createdCount + updatedCount) > 0
      ? "WARNING"
      : errorCount > 0
        ? "ERROR"
        : "SUCCESS";

    const message = `Bulk import complete${usedBulkApi ? " (Bulk API 2.0)" : " (REST API)"}. Created: ${createdCount}, Updated: ${updatedCount}, Errors: ${errorCount}`;

    // Update connection sync status
    await prisma.salesforceConnection.update({
      where: { companyId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: syncStatus,
        lastSyncMessage: message,
      },
    });

    // Create sync log
    await prisma.syncLog.create({
      data: {
        companyId,
        direction: "INBOUND",
        action: "BULK_IMPORT",
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
    console.error("[Salesforce Bulk Import] Error:", error);

    // Log the failure
    try {
      const session = await getServerSession(request);
      if (session?.companyId) {
        await prisma.syncLog.create({
          data: {
            companyId: session.companyId,
            direction: "INBOUND",
            action: "BULK_IMPORT",
            status: "ERROR",
            message: error.message || "Bulk import failed",
          },
        });
        await prisma.salesforceConnection.update({
          where: { companyId: session.companyId },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: "ERROR",
            lastSyncMessage: error.message || "Bulk import failed",
          },
        });
      }
    } catch {
      // Swallow secondary logging errors
    }

    return NextResponse.json(
      { message: error.message || "Bulk import failed" },
      { status: 500 }
    );
  }
}
