import { Inngest } from "inngest";

// Create an Inngest client
export const inngest = new Inngest({ id: "warranty-care-portal", eventKey: process.env.INNGEST_EVENT_KEY || "local" });
