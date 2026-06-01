import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(request);
    
    // Only Admin can fetch all companies
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Fetch all companies along with their user counts and integration counts
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: {
            users: true,
            integrations: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ message: "Error fetching companies" }, { status: 500 });
  }
}
