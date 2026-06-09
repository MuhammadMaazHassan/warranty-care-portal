import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Initialize Supabase Admin client for auth management
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const homeowners = await prisma.user.findMany({
      where: {
        companyId: session.companyId || "demo-company",
        role: "HOMEOWNER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(homeowners);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "Email already in use" }, { status: 400 });
    }

    // Generate a cryptographically secure random password for database validation
    const systemPassword = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(systemPassword, 10);

    // Create user in Prisma DB only (no login account required)
    const homeowner = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "HOMEOWNER",
        companyId: session.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    return NextResponse.json(homeowner);
  } catch (error) {
    console.error("Failed to create homeowner:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { homeownerId } = await request.json();

    if (!homeownerId) {
      return NextResponse.json({ message: "Missing homeowner ID" }, { status: 400 });
    }

    // Find the homeowner record
    const homeowner = await prisma.user.findFirst({
      where: { id: homeownerId, companyId: session.companyId, role: "HOMEOWNER" }
    });

    if (!homeowner) {
      return NextResponse.json({ message: "Homeowner not found" }, { status: 404 });
    }

    // 1. Delete from Supabase Auth
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const supabaseUser = usersData.users.find(u => u.email === homeowner.email);

    if (supabaseUser) {
      await supabaseAdmin.auth.admin.deleteUser(supabaseUser.id);
    }

    // 2. Delete from Prisma DB
    await prisma.user.delete({
      where: { id: homeownerId },
    });

    return NextResponse.json({ message: "Homeowner deleted" });
  } catch (error) {
    console.error("Failed to delete homeowner:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
