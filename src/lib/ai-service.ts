import prisma from "@/lib/prisma";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export class AIService {
  static async getChatResponse(messages: ChatMessage[], companyId: string) {
    // 1. Fetch Agent Configuration
    const config = await prisma.agentConfig.findFirst({
      where: { companyId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    const systemPrompt = config?.systemPrompt || "You are a helpful warranty care assistant.";
    
    // 2. Fetch Knowledge Base Context (Advanced RAG Simulation)
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const kbDocs = await prisma.knowledgeBaseDocument.findMany({
      where: {
        companyId,
        isIndexed: true,
        OR: [
          { name: { contains: lastUserMessage, mode: 'insensitive' } },
          { content: { contains: lastUserMessage, mode: 'insensitive' } },
        ]
      },
      take: 4
    });

    // DIY Guidance Engine (FR-05) - Filter for DIY specific docs
    const diyGuides = kbDocs.filter(d => d.documentType === "DIY_GUIDE" || d.documentType === "VIDEO");
    const standardDocs = kbDocs.filter(d => d.documentType === "MANUAL");

    let context = "";
    if (kbDocs.length > 0) {
      context = "\n\nRelevant Knowledge Base context extracted from documents:\n" + 
        kbDocs.map(d => `--- DOCUMENT [${d.documentType}]: ${d.name} ---\n${d.content?.substring(0, 500)}...`).join("\n\n");
    }

    // 3. Emergency Detection Logic (FR-03)
    const emergencyKeywords = ["leak", "fire", "smoke", "flood", "electricity", "danger", "burst", "emergency"];
    const isEmergency = emergencyKeywords.some(kw => lastUserMessage.toLowerCase().includes(kw));

    // 4. Construct the prompt for the LLM
    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt + context },
      ...messages
    ];

    console.log(`[AI Service] Generating response for company ${companyId}...`);
    
    // 5. Simulate LLM Call
    await new Promise(r => setTimeout(r, 1000));

    let responseText = "";
    let diySteps: string[] = [];

    if (isEmergency) {
      responseText = config?.escalationMessage || "🚨 This sounds like a critical emergency. I am escalating this immediately to our priority service team and flagging it as life-safety.";
    } else if (diyGuides.length > 0) {
      // DIY Guidance logic (FR-05)
      responseText = `I've found a Self-Fix guide that might help you resolve this issue immediately. `;
      diySteps = diyGuides[0].content?.split("\n").filter(line => line.match(/^\d\./)).slice(0, 5) || [];
      
      if (diySteps.length === 0) {
        responseText += `Please refer to the "${diyGuides[0].name}" guide. `;
      } else {
        responseText += `Here are the key steps from our "${diyGuides[0].name}":`;
      }
    } else if (kbDocs.length > 0) {
      responseText = `I've analyzed your issue regarding "${lastUserMessage}". According to our documentation (${kbDocs[0].name}), this is covered under your Year ${lastUserMessage.includes("year") ? "2" : "1"} warranty. `;
    } else {
      responseText = `I've analyzed your issue regarding "${lastUserMessage}". I'll look into our policies. Would you like me to open a ticket for our staff to review?`;
    }

    return {
      content: responseText,
      isEmergency,
      diySteps, // FR-05
      usage: { tokens: 150 }
    };
  }
}
