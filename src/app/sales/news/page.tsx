"use client";

import { useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Search,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";

const mockNews = [
  {
    id: 1,
    title: "Mortgage rates slide below 6.0% for the first time since early spring",
    source: "Housing Wire",
    date: "June 12, 2026",
    sentiment: "Positive",
    summary: "Freddie Mac reports 30-year fixed rate mortgage dropped to 5.92% this week, driven by cooling labor metrics. Analysts expect increased buyer inquiries in suburban communities."
  },
  {
    id: 2,
    title: "Housing inventory rises 14% year-over-year in southern metropolitan sectors",
    source: "Real Estate Journal",
    date: "June 10, 2026",
    sentiment: "Neutral",
    summary: "Construction starts for entry-level townhomes have surged, leading to inventory growth. Buyers have slightly more negotiating power, but average listing prices remain firm."
  },
  {
    id: 3,
    title: "Builder confidence matches highest index level of 2026",
    source: "National Association of Homebuilders",
    date: "June 09, 2026",
    sentiment: "Positive",
    summary: "Confidence index rose 2 points to 56. High demand for builder rate buy-downs and mortgage incentives continues to drive traffic to new construction projects."
  }
];

export default function MarketNewsFeedPage() {
  const [feeds] = useState(mockNews);

  return (
    <ProtectedRoute allowedRoles={["admin", "staff"]}>
      <PortalLayout workspace="sales">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent dark:from-[#b48c3c] dark:to-[#d4af6c]">
                Market News Feed
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Aggregated local housing reports and interest rates summarized by the AI news scraper.
              </p>
            </div>
          </div>

          {/* Quick Indicators */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">30-Year Fixed Average</p>
                  <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">5.92%</p>
                  <p className="text-[10px] text-green-600 mt-1 flex items-center gap-0.5"><TrendingDown className="h-3 w-3" /> -0.15% this week</p>
                </div>
                <div className="bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 p-3 rounded-xl shrink-0">
                  <TrendingDown className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">NAHB Builder Index</p>
                  <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">56</p>
                  <p className="text-[10px] text-green-600 mt-1 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> +2 points index</p>
                </div>
                <div className="bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 p-3 rounded-xl shrink-0">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Subsidy Rate Buy-downs</p>
                  <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">4.99% promo</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">Active builder promotion</p>
                </div>
                <div className="bg-[#b48c3c]/10 text-[#b48c3c] p-3 rounded-xl shrink-0">
                  <Activity className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Feed List */}
            <div className="lg:col-span-2 space-y-4">
              {feeds.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition border border-border/70">
                  <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{item.source}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1.5 leading-tight">
                        {item.title}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className={item.sentiment === "Positive" ? "bg-green-50 text-green-700 border-green-200/50 text-[10px] self-start sm:self-center" : "bg-slate-50 text-slate-700 text-[10px] self-start sm:self-center"}>
                      {item.sentiment}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="bg-linear-to-br from-indigo-50/10 to-indigo-50/5 dark:from-slate-950/40 p-4 rounded-xl border border-indigo-200/10 flex items-start gap-3">
                      <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1 leading-relaxed text-slate-700 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-white block text-[10px] uppercase font-bold tracking-wider">AI Summary:</strong>
                        <p>{item.summary}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="ghost" size="sm" className="text-xs h-8 text-[#b48c3c]">
                        Create Blog Draft <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs h-8 text-slate-400">
                        Read Original <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Configured Scrapers */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Layers className="h-4.5 w-4.5 text-[#0F3B3D]" />
                    Scraping Feeds & Status
                  </CardTitle>
                  <CardDescription className="text-xs">Configure where the news scraper pulls sources.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Freddie Mac API</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Daily interest rates</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 text-[10px]">Active</Badge>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">NAHB Press RSS</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Weekly market reports</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 text-[10px]">Active</Badge>
                  </div>
                  <Button variant="outline" className="w-full text-xs h-9">Configure Sources</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PortalLayout>
    </ProtectedRoute>
  );
}
