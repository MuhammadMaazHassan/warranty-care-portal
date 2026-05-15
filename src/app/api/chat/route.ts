import { NextResponse } from "next/server";
import { AIService, ChatMessage } from "@/lib/ai-service";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { messages, companyId, homeownerId, conversationId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ message: "Invalid messages" }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1];
    
    // 1. Get AI Response
    const response = await AIService.getChatResponse(messages, companyId || "demo-company");

    // 2. Persist Transcript (FR-17)
    if (homeownerId) {
      let conversation;
      
      if (conversationId) {
        conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        });
      }

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { homeownerId }
        });
      }

      // Store the last exchange
      await prisma.chatMessage.createMany({
        data: [
          {
            conversationId: conversation.id,
            role: lastUserMessage.role,
            content: lastUserMessage.content
          },
          {
            conversationId: conversation.id,
            role: "assistant",
            content: response.content
          }
        ]
      });

      // Include conversationId in response so client can keep using it
      return NextResponse.json({ ...response, conversationId: conversation.id });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
