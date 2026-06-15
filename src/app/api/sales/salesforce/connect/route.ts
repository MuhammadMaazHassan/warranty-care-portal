import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { SalesforceClient, encrypt } from "@/lib/salesforce-service";

/**
 * POST /api/sales/salesforce/connect
 * SW-CRM-001: Initiate the Salesforce OAuth 2.0 flow.
 * Accepts client credentials, stores them temporarily, returns the authorization URL.
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

    const { clientId, clientSecret, environment } = await request.json();

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { message: "Client ID and Client Secret are required" },
        { status: 400 }
      );
    }

    const env = environment === "production" ? "production" : "sandbox";
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/sales/salesforce/callback`;

    // Encode credentials + companyId into the state parameter for the callback
    const statePayload = JSON.stringify({
      companyId,
      clientId,
      clientSecret: encrypt(clientSecret),
      environment: env,
    });
    const state = Buffer.from(statePayload).toString("base64url");

    const authUrl = SalesforceClient.getAuthorizationUrl({
      clientId,
      redirectUri,
      environment: env,
      state,
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("[Salesforce Connect] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
