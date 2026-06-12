"use client";

import { useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  Clock,
  User,
  CheckCircle,
  Plus,
  RefreshCw,
  Mail,
  MapPin,
  Save,
  CheckCircle2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";

const mockAppointments = [
  { id: "A-501", leadName: "Emily Watson", type: "Model Home Tour", time: "Tomorrow at 2:00 PM", status: "Confirmed", agent: "Jessica Smith", email: "emily.w@example.com" },
  { id: "A-502", leadName: "Sarah Jenkins", type: "Initial Consultation", time: "June 15 at 10:00 AM", status: "Confirmed", agent: "Alex Chen", email: "sarah.j@example.com" },
  { id: "A-503", leadName: "James Carter", type: "Design Center Review", time: "June 18 at 4:30 PM", status: "Pending", agent: "Alex Chen", email: "j.carter@example.com" }
];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState(mockAppointments);
  const [activeTab, setActiveTab] = useState<"list" | "settings">("list");

  const [hours, setHours] = useState({
    start: "09:00",
    end: "17:00",
    buffer: "15",
    timeZone: "EST",
  });

  const handleSaveHours = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Sales Agent Availability Settings saved successfully!");
  };

  return (
    <ProtectedRoute allowedRoles={["admin", "staff"]}>
      <PortalLayout workspace="sales">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent dark:from-[#b48c3c] dark:to-[#d4af6c]">
                Appointment Scheduling
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage virtual and on-site model home visits, and coordinate agent hours.
              </p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              <Button
                variant={activeTab === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("list")}
                className="h-8 text-xs font-semibold rounded-lg"
              >
                Booked Slots
              </Button>
              <Button
                variant={activeTab === "settings" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("settings")}
                className="h-8 text-xs font-semibold rounded-lg"
              >
                Availability Settings
              </Button>
            </div>
          </div>

          {activeTab === "list" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main List */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">Scheduled Visits</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b text-xs font-semibold text-slate-400">
                          <th className="py-3 px-6">Handoff / Lead Name</th>
                          <th className="py-3 px-4">Visit Type</th>
                          <th className="py-3 px-4">Time Slot</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Assigned Agent</th>
                          <th className="py-3 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((appt) => (
                          <tr key={appt.id} className="border-b dark:border-slate-800 hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition">
                            <td className="py-3.5 px-6 font-semibold">
                              <div>
                                <p>{appt.leadName}</p>
                                <p className="text-[10px] text-slate-400 font-normal mt-0.5">{appt.email}</p>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-medium">{appt.type}</td>
                            <td className="py-3.5 px-4 text-xs">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-400" /> {appt.time}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge className={appt.status === "Confirmed" ? "bg-green-50 text-green-700 border-green-200/50 dark:bg-green-950/20 dark:text-green-400" : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"}>
                                {appt.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-500">{appt.agent}</td>
                            <td className="py-3.5 px-6 text-right">
                              <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 text-xs">
                                Reschedule
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="max-w-xl border border-border/80 shadow-xs">
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-bold">Define Work Hours & Time Zones</CardTitle>
                <CardDescription className="text-xs">Used by the AI conversational agent to offer slots.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveHours} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="startTime" className="font-semibold">Day Starts At</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={hours.start}
                        onChange={(e) => setHours(h => ({ ...h, start: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="endTime" className="font-semibold">Day Ends At</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={hours.end}
                        onChange={(e) => setHours(h => ({ ...h, end: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="buffer" className="font-semibold">Buffer Time (Minutes)</Label>
                      <Input
                        id="buffer"
                        type="number"
                        value={hours.buffer}
                        onChange={(e) => setHours(h => ({ ...h, buffer: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">TimeZone</Label>
                      <Select value={hours.timeZone} onValueChange={(val) => setHours(h => ({ ...h, timeZone: val }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EST">Eastern Standard Time (EST)</SelectItem>
                          <SelectItem value="CST">Central Standard Time (CST)</SelectItem>
                          <SelectItem value="PST">Pacific Standard Time (PST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl space-y-3">
                    <h4 className="font-bold text-xs">Calendar Integrations</h4>
                    <div className="flex items-center justify-between border-t dark:border-slate-800 pt-3 text-xs text-muted-foreground">
                      <span>Google Calendar</span>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]">Connect</Button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Microsoft Outlook 365</span>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]">Connect</Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-[#b48c3c] text-white hover:bg-[#b48c3c]/90 gap-1.5 font-semibold">
                    <Save className="h-4 w-4" /> Save Availability Settings
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </PortalLayout>
    </ProtectedRoute>
  );
}
