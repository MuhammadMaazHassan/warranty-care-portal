"use client";

import { useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings,
  Plug,
  Shield,
  Sliders,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  Plus,
  Trash2,
  Globe,
  Clock,
  Sparkles,
  Search,
  Key,
  Calendar,
  AlertTriangle,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FieldMapping {
  salesforceField: string;
  portalField: string;
  description: string;
}

interface CustomField {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE";
  isRequired: boolean;
}

const defaultMappings: FieldMapping[] = [
  { salesforceField: "FirstName", portalField: "firstName", description: "First name of the lead" },
  { salesforceField: "LastName", portalField: "lastName", description: "Last name of the lead" },
  { salesforceField: "Email", portalField: "email", description: "Primary email address" },
  { salesforceField: "MobilePhone", portalField: "phone", description: "Mobile phone in E.164" },
  { salesforceField: "MailingStreet", portalField: "street", description: "Address street" },
  { salesforceField: "MailingCity", portalField: "city", description: "Address city" },
  { salesforceField: "MailingState", portalField: "state", description: "Address state" },
  { salesforceField: "MailingPostalCode", portalField: "zipCode", description: "Zip / Postal code" },
  { salesforceField: "HasOptedOutedOfEmail", portalField: "emailOptIn (Inverted)", description: "Email opt-in state" },
  { salesforceField: "SMSConsentOptIn__c", portalField: "smsOptIn", description: "Custom SMS consent field" }
];

const mockLogs = [
  { timestamp: "12 minutes ago", action: "Incremental Cron Sync", status: "SUCCESS", records: 12, errors: 0 },
  { timestamp: "2 hours ago", action: "Incremental Cron Sync", status: "SUCCESS", records: 3, errors: 0 },
  { timestamp: "Yesterday, 4:30 PM", action: "Bulk Initial Import", status: "WARNING", records: 480, errors: 4, msg: "Failed mapping on 4 rows missing Last Name" },
  { timestamp: "June 10, 9:00 AM", action: "Incremental Cron Sync", status: "ERROR", records: 0, errors: 1, msg: "Salesforce REST OAuth session expired (code 401)" }
];

const initialCustomFields: CustomField[] = [
  { id: "CF-01", name: "DesiredMoveInQuarter", type: "TEXT", isRequired: false },
  { id: "CF-02", name: "MaximumBudgetLimit", type: "NUMBER", isRequired: false },
  { id: "CF-03", name: "CurrentlyRentOrOwn", type: "TEXT", isRequired: false }
];

const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("crm");
  const [sfConnected, setSfConnected] = useState(true);
  const [sfSyncInterval, setSfSyncInterval] = useState("15"); // minutes
  const [sfEnvironment, setSfEnvironment] = useState("sandbox");
  const [sfClientId, setSfClientId] = useState("3MVG9qXv7e9ui8.zKlmNoPqRstUvwXYz12345");
  const [sfClientSecret, setSfClientSecret] = useState("••••••••••••••••••••••••••••••••");
  
  // Mappings
  const [mappings, setMappings] = useState<FieldMapping[]>(defaultMappings);
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [bulkIngesting, setBulkIngesting] = useState(false);
  
  // Brand & Compliance State
  const [defaultOwner, setDefaultOwner] = useState("Alex Chen");
  const [voiceProfile, setVoiceProfile] = useState("professional");
  const [maxSmsPerHour, setMaxSmsPerHour] = useState(60);
  const [complianceOptInRequired, setComplianceOptInRequired] = useState(true);

  // Custom Fields State
  const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomField["type"]>("TEXT");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Trigger simulated Bulk Ingestion
  const handleBulkIngest = () => {
    setBulkIngesting(true);
    setTimeout(() => {
      setBulkIngesting(false);
      alert("Bulk ingestion completed successfully! Synchronized 142 new lead records into the database.");
    }, 2500);
  };

  // Connect SF Flow
  const handleConnectSF = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setSfConnected(true);
      setOauthModalOpen(false);
    }, 1500);
  };

  const handleDisconnectSF = () => {
    if (confirm("Disconnecting will pause all background sequence sync. Proceed?")) {
      setSfConnected(false);
    }
  };

  // Custom Fields CRUD
  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;
    // Format camelCase
    const formattedName = newFieldName
      .replace(/[^a-zA-Z0-9]/g, "")
      .replace(/^\w/, c => c.toUpperCase());
    
    const newField: CustomField = {
      id: `CF-${Math.floor(100 + Math.random() * 900)}`,
      name: formattedName,
      type: newFieldType,
      isRequired: newFieldRequired
    };
    setCustomFields(prev => [...prev, newField]);
    setNewFieldName("");
    setNewFieldRequired(false);
  };

  const handleDeleteCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  return (
    <ProtectedRoute allowedRoles={["admin", "staff"]}>
      <PortalLayout workspace="sales">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6 max-w-7xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={fadeInUp} className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent dark:from-[#b48c3c] dark:to-[#d4af6c]">
                Sales Workspace Settings
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Configure Salesforce CRM connector integration, compliance rules, and custom fields metadata.
              </p>
            </div>
            <Settings className="h-6 w-6 text-[#b48c3c]" />
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <motion.div variants={fadeInUp}>
              <TabsList className="bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl grid grid-cols-3 max-w-lg h-10">
                <TabsTrigger value="crm" className="text-xs font-semibold rounded-lg">CRM Integrations</TabsTrigger>
                <TabsTrigger value="outreach" className="text-xs font-semibold rounded-lg">Outreach & Consent</TabsTrigger>
                <TabsTrigger value="fields" className="text-xs font-semibold rounded-lg">Custom Fields</TabsTrigger>
              </TabsList>
            </motion.div>

            {/* TAB 1: CRM & SALESFORCE CONNECTOR */}
            <TabsContent value="crm" className="space-y-6 focus-visible:outline-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Salesforce Info & Settings */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border border-border/80 shadow-xs">
                    <CardHeader className="border-b border-border/40 bg-slate-50/40 dark:bg-slate-950/20">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-sky-50 dark:bg-sky-950/20 rounded-xl text-sky-600">
                            <Plug className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Salesforce OAuth 2.0 Integration</CardTitle>
                            <CardDescription className="text-xs">Connect to Salesforce REST & Bulk APIs for background contacts fetching.</CardDescription>
                          </div>
                        </div>
                        <Badge className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border border-none ${
                          sfConnected 
                            ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400" 
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                        }`}>
                          {sfConnected ? "CONNECTED" : "DISCONNECTED"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Connected Environment</Label>
                          <Select value={sfEnvironment} onValueChange={setSfEnvironment} disabled={!sfConnected}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="production">Production Instance</SelectItem>
                              <SelectItem value="sandbox">Sandbox / Developer Org</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Background Sync Schedule</Label>
                          <Select value={sfSyncInterval} onValueChange={setSfSyncInterval} disabled={!sfConnected}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">Every 5 minutes (Real-time)</SelectItem>
                              <SelectItem value="15">Every 15 minutes (Standard)</SelectItem>
                              <SelectItem value="60">Every 1 hour</SelectItem>
                              <SelectItem value="1440">Daily at Midnight</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">OAuth Consumer Key (Client ID)</Label>
                          <Input value={sfClientId} readOnly disabled className="bg-muted h-9 text-xs font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">OAuth Consumer Secret</Label>
                          <Input value={sfClientSecret} readOnly disabled className="bg-muted h-9 text-xs font-mono" />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t justify-end">
                        {sfConnected ? (
                          <>
                            <Button variant="ghost" onClick={handleDisconnectSF} className="text-red-500 hover:bg-red-500/10 h-9 text-xs">
                              Disconnect CRM
                            </Button>
                            <Button 
                              onClick={handleBulkIngest} 
                              disabled={bulkIngesting}
                              className="bg-[#b48c3c] text-white hover:bg-[#b48c3c]/90 gap-2 h-9 text-xs border-none"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${bulkIngesting ? "animate-spin" : ""}`} />
                              {bulkIngesting ? "Syncing Salesforce Bulk API 2.0..." : "Sync Salesforce Bulk Now"}
                            </Button>
                          </>
                        ) : (
                          <Button onClick={() => setOauthModalOpen(true)} className="bg-[#0F3B3D] text-white hover:bg-[#0F3B3D]/90 h-9 text-xs">
                            Setup Salesforce Connection
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mapping Fields Card */}
                  <Card className="border border-border/80 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Database className="h-4.5 w-4.5 text-[#b48c3c]" />
                        Salesforce SObject Field Mapping
                      </CardTitle>
                      <CardDescription className="text-xs">Align Lead fields in the care portal database with Salesforce API field paths.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-border/50">
                            <th className="py-2.5 px-4 font-semibold text-muted-foreground pl-6">Salesforce API Field</th>
                            <th className="py-2.5 px-4 font-semibold text-muted-foreground">Care Portal Field (Destination)</th>
                            <th className="py-2.5 px-4 font-semibold text-muted-foreground pr-6">Data Purpose</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mappings.map((mapping, idx) => (
                            <tr key={idx} className="border-b border-border/30 hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                              <td className="py-2.5 px-4 pl-6 font-mono font-bold text-slate-800 dark:text-slate-200">{mapping.salesforceField}</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-[#b48c3c]">{mapping.portalField}</td>
                              <td className="py-2.5 px-4 pr-6 text-muted-foreground">{mapping.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>

                {/* Logs History Sidebar */}
                <div className="space-y-6">
                  <Card className="border border-border/80 shadow-xs">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold flex items-center gap-2">
                        <History className="h-4.5 w-4.5 text-[#0F3B3D]" />
                        Sync Activity Logs
                      </CardTitle>
                      <CardDescription className="text-[10px]">Real-time audit trailing of Inngest ingestion cron tasks.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                      {mockLogs.map((log, idx) => (
                        <div key={idx} className="p-2.5 border rounded-lg bg-slate-50/50 dark:bg-slate-900/10 text-[11px] space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{log.action}</span>
                            <Badge className={`text-[9px] font-semibold tracking-tight border-none ${
                              log.status === "SUCCESS" 
                                ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400" 
                                : log.status === "WARNING"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                            }`}>
                              {log.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                            <span>Ingested: <strong>{log.records} leads</strong></span>
                            <span>{log.timestamp}</span>
                          </div>
                          {log.msg && (
                            <p className="text-[10px] text-red-500 font-mono pt-1 border-t border-dashed leading-tight">
                              Error: {log.msg}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

              </div>
            </TabsContent>

            {/* TAB 2: OUTREACH & COMPLIANCE */}
            <TabsContent value="outreach" className="space-y-6 focus-visible:outline-hidden">
              <Card className="border border-border/80 shadow-xs max-w-3xl">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Shield className="h-4.5 w-4.5 text-[#b48c3c]" />
                    Centralized Outreach & TCPA Compliance Safeguards
                  </CardTitle>
                  <CardDescription className="text-xs">Adjust throttling limits, default voice profile parameters, and consent requirements.</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="defaultOwner" className="font-semibold text-xs">Default Lead Owner Assignment</Label>
                      <Select value={defaultOwner} onValueChange={setDefaultOwner}>
                        <SelectTrigger id="defaultOwner"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Alex Chen">Alex Chen (Senior Agent)</SelectItem>
                          <SelectItem value="Jessica Smith">Jessica Smith (Agent)</SelectItem>
                          <SelectItem value="Unassigned">Assign to Pool Queue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="voiceProfile" className="font-semibold text-xs">AI Outreach Voice Profile (Tone)</Label>
                      <Select value={voiceProfile} onValueChange={setVoiceProfile}>
                        <SelectTrigger id="voiceProfile"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Formal & Direct (Trustworthy)</SelectItem>
                          <SelectItem value="friendly">Informal & Conversational (Friendly)</SelectItem>
                          <SelectItem value="energetic">Energetic & Promotional (Urgent)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="throttle" className="font-semibold text-xs">Max Outbound SMS Throttle (Per Hour)</Label>
                      <Input 
                        id="throttle" 
                        type="number" 
                        value={maxSmsPerHour} 
                        onChange={(e) => setMaxSmsPerHour(parseInt(e.target.value) || 0)} 
                        className="h-9 text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-semibold text-xs block mb-2">Consent Validation Enforcement</Label>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="consentEnforce"
                          checked={complianceOptInRequired}
                          onChange={(e) => setComplianceOptInRequired(e.target.checked)}
                          className="h-4 w-4 text-[#b48c3c] rounded"
                        />
                        <Label htmlFor="consentEnforce" className="text-xs cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                          Block automated SMS if smsOptIn !== true
                        </Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-200/50 rounded-xl space-y-1 text-slate-800 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                      <h5 className="font-bold text-xs">TCPA / SMS Marketing Compliance Note</h5>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pl-6">
                      Quiet Hours are strictly locked in accordance with US Federal laws (9 PM to 8 AM local recipient time). Even if a workflow action is triggered, outreach messages will be automatically delayed and scheduled to deliver during the active next window.
                    </p>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: CUSTOM LEAD FIELDS */}
            <TabsContent value="fields" className="space-y-6 focus-visible:outline-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Custom Fields List */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border border-border/80 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <SlidersHorizontal className="h-4.5 w-4.5 text-[#b48c3c]" />
                        Active Custom Lead Fields
                      </CardTitle>
                      <CardDescription className="text-xs">Define key-value schema additions for Lead records inside customFields JSON.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-border/50">
                            <th className="py-2.5 px-4 font-semibold text-muted-foreground pl-6">Field Variable Name</th>
                            <th className="py-2.5 px-4 font-semibold text-muted-foreground">Data Type</th>
                            <th className="py-2.5 px-4 font-semibold text-muted-foreground">Required on Manual Creation</th>
                            <th className="py-2.5 px-4 font-semibold text-muted-foreground text-right pr-6">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customFields.map((field) => (
                            <tr key={field.id} className="border-b border-border/30 hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                              <td className="py-2.5 px-4 pl-6 font-mono font-bold text-slate-800 dark:text-slate-200">{field.name}</td>
                              <td className="py-2.5 px-4">
                                <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0">
                                  {field.type}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-4">
                                {field.isRequired ? (
                                  <span className="text-red-500 font-semibold">Yes</span>
                                ) : (
                                  <span className="text-muted-foreground">Optional</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right pr-6">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteCustomField(field.id)}
                                  className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>

                {/* Add Custom Field Form */}
                <div className="space-y-6">
                  <Card className="border border-border/80 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold">Add Custom Field</CardTitle>
                      <CardDescription className="text-xs">Create custom tags or properties to track during buyer onboarding.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="fieldName" className="font-semibold text-xs">Variable Name *</Label>
                        <Input 
                          id="fieldName" 
                          placeholder="e.g. PreferredBuilder" 
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          className="h-9 text-xs" 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="fieldType" className="font-semibold text-xs">Data Format</Label>
                        <Select value={newFieldType} onValueChange={(val: any) => setNewFieldType(val)}>
                          <SelectTrigger id="fieldType" className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEXT">Alphanumeric Text</SelectItem>
                            <SelectItem value="NUMBER">Numeric Float</SelectItem>
                            <SelectItem value="BOOLEAN">Checkbox / Boolean</SelectItem>
                            <SelectItem value="DATE">ISO Date</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="fieldReq"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                          className="h-4 w-4 text-[#b48c3c] rounded"
                        />
                        <Label htmlFor="fieldReq" className="text-xs cursor-pointer font-medium">
                          Force inputs on manual creation
                        </Label>
                      </div>

                      <Button onClick={handleAddCustomField} className="w-full bg-[#0F3B3D] text-white hover:bg-[#0F3B3D]/90 h-9 text-xs">
                        Add Custom Field Schema
                      </Button>

                    </CardContent>
                  </Card>
                </div>

              </div>
            </TabsContent>

          </Tabs>
        </motion.div>

        {/* Salesforce Connection Settings Modal */}
        <Dialog open={oauthModalOpen} onOpenChange={setOauthModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sky-600">
                <Key className="h-5 w-5" />
                Salesforce OAuth credentials
              </DialogTitle>
              <DialogDescription>
                Input your Salesforce Connected App details to acquire bearer session tokens.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="sfEnvSelect" className="font-semibold text-xs">Environment Type</Label>
                <Select value={sfEnvironment} onValueChange={setSfEnvironment}>
                  <SelectTrigger id="sfEnvSelect" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production Instance (login.salesforce.com)</SelectItem>
                    <SelectItem value="sandbox">Sandbox Org (test.salesforce.com)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clientIdForm" className="font-semibold text-xs">Consumer Key (Client ID) *</Label>
                <Input 
                  id="clientIdForm" 
                  placeholder="Enter Salesforce consumer key..." 
                  value={sfClientId}
                  onChange={(e) => setSfClientId(e.target.value)}
                  className="h-8 text-xs" 
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clientSecretForm" className="font-semibold text-xs">Consumer Secret *</Label>
                <Input 
                  id="clientSecretForm" 
                  type="password"
                  placeholder="Enter consumer secret..." 
                  value={sfClientSecret}
                  onChange={(e) => setSfClientSecret(e.target.value)}
                  className="h-8 text-xs" 
                />
              </div>

              {connecting && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl flex items-center justify-center gap-3">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#b48c3c]" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Authorizing via Salesforce OAuth 2.0 Webflow...</span>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setOauthModalOpen(false)} disabled={connecting}>Cancel</Button>
              <Button onClick={handleConnectSF} disabled={connecting} className="bg-sky-600 text-white hover:bg-sky-700 border-none">
                Connect CRM
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </PortalLayout>
    </ProtectedRoute>
  );
}
