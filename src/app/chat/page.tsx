"use client";

import { useEffect } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

const INJECT_URL = process.env.NEXT_PUBLIC_BOTPRESS_INJECT_URL || "https://cdn.botpress.cloud/webchat/v3.6/inject.js";
const CONFIG_URL = process.env.NEXT_PUBLIC_BOTPRESS_CONFIG_URL || "https://files.bpcontent.cloud/2026/02/10/12/20260210121824-S8YDKPLR.js";

export default function AIChatPage() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Wait until the user data is fully loaded before initializing the chat
    if (isLoading || !user) return;

    const injectScript = document.createElement("script");
    injectScript.src = INJECT_URL;
    injectScript.async = true;

    const configScript = document.createElement("script");
    configScript.src = CONFIG_URL;
    configScript.async = true;
    configScript.defer = true;

    document.body.appendChild(injectScript);
    document.body.appendChild(configScript);

    const checkBotpress = setInterval(() => {
      const bp = (window as any).botpressWebChat || (window as any).botpressWebchat || (window as any).botpress;
      
      if (bp) {
        clearInterval(checkBotpress);
        
        bp.on("webchat:initialized", () => {
          if (bp.open) bp.open();
          
          if (user && bp.updateUser) {
            try {
              bp.updateUser({
                data: {
                  email: user.email || "",
                  externalId: user.id || "",
                  name: user.name || "",
                  role: user.role || "",
                  companyId: user.companyId || "",
                  companyName: user.companyName || ""
                },
                tags: {
                  email: user.email || "",
                  userId: user.id || "",
                  name: user.name || "",
                  role: user.role || "",
                  companyId: user.companyId || "",
                  companyName: user.companyName || ""
                }
              });
            } catch (err) {
              console.error("Failed to update user in Botpress:", err);
            }
          }
          
          try {
            if (bp.config) {
              bp.config({ 
                avatarUrl: window.location.origin + "/logo.png",
                botName: "Ai.Lumen Care Bot"
              });
            }
          } catch (e) {
            console.error("Could not override botpress config", e);
          }
        });
      }
    }, 300);

    return () => {
      clearInterval(checkBotpress);
      if (document.body.contains(injectScript)) {
        document.body.removeChild(injectScript);
      }

      const configScripts = document.querySelectorAll(`script[src="${CONFIG_URL}"]`);
      configScripts.forEach((s) => s.remove());
      const bpElements = document.querySelectorAll(
        "[id^='bp-'], [class^='bp-'], iframe[src*='botpress'], .bp-webchat-container"
      );
      bpElements.forEach((el) => {
        if (el.id !== "bp-embedded-webchat") {
          el.remove();
        }
      });
    };
  }, [user, isLoading]);

  return (
    <ProtectedRoute allowedRoles={["admin", "staff", "homeowner"]}>
      <PortalLayout>
        <div className="flex flex-col h-[calc(100vh-110px)] max-w-4xl mx-auto px-4 w-full">
          <div className="w-full h-full overflow-hidden rounded-3xl border border-slate-800 shadow-2xl bg-[#020617] p-0 flex flex-col">
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

