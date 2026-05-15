import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        homeowner: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching ticket" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { status, priority } = data;

    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        status: status || undefined,
        priority: priority || undefined,
      },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ message: "Error updating ticket" }, { status: 500 });
  }
}
