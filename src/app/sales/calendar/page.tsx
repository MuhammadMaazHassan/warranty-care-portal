"use client";

import { useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Mail,
  MessageSquare,
  BookmarkCheck,
  CheckCircle2,
  ListFilter
} from "lucide-react";
import { motion } from "framer-motion";

const mockAISuggestions = [
  { id: "S-1", topic: "Post-COE Followup Survey", channel: "Email", date: "June 18", reason: "Gap detected: 14 days without customer contact post COE", outline: "Drip sequence trigger to gather testimonials and survey responses." },
  { id: "S-2", topic: "Mortgage Interest Rate Drop Alert", channel: "SMS", date: "June 20", reason: "News Trigger: Interest rates dropped below 5.8%", outline: "Broadcast SMS alert to cold leads detailing updated monthly estimates." }
];

const mockCalendarEvents = [
  { day: 3, title: "Newsletter Email", channel: "Email" },
  { day: 12, title: "Model Home Tour", channel: "SMS" },
  { day: 15, title: "Rate Drop Alert", channel: "SMS" },
  { day: 22, title: "Resale Campaign", channel: "Email" },
];

export default function ContentCalendarPage() {
  const [suggestions, setSuggestions] = useState(mockAISuggestions);

  const handleApproveSuggestion = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
    alert("Suggestion approved and converted to draft calendar slot!");
  };

  // Basic calendar matrix for June 2026 (starts on Monday, 30 days)
  const daysArray = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <ProtectedRoute allowedRoles={["admin", "staff"]}>
      <PortalLayout workspace="sales">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent dark:from-[#b48c3c] dark:to-[#d4af6c]">
                Content & Send Calendar
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Monitor and reschedule upcoming campaigns, broadcasts, and blog publishes.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 h-9"><ListFilter className="h-4 w-4" /> Filter</Button>
              <Button className="bg-[#b48c3c] text-white hover:bg-[#b48c3c]/90 gap-2 h-9 border-none">
                <Plus className="h-4 w-4" /> Schedule Send
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: AI suggestions */}
            <div className="space-y-6 lg:col-span-1">
              <Card className="border-indigo-500/20 bg-linear-to-br from-white to-indigo-500/5 dark:from-slate-900 dark:to-slate-900/40">
                <CardHeader className="pb-3 border-b dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">AI Suggested Slots</CardTitle>
                  </div>
                  <CardDescription className="text-[10px]">Identified outreach gaps & local events</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {suggestions.length > 0 ? (
                    suggestions.map((s) => (
                      <div key={s.id} className="p-3 border dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold">{s.channel}</Badge>
                          <span className="text-slate-400 font-bold">{s.date}</span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{s.topic}</h4>
                        <p className="text-[9px] text-muted-foreground">{s.outline}</p>
                        <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold italic">★ {s.reason}</p>
                        <Button
                          onClick={() => handleApproveSuggestion(s.id)}
                          className="w-full h-7 text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg"
                        >
                          Approve Suggestion
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-center text-slate-400 py-6">All suggestions processed.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: The Grid */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader className="flex flex-row justify-between items-center p-4 border-b">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-[#b48c3c]" />
                    <span className="font-bold text-sm">June 2026</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-7 text-center border-b dark:border-slate-800 text-xs font-semibold text-slate-400 py-2">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                  </div>
                  <div className="grid grid-cols-7 min-h-[450px]">
                    {daysArray.map((day) => {
                      const events = mockCalendarEvents.filter(e => e.day === day);
                      return (
                        <div key={day} className="border-r border-b dark:border-slate-800 p-2 text-left space-y-1.5 flex flex-col justify-between hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition">
                          <span className="text-[10px] font-bold text-slate-400">{day}</span>
                          <div className="space-y-1 flex-1">
                            {events.map((evt, idx) => (
                              <div
                                key={idx}
                                className={`text-[9px] p-1 rounded font-medium border flex items-center gap-0.5 truncate ${
                                  evt.channel === "Email"
                                    ? "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/20"
                                    : "bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/20"
                                }`}
                              >
                                {evt.channel === "Email" ? <Mail className="h-2.5 w-2.5 shrink-0" /> : <MessageSquare className="h-2.5 w-2.5 shrink-0" />}
                                <span className="truncate">{evt.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PortalLayout>
    </ProtectedRoute>
  );
}
