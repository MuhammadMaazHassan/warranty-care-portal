"use client";

import { useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Layers,
  Plus,
  Mail,
  MessageSquare,
  Clock,
  Trash2,
  TrendingUp,
  Activity,
  ChevronRight,
  Eye,
  CheckCircle,
  Play
} from "lucide-react";
import { motion } from "framer-motion";

const initialSequences = [
  { id: "S-01", name: "First-Time Homebuyer Campaign", status: "Active", channel: "Email & SMS", stepsCount: 12, activeLeads: 840, conversionRate: "8.4%", conversionCount: 71 },
  { id: "S-02", name: "Model Home Tour Follow-up", status: "Active", channel: "Email Only", stepsCount: 5, activeLeads: 45, conversionRate: "15.2%", conversionCount: 47 },
  { id: "S-03", name: "Interest Rate Drop Alert", status: "Active", channel: "SMS Only", stepsCount: 2, activeLeads: 2450, conversionRate: "4.8%", conversionCount: 118 },
  { id: "S-04", name: "Resale Homeowner referral", status: "Draft", channel: "Email & SMS", stepsCount: 8, activeLeads: 0, conversionRate: "0.0%", conversionCount: 0 }
];

export default function SequencesPage() {
  const [sequences, setSequences] = useState(initialSequences);
  const [activeSeq, setActiveSeq] = useState(initialSequences[0]);

  return (
    <ProtectedRoute allowedRoles={["admin", "staff"]}>
      <PortalLayout workspace="sales">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent dark:from-[#b48c3c] dark:to-[#d4af6c]">
                Nurture Campaigns
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Design multi-step email and SMS workflows to nurture builder leads.
              </p>
            </div>
            <Button className="bg-[#b48c3c] text-white hover:bg-[#b48c3c]/90 gap-2 h-9 border-none">
              <Plus className="h-4 w-4" /> Create Sequence
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: List of Sequences */}
            <div className="space-y-4">
              {sequences.map((seq) => (
                <Card
                  key={seq.id}
                  onClick={() => setActiveSeq(seq)}
                  className={`cursor-pointer transition border relative overflow-hidden ${
                    activeSeq.id === seq.id
                      ? "border-[#b48c3c] bg-linear-to-br from-white to-[#b48c3c]/5 dark:from-slate-900 dark:to-slate-900/50"
                      : "hover:border-border"
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono font-bold text-[#b48c3c]">{seq.id}</span>
                      <Badge className={seq.status === "Active" ? "bg-green-50 text-green-700 border-green-200/50 dark:bg-green-950/20 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800"}>
                        {seq.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 truncate">
                      {seq.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-xs text-muted-foreground space-y-2">
                    <div className="flex justify-between">
                      <span>Steps: <strong className="text-foreground">{seq.stepsCount}</strong></span>
                      <span>Channel: <strong className="text-foreground">{seq.channel}</strong></span>
                    </div>
                    <div className="flex justify-between border-t dark:border-slate-800 pt-2 text-[10px]">
                      <span>Active Leads: <strong className="text-foreground">{seq.activeLeads}</strong></span>
                      <span className="text-green-600 font-bold">{seq.conversionRate} conv</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Right Panel: Active Sequence Detail View */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-border/80">
                <CardHeader className="border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/40 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">{activeSeq.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">Multi-step drip campaign flow settings.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs font-semibold">
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preview Templates
                    </Button>
                    {activeSeq.status === "Draft" && (
                      <Button size="sm" className="bg-green-600 text-white hover:bg-green-700 h-8 text-xs font-semibold">
                        <Play className="h-3.5 w-3.5 mr-1" /> Launch Sequence
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* Drip Step Workflow Visualizer */}
                  <div className="space-y-6 relative border-l-2 border-dashed border-[#b48c3c]/30 ml-4 pl-8">
                    
                    {/* Step 1 */}
                    <div className="relative">
                      <span className="absolute -left-[41px] top-1.5 h-6 w-6 rounded-full bg-[#b48c3c] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                      <div className="p-4 border rounded-xl bg-slate-50/40 dark:bg-slate-950/20 max-w-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                            <Mail className="h-3.5 w-3.5 text-[#b48c3c]" /> Drip Email: "Welcome to our Communities"
                          </span>
                          <Badge variant="outline" className="text-[9px]">Immediate</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                          Greets new leads by name, introduces available models in their specified regions, and attaches the community brochure.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative">
                      <span className="absolute -left-[41px] top-1.5 h-6 w-6 rounded-full bg-[#b48c3c] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                      <div className="p-4 border rounded-xl bg-slate-50/40 dark:bg-slate-950/20 max-w-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                            <Clock className="h-3.5 w-3.5 text-slate-400" /> Wait Condition
                          </span>
                          <Badge variant="outline" className="text-[9px] bg-slate-100">3 Days</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative">
                      <span className="absolute -left-[41px] top-1.5 h-6 w-6 rounded-full bg-[#b48c3c] text-white flex items-center justify-center text-[10px] font-bold">3</span>
                      <div className="p-4 border rounded-xl bg-slate-50/40 dark:bg-slate-950/20 max-w-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                            <MessageSquare className="h-3.5 w-3.5 text-cyan-600" /> Drip SMS: "Model House Tour Link"
                          </span>
                          <Badge variant="outline" className="text-[9px]">9:00 AM Send Window</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                          "Hi {"{firstName}"}, hope you had a chance to check out our homes. Would you like to check out our virtual tour or book a model home viewing? Link: {"{bookingLink}"}"
                        </p>
                      </div>
                    </div>
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
