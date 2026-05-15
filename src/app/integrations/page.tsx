"use client";

import { useState, useEffect } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  RefreshCw,
  Plug,
  Zap,
  Database,
  MapPin,
  Loader2,
  X,
  CheckCircle2,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: { duration: 0.2 },
  },
  hover: {
    y: -4,
    transition: { type: "spring" as const, stiffness: 400, damping: 17 },
  },
};

const buttonVariants = {
  tap: { scale: 0.97 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export interface Integration {
  id: string;
  platform: string;
  status: "connected" | "disconnected" | "syncing";
  lastSync: string | null;
  authType: string;
  apiKeyMasked: string | null;
}

const initialIntegrations: Integration[] = [
  {
    id: "1",
    platform: "Builtopia",
    status: "connected",
    lastSync: "2026-05-12T08:30:00",
    authType: "OAuth",
    apiKeyMasked: "••••••••",
  },
  {
    id: "2",
    platform: "Buildertrend",
    status: "disconnected",
    lastSync: null,
    authType: "API Key",
    apiKeyMasked: null,
  },
];

// Platform icons mapping
const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "Builtopia":
      return <Database className="h-6 w-6 text-primary" />;
    case "Buildertrend":
      return <Zap className="h-6 w-6 text-primary" />;
    case "Hyphen":
      return <Plug className="h-6 w-6 text-primary" />;
    default:
      return <Database className="h-6 w-6 text-primary" />;
  }
};

// Mock field mapping configuration
const getPlatformFields = (platform: string) => {
  const commonFields = [
    { source: "project_id", target: "project_id", required: true },
    { source: "project_name", target: "name", required: true },
    { source: "customer_name", target: "client_name", required: false },
    { source: "start_date", target: "startDate", required: false },
    { source: "end_date", target: "endDate", required: false },
    { source: "status", target: "status", required: false },
    { source: "budget", target: "budget_amount", required: false },
  ];

  if (platform === "Builtopia") {
    return [
      ...commonFields,
      { source: "building_type", target: "type", required: false },
      { source: "floor_area", target: "area_sqft", required: false },
    ];
  }
  return commonFields;
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Mapping dialog state
  const [mappingOpen, setMappingOpen] = useState(false);
  const [selectedIntegrationForMapping, setSelectedIntegrationForMapping] =
    useState<any>(null);
  const [fieldMappings, setFieldMappings] = useState<
    Array<{
      source: string;
      target: string;
      required: boolean;
      enabled: boolean;
    }>
  >([]);

  // Show toast notification
  const showToast = (type: "success" | "error" | "info", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add new integration
  const handleConnect = () => {
    if (!selectedPlatform) {
      showToast("error", "Please select a platform");
      return;
    }
    if (!apiKey.trim()) {
      setApiKeyError("API Key is required");
      return;
    }
    setApiKeyError("");

    const newIntegration = {
      id: Date.now().toString(),
      platform: selectedPlatform,
      status: "connected" as const,
      lastSync: new Date().toISOString(),
      authType: "API Key",
      apiKeyMasked: `••••${apiKey.slice(-4)}`,
    };

    setIntegrations((prev) => [...prev, newIntegration]);
    setOpenAddDialog(false);
    setSelectedPlatform("");
    setApiKey("");
    showToast("success", `${selectedPlatform} integration added successfully`);
  };

  // Delete integration
  const handleDeleteIntegration = (id: string, platform: string) => {
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
    showToast("info", `${platform} integration removed`);
  };

  // Connect a disconnected integration
  const handleConnectIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: "connected", lastSync: new Date().toISOString() }
          : i,
      ),
    );
    showToast("success", "Integration reconnected successfully");
  };

  // Disconnect integration
  const handleDisconnectIntegration = (id: string, platform: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: "disconnected", lastSync: null } : i,
      ),
    );
    showToast("info", `${platform} disconnected`);
  };

  // Sync integration with loading animation
  const handleSync = async (id: string) => {
    const integration = integrations.find((i) => i.id === id);
    if (integration?.status !== "connected") {
      showToast(
        "error",
        "Cannot sync a disconnected integration. Please connect first.",
      );
      return;
    }

    setSyncingId(id);

    // Simulate sync process with loading
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, lastSync: new Date().toISOString() } : i,
      ),
    );
    setSyncingId(null);
    showToast("success", `Sync completed for ${integration.platform}`);
  };

  // Open field mapping dialog
  const handleOpenMapping = (integration: any) => {
    setSelectedIntegrationForMapping(integration);
    const platformFields = getPlatformFields(integration.platform);
    setFieldMappings(
      platformFields.map((field) => ({
        source: field.source,
        target: field.target,
        required: field.required,
        enabled: field.required, // required fields are enabled by default
      })),
    );
    setMappingOpen(true);
  };

  // Toggle field mapping
  const toggleFieldMapping = (index: number) => {
    setFieldMappings((prev) =>
      prev.map((field, i) =>
        i === index && !field.required
          ? { ...field, enabled: !field.enabled }
          : field,
      ),
    );
  };

  // Save mapping configuration
  const handleSaveMapping = () => {
    setMappingOpen(false);
    showToast(
      "success",
      `Field mapping saved for ${selectedIntegrationForMapping?.platform}`,
    );
  };

  // Get status badge with animation
  const getStatusBadge = (status: string) => {
    if (status === "connected")
      return (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500 }}
        >
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        </motion.div>
      );
    if (status === "disconnected")
      return (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700">
            <Unlink className="mr-1 h-3 w-3" />
            Disconnected
          </Badge>
        </motion.div>
      );
    if (status === "syncing")
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 animate-pulse">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Syncing...
        </Badge>
      );
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <PortalLayout>
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: -50, x: "-50%" }}
              className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${toastMessage.type === "success"
                ? "bg-green-50 dark:bg-green-900/80 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700"
                : toastMessage.type === "error"
                  ? "bg-red-50 dark:bg-red-900/80 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700"
                  : "bg-blue-50 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
                }`}
            >
              {toastMessage.type === "success" && (
                <CheckCircle2 className="h-5 w-5" />
              )}
              {toastMessage.type === "error" && <X className="h-5 w-5" />}
              {toastMessage.type === "info" && (
                <RefreshCw className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">{toastMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto"
        >
          {/* Header Section */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent dark:from-[#b48c3c] dark:to-[#d4af6c]">
                Integrations
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mt-1">
                Connect and manage your CRM/ERP systems
              </p>
            </div>
            <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
              <DialogTrigger asChild>
                <motion.div
                  variants={buttonVariants}
                  whileTap="tap"
                  whileHover="hover"
                >
                  <Button className="shadow-md hover:shadow-lg transition-shadow">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Integration
                  </Button>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 25 }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-xl">
                      Connect a System
                    </DialogTitle>
                    <DialogDescription>
                      Select a platform and enter your API credentials
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Platform</Label>
                      <Select
                        onValueChange={setSelectedPlatform}
                        value={selectedPlatform}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Builtopia">Builtopia</SelectItem>
                          <SelectItem value="Buildertrend">
                            Buildertrend
                          </SelectItem>
                          <SelectItem value="Hyphen">Hyphen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">API Key</Label>
                      <Input
                        placeholder="Enter your API key"
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          if (e.target.value.trim()) setApiKeyError("");
                        }}
                        className={
                          apiKeyError
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }
                      />
                      {apiKeyError && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-500"
                        >
                          {apiKeyError}
                        </motion.p>
                      )}
                    </div>
                  </div>
                  <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setOpenAddDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleConnect} className="sm:ml-2">
                      Connect
                    </Button>
                  </DialogFooter>
                </motion.div>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Integrations Grid */}
          <AnimatePresence mode="popLayout">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
            >
              {integrations.map((integration) => (
                <motion.div
                  key={integration.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover="hover"
                  layout
                >
                  <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 dark:bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex gap-3 items-start">
                          <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="rounded-xl bg-primary/10 p-2.5 shadow-inner"
                          >
                            {getPlatformIcon(integration.platform)}
                          </motion.div>
                          <div>
                            <CardTitle className="text-lg md:text-xl">
                              {integration.platform}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {integration.authType}
                            </CardDescription>
                          </div>
                        </div>
                        {getStatusBadge(integration.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center border-b border-border/50 pb-1.5">
                          <span className="text-muted-foreground">
                            Last sync:
                          </span>
                          <span className="font-mono text-xs font-medium">
                            {integration.lastSync
                              ? new Date(integration.lastSync).toLocaleString()
                              : "Never"}
                          </span>
                        </div>
                        {integration.apiKeyMasked && (
                          <div className="flex justify-between items-center border-b border-border/50 pb-1.5">
                            <span className="text-muted-foreground">
                              API Key:
                            </span>
                            <span className="font-mono text-xs">
                              {integration.apiKeyMasked}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {integration.status === "connected" ? (
                          <>
                            <motion.div
                              variants={buttonVariants}
                              whileTap="tap"
                              whileHover="hover"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSync(integration.id)}
                                disabled={syncingId === integration.id}
                                className="gap-1.5"
                              >
                                {syncingId === integration.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )}
                                {syncingId === integration.id
                                  ? "Syncing..."
                                  : "Sync"}
                              </Button>
                            </motion.div>
                            <motion.div
                              variants={buttonVariants}
                              whileTap="tap"
                              whileHover="hover"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenMapping(integration)}
                                className="gap-1.5"
                              >
                                <MapPin className="h-3.5 w-3.5" />
                                Map Fields
                              </Button>
                            </motion.div>
                            <motion.div
                              variants={buttonVariants}
                              whileTap="tap"
                              whileHover="hover"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDisconnectIntegration(
                                    integration.id,
                                    integration.platform,
                                  )
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5"
                              >
                                <Unlink className="h-3.5 w-3.5" />
                                Disconnect
                              </Button>
                            </motion.div>
                          </>
                        ) : (
                          <>
                            <motion.div
                              variants={buttonVariants}
                              whileTap="tap"
                              whileHover="hover"
                            >
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleConnectIntegration(integration.id)
                                }
                                className="gap-1.5"
                              >
                                <LinkIcon className="h-3.5 w-3.5" />
                                Connect
                              </Button>
                            </motion.div>
                            <motion.div
                              variants={buttonVariants}
                              whileTap="tap"
                              whileHover="hover"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteIntegration(
                                    integration.id,
                                    integration.platform,
                                  )
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </Button>
                            </motion.div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Phase 2 Coming Soon Card */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
          >
            <Card className="border-l-4 border-l-secondary bg-linear-to-r from-secondary/5 to-transparent dark:from-secondary/10 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <Zap className="h-5 w-5 text-secondary" />
                  </motion.div>
                  Phase 2 Coming Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Webhooks, conditional field mapping, bulk sync, real-time data
                  streaming, and advanced analytics.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Field Mapping Dialog */}
        <Dialog open={mappingOpen} onOpenChange={setMappingOpen}>
          <DialogContent className="sm:max-w-lg mx-4 sm:mx-auto max-h-[80vh] overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Field Mapping
                </DialogTitle>
                <DialogDescription>
                  Map fields from {selectedIntegrationForMapping?.platform} to
                  your system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <p className="font-medium mb-2">Mapping Configuration</p>
                  <p className="text-muted-foreground text-xs">
                    Define how data fields from{" "}
                    {selectedIntegrationForMapping?.platform} map to your
                    internal fields. Required fields cannot be disabled.
                  </p>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {fieldMappings.map((field, idx) => (
                    <motion.div
                      key={field.source}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex items-center justify-between p-3 rounded-lg border ${field.enabled
                        ? "bg-background"
                        : "bg-muted/20 opacity-60"
                        }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {field.source}
                          </code>
                          <span className="text-muted-foreground">→</span>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {field.target}
                          </code>
                          {field.required && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4"
                            >
                              Required
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant={field.enabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFieldMapping(idx)}
                        disabled={field.required}
                        className="h-7 px-2 text-xs"
                      >
                        {field.enabled ? "Enabled" : "Disabled"}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setMappingOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMapping}>Save Mapping</Button>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        </Dialog>
      </PortalLayout>
    </ProtectedRoute>
  );
}
