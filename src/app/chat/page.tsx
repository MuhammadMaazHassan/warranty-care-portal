"use client";

import { useEffect } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, RefreshCw } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const INJECT_URL = process.env.NEXT_PUBLIC_BOTPRESS_INJECT_URL || "https://cdn.botpress.cloud/webchat/v3.6/inject.js";
const CONFIG_URL = process.env.NEXT_PUBLIC_BOTPRESS_CONFIG_URL || "https://files.bpcontent.cloud/2026/02/10/12/20260210121824-S8YDKPLR.js";

export default function AIChatPage() {
  useEffect(() => {
    // 1. Inject the Botpress Webchat v3.6 scripts dynamically
    const injectScript = document.createElement("script");
    injectScript.src = INJECT_URL;
    injectScript.async = true;

    // Load config script and attach listener once injectScript finishes loading
    injectScript.onload = () => {
      if (typeof window !== "undefined" && (window as any).botpress) {
        // Automatically open the chat window when initialized
        (window as any).botpress.on("webchat:initialized", () => {
          (window as any).botpress.open();
        });
      }

      const configScript = document.createElement("script");
      configScript.src = CONFIG_URL;
      configScript.async = true;
      configScript.defer = true;
      document.body.appendChild(configScript);
    };

    document.body.appendChild(injectScript);

    return () => {
      // Cleanup scripts on unmount
      if (document.body.contains(injectScript)) {
        document.body.removeChild(injectScript);
      }
      
      // Clean up configScript by finding it dynamically
      const configScripts = document.querySelectorAll(`script[src="${CONFIG_URL}"]`);
      configScripts.forEach((s) => s.remove());

      // Remove any injected Botpress elements or container overlays to ensure clean navigation
      const bpElements = document.querySelectorAll(
        "[id^='bp-'], [class^='bp-'], iframe[src*='botpress'], .bp-webchat-container"
      );
      bpElements.forEach((el) => el.remove());
    };
  }, []);

  return (
    <ProtectedRoute allowedRoles={["admin", "staff", "homeowner"]}>
      <PortalLayout>
        <div className="flex flex-col h-[calc(100vh-110px)] max-w-4xl mx-auto px-4 w-full">
          <div className="w-full h-full overflow-hidden rounded-3xl border border-slate-800 shadow-2xl bg-[#020617] p-0 flex flex-col">
            {/* Force Botpress to render completely inline inside our card container */}
            <style dangerouslySetInnerHTML={{ __html: `
              #bp-embedded-webchat {
                width: 100% !important;
                height: 100% !important;
                display: block !important;
                position: relative !important;
              }
              #bp-embedded-webchat iframe {
                width: 100% !important;
                height: 100% !important;
                border: none !important;
                position: relative !important;
                top: auto !important;
                right: auto !important;
                bottom: auto !important;
                left: auto !important;
                display: block !important;
                box-shadow: none !important;
                border-radius: 20px !important;
              }
              /* Hide the floating bubble button or external overlays if they are still injected */
              div[class*="bpw-widget"], 
              iframe[class*="bpw-widget"],
              [class*="bpw-chat-bubble"],
              .bp-widget-bubble,
              #bp-widget {
                display: none !important;
              }
            `}} />
            {/* This container matches the embeddedChatId in your Botpress config script ("bp-embedded-webchat") */}
            <div
              id="bp-embedded-webchat"
              className="w-full h-full bg-[#020617]"
            />
          </div>
        </div>
      </PortalLayout>
    </ProtectedRoute>
  );
}

