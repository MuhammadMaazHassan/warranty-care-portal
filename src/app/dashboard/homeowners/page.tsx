"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import PortalLayout from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  Home,
} from "lucide-react";
import { motion } from "framer-motion";

interface Homeowner {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function HomeownersManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [homeowners, setHomeowners] = useState<Homeowner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newHomeowner, setNewHomeowner] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Redirect if not admin or staff
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "staff") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const fetchHomeowners = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/homeowners");
      if (!res.ok) throw new Error("Failed to load homeowners");
      const data = await res.json();
      setHomeowners(data);
    } catch {
      setError("Could not load homeowners.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "staff") {
      fetchHomeowners();
    }
  }, [user]);

  const handleCreateHomeowner = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newHomeowner.name.trim() || !newHomeowner.email.trim() || !newHomeowner.password.trim()) {
      setFormError("All fields are required");
      return;
    }
    if (newHomeowner.password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }

    try {
      const res = await fetch("/api/homeowners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHomeowner),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.message || "Failed to create homeowner"); return; }

      setSuccess(`Homeowner account for ${newHomeowner.name} created successfully!`);
      setNewHomeowner({ name: "", email: "", password: "" });
      setIsDialogOpen(false);
      fetchHomeowners();
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setFormError("An unexpected error occurred.");
    }
  };

  const handleDeleteHomeowner = async (homeownerId: string, homeownerName: string) => {
    if (!confirm(`Are you sure you want to remove ${homeownerName}? This action cannot be undone.`)) return;

    try {
      const res = await fetch("/api/homeowners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeownerId }),
      });
      if (!res.ok) throw new Error("Failed to remove homeowner");
      setSuccess(`${homeownerName}'s account has been removed.`);
      fetchHomeowners();
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("Failed to remove homeowner.");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  return (
    <PortalLayout>
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Home className="h-8 w-8 text-[#0F3B3D]" />
              Homeowners Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage homeowners. You can create or remove homeowner accounts.
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#0F3B3D] hover:bg-[#0F3B3D]/90 gap-2">
                <UserPlus className="h-4 w-4" />
                Add Homeowner
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Homeowner</DialogTitle>
                <DialogDescription>
                  Create login credentials for a new homeowner.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateHomeowner} className="space-y-4 mt-2">
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      className="pl-9"
                      value={newHomeowner.name}
                      onChange={(e) => setNewHomeowner({ ...newHomeowner, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      className="pl-9"
                      value={newHomeowner.email}
                      onChange={(e) => setNewHomeowner({ ...newHomeowner, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      className="pl-9 pr-10"
                      value={newHomeowner.password}
                      onChange={(e) => setNewHomeowner({ ...newHomeowner, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#0F3B3D] hover:bg-[#0F3B3D]/90">
                    Create Account
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Success / Error messages */}
        {success && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Homeowners list */}
        <Card>
          <CardHeader>
            <CardTitle>Current Homeowners</CardTitle>
            <CardDescription>
              {homeowners.length} homeowner{homeowners.length !== 1 ? "s" : ""} registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : homeowners.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No homeowners found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {homeowners.map((homeowner, index) => (
                  <motion.div
                    key={homeowner.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#0F3B3D]/10 flex items-center justify-center">
                        <span className="text-[#0F3B3D] font-semibold text-sm">
                          {homeowner.name?.charAt(0).toUpperCase() ?? "H"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{homeowner.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm text-muted-foreground">{homeowner.email}</p>
                          <button
                            onClick={() => copyToClipboard(homeowner.email, homeowner.id)}
                            className="text-muted-foreground hover:text-[#0F3B3D] transition-colors"
                          >
                            {copiedId === homeowner.id ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Homeowner
                      </Badge>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        Added {new Date(homeowner.createdAt).toLocaleDateString()}
                      </p>
                      {user.role === "admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteHomeowner(homeowner.id, homeowner.name)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
    </PortalLayout>
  );
}
