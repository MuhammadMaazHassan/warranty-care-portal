import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SalesforceClient, encrypt, decrypt, seedDefaultMappings } from "@/lib/salesforce-service";

/**
 * GET /api/sales/salesforce/callback
 * SW-CRM-002: OAuth 2.0 callback handler.
 * Receives the authorization code from Salesforce, exchanges it for tokens,
 * persists the SalesforceConnection record, and seeds default field mappings.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    // Handle OAuth errors from Salesforce
    if (error) {
      console.error(`[Salesforce Callback] OAuth error: ${error} — ${errorDescription}`);
      return NextResponse.redirect(
        `${baseUrl}/sales/settings?sf_error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(`${baseUrl}/sales/settings?sf_error=missing_code`);
    }

    // Decode the state parameter to get credentials
    let stateData: {
      companyId: string;
      clientId: string;
      clientSecret: string;
      environment: "production" | "sandbox";
    };

    try {
      const decoded = Buffer.from(stateParam, "base64url").toString("utf-8");
      stateData = JSON.parse(decoded);
    } catch {
      return NextResponse.redirect(`${baseUrl}/sales/settings?sf_error=invalid_state`);
    }

    const { companyId, clientId, clientSecret: encryptedSecret, environment } = stateData;
    const clientSecret = decrypt(encryptedSecret);
    const redirectUri = `${baseUrl}/api/sales/salesforce/callback`;

    // Exchange the authorization code for tokens
    const tokenResponse = await SalesforceClient.exchangeCodeForTokens({
      code,
      clientId,
      clientSecret,
      redirectUri,
      environment,
    });

    // Calculate token expiry (Salesforce access tokens expire in ~2 hours)
    const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    // Upsert the SalesforceConnection record
    await prisma.salesforceConnection.upsert({
      where: { companyId },
      create: {
        companyId,
        instanceUrl: tokenResponse.instance_url,
        accessToken: encrypt(tokenResponse.access_token),
        refreshToken: encrypt(tokenResponse.refresh_token),
        tokenExpiresAt,
        environment,
        clientId,
        clientSecret: encrypt(clientSecret),
        isActive: true,
      },
      update: {
        instanceUrl: tokenResponse.instance_url,
        accessToken: encrypt(tokenResponse.access_token),
        refreshToken: encrypt(tokenResponse.refresh_token),
        tokenExpiresAt,
        environment,
        clientId,
        clientSecret: encrypt(clientSecret),
        isActive: true,
      },
    });

    // Seed default field mappings if none exist
    await seedDefaultMappings(companyId);

    // Create a sync log entry for the connection event
    await prisma.syncLog.create({
      data: {
        companyId,
        direction: "INBOUND",
        action: "OAUTH_CONNECT",
        status: "SUCCESS",
        message: `Successfully connected to Salesforce (${environment}) at ${tokenResponse.instance_url}`,
      },
    });

    // Redirect back to the settings page with success indicator
    return NextResponse.redirect(`${baseUrl}/sales/settings?connected=true`);
  } catch (error: any) {
    console.error("[Salesforce Callback] Error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/sales/settings?sf_error=${encodeURIComponent(error.message || "token_exchange_failed")}`
    );
  }
}
