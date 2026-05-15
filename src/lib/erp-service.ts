import prisma from "@/lib/prisma";

export type ERPType = "BUILTOPIA" | "BUILDERTREND" | "HYPHEN";

export interface ERPConfig {
  apiKey: string;
  secretKey?: string;
  environment: string;
}

/**
 * Builtopia API Client (Simulation)
 */
class BuiltopiaClient {
  constructor(private config: ERPConfig) {}

  async syncTicket(ticket: any) {
    console.log(`[Builtopia] Syncing ticket ${ticket.id} using API Key: ${this.config.apiKey.substring(0, 4)}...`);
    // Simulate real API network latency
    await new Promise((r) => setTimeout(r, 1500));
    
    // In a real app, this would be a fetch() call to Builtopia's production/sandbox API
    // return fetch("https://api.builtopia.com/v1/tickets", { ... })
    
    return {
      success: true,
      remoteId: `BT-${Math.floor(Math.random() * 10000)}`,
    };
  }

  async testConnection() {
    return !!this.config.apiKey;
  }
}

export class ERPIntegrationService {
  static async getActiveIntegration(companyId: string) {
    const integration = await prisma.integration.findFirst({
      where: { companyId, isActive: true },
    });
    return integration;
  }

  static async syncTicketToERP(ticketId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { 
        homeowner: {
          include: { company: true }
        } 
      },
    });

    if (!ticket) throw new Error("Ticket not found");

    // Get integration credentials for the company
    const companyId = ticket.homeowner.companyId || "demo-company";
    const integration = await this.getActiveIntegration(companyId);

    if (!integration) {
      console.warn(`[ERP Sync] No active integration found for company ${companyId}`);
      return false;
    }

    const config: ERPConfig = {
      apiKey: integration.apiKey,
      secretKey: integration.secretKey || undefined,
      environment: integration.environment,
    };

    let result;
    if (integration.platform === "BUILTOPIA") {
      const client = new BuiltopiaClient(config);
      result = await client.syncTicket(ticket);
    } else {
      // Buildertrend and Hyphen would go here
      console.log(`[ERP Sync] Platform ${integration.platform} not yet fully implemented, simulating...`);
      await new Promise(r => setTimeout(r, 1000));
      result = { success: true, remoteId: "EXT-MOCK-123" };
    }

    if (result.success) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          erpSyncStatus: "SYNCED",
          erpReferenceId: result.remoteId,
        },
      });
      return true;
    }

    return false;
  }
}
