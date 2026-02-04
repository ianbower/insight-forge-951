import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, AlertCircle, CheckCircle2, XCircle, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/hooks/useUserRole";
import { RoleBadge } from "./RoleSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParsedUser {
  email: string;
  name: string;
  role: AppRole;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
}

const VALID_ROLES: AppRole[] = [
  "super_admin", "admin", "partner", "account_lead", 
  "delivery_lead", "practice_leader", "engagement_lead", 
  "consultant", "member"
];

interface BulkUserImportProps {
  onComplete: () => void;
  isSuperAdmin: boolean;
}

export function BulkUserImport({ onComplete, isSuperAdmin }: BulkUserImportProps) {
  const [open, setOpen] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "complete">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csvContent = "email,name,role\njohn.doe@company.com,John Doe,consultant\njane.smith@company.com,Jane Smith,member\n";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (content: string): ParsedUser[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    const emailIndex = headers.findIndex(h => h === "email");
    const nameIndex = headers.findIndex(h => h === "name" || h === "full_name" || h === "fullname");
    const roleIndex = headers.findIndex(h => h === "role");

    if (emailIndex === -1) {
      toast.error("CSV must have an 'email' column");
      return [];
    }

    const users: ParsedUser[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
      const email = values[emailIndex]?.toLowerCase();
      
      if (!email || !email.includes("@")) continue;

      let role: AppRole = "consultant";
      if (roleIndex !== -1 && values[roleIndex]) {
        const parsedRole = values[roleIndex].toLowerCase().replace(/\s+/g, "_") as AppRole;
        if (VALID_ROLES.includes(parsedRole)) {
          // Only super_admins can assign super_admin role
          if (parsedRole === "super_admin" && !isSuperAdmin) {
            role = "admin";
          } else {
            role = parsedRole;
          }
        }
      }

      users.push({
        email,
        name: nameIndex !== -1 ? values[nameIndex] || "" : "",
        role,
        status: "pending"
      });
    }

    return users;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const users = parseCSV(content);
      
      if (users.length === 0) {
        toast.error("No valid users found in CSV");
        return;
      }

      // Check for duplicates
      const emails = new Set<string>();
      const uniqueUsers = users.filter(u => {
        if (emails.has(u.email)) return false;
        emails.add(u.email);
        return true;
      });

      if (uniqueUsers.length < users.length) {
        toast.warning(`Removed ${users.length - uniqueUsers.length} duplicate emails`);
      }

      setParsedUsers(uniqueUsers);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const removeUser = (email: string) => {
    setParsedUsers(prev => prev.filter(u => u.email !== email));
  };

  const startImport = async () => {
    setStep("importing");
    setImporting(true);
    setProgress(0);

    const results: ParsedUser[] = [...parsedUsers];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < results.length; i++) {
      const user = results[i];
      results[i] = { ...user, status: "processing" };
      setParsedUsers([...results]);

      try {
        // Generate a temporary password
        const tempPassword = crypto.randomUUID().slice(0, 16);
        
        // Create the user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: user.email,
          password: tempPassword,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: user.name || undefined,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          // Assign the role
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: authData.user.id, role: user.role });

          if (roleError) {
            console.error("Role assignment error:", roleError);
          }
        }

        results[i] = { ...user, status: "success" };
        successCount++;
      } catch (error: any) {
        console.error(`Error importing ${user.email}:`, error);
        results[i] = { 
          ...user, 
          status: "error", 
          error: error.message?.includes("already registered") 
            ? "Email already registered" 
            : error.message || "Import failed"
        };
        errorCount++;
      }

      setParsedUsers([...results]);
      setProgress(((i + 1) / results.length) * 100);
      
      // Small delay between requests to avoid rate limiting
      if (i < results.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setImporting(false);
    setStep("complete");
    
    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} user${successCount > 1 ? "s" : ""}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} user${errorCount > 1 ? "s" : ""}`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setParsedUsers([]);
      setStep("upload");
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }, 200);
    
    if (step === "complete") {
      onComplete();
    }
  };

  const getStatusBadge = (user: ParsedUser) => {
    switch (user.status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "processing":
        return <Badge variant="outline" className="animate-pulse">Processing...</Badge>;
      case "success":
        return <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10"><CheckCircle2 className="h-3 w-3 mr-1" />Success</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{user.error || "Error"}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Users</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple users at once
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Your CSV should have columns: <strong>email</strong> (required), <strong>name</strong> (optional), <strong>role</strong> (optional).
                Valid roles: consultant, member, admin, partner, account_lead, delivery_lead, practice_leader, engagement_lead.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">CSV files only</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {(step === "preview" || step === "importing" || step === "complete") && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {step === "importing" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importing users...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {step === "complete" && (
              <Alert className="bg-primary/10 border-primary/30">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary">
                  Import complete! Users will receive email invitations to set their passwords.
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">
              {parsedUsers.length} user{parsedUsers.length !== 1 ? "s" : ""} to import
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    {step === "preview" && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedUsers.map((user) => (
                    <TableRow key={user.email}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.name || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell><RoleBadge role={user.role} /></TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      {step === "preview" && (
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeUser(user.email)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {step === "preview" && (
                <>
                  <Button variant="outline" onClick={() => { setStep("upload"); setParsedUsers([]); }}>
                    Back
                  </Button>
                  <Button onClick={startImport} disabled={parsedUsers.length === 0}>
                    Import {parsedUsers.length} User{parsedUsers.length !== 1 ? "s" : ""}
                  </Button>
                </>
              )}
              {step === "importing" && (
                <Button disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </Button>
              )}
              {step === "complete" && (
                <Button onClick={handleClose}>
                  Done
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
