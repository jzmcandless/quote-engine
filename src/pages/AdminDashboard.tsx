import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Upload, Database, FileSpreadsheet, Loader2, Bell, Inbox } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { parsePricingCSV } from "@/lib/csvParser";
import { NotificationsRecipients } from "@/components/admin/NotificationsRecipients";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";
import { SubmissionsTable } from "@/components/admin/SubmissionsTable";

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importType, setImportType] = useState("pricing");
  const [stats, setStats] = useState({ vehicles: 0, plans: 0, pricing: 0, rules: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate("/admin/login"); return; }
      const { data: isAdmin, error } = await supabase.rpc("has_role", {
        _user_id: data.session.user.id,
        _role: "admin",
      });
      if (error || !isAdmin) {
        await supabase.auth.signOut();
        navigate("/admin/login");
        return;
      }
      setUser(data.session.user);
      loadStats();
      setLoading(false);
    })();
  }, []);

  async function loadStats() {
    const [v, p, pr, r] = await Promise.all([
      supabase.from("vehicles").select("id", { count: "exact", head: true }),
      supabase.from("plans").select("id", { count: "exact", head: true }),
      supabase.from("coverage_pricing").select("id", { count: "exact", head: true }),
      supabase.from("eligibility_rules").select("id", { count: "exact", head: true }),
    ]);
    setStats({
      vehicles: v.count ?? 0,
      plans: p.count ?? 0,
      pricing: pr.count ?? 0,
      rules: r.count ?? 0,
    });
  }

  const handleCSVUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const text = await file.text();

      if (importType === "pricing") {
        const parsed = parsePricingCSV(text);

        // Collect unique plan names and auto-create if needed
        const uniquePlans = [...new Set(parsed.map((r) => r.planName))];
        const { data: existingPlans } = await supabase.from("plans").select("id, name");
        const planMap = new Map(existingPlans?.map((p) => [p.name.toLowerCase(), p.id]) ?? []);

        for (const name of uniquePlans) {
          if (!planMap.has(name.toLowerCase())) {
            const { data: newPlan } = await supabase
              .from("plans")
              .insert({ name, active: true })
              .select("id")
              .single();
            if (newPlan) planMap.set(name.toLowerCase(), newPlan.id);
          }
        }

        const rows = parsed.map((r) => ({
          plan_id: planMap.get(r.planName.toLowerCase())!,
          vehicle_class: r.vehicleClass,
          years_covered: r.yearsCovered,
          mileage_covered: r.mileageCovered,
          deductible: r.deductible,
          deductible_cost: r.deductibleCost,
          price: r.price,
          rental_plus: r.rentalPlus,
        }));

        const { error } = await supabase.from("coverage_pricing").insert(rows);
        if (error) throw error;

        toast({ title: "Import successful", description: `${rows.length} pricing rows imported (unpivoted from ${parsed.length / (new Set(parsed.map(r => r.vehicleClass)).size) || 1} CSV rows).` });
      } else if (importType === "eligibility") {
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(",").map((v) => v.trim());
          rows.push({
            make: vals[headers.indexOf("make")] || null,
            model: vals[headers.indexOf("model")] || null,
            min_year: vals[headers.indexOf("min_year")] ? Number(vals[headers.indexOf("min_year")]) : null,
            max_year: vals[headers.indexOf("max_year")] ? Number(vals[headers.indexOf("max_year")]) : null,
            max_mileage: vals[headers.indexOf("max_mileage")] ? Number(vals[headers.indexOf("max_mileage")]) : null,
            eligible: vals[headers.indexOf("eligible")]?.toLowerCase() !== "false",
            ineligible_message: vals[headers.indexOf("ineligible_message")] || null,
          });
        }
        const { error } = await supabase.from("eligibility_rules").insert(rows);
        if (error) throw error;
        toast({ title: "Import successful", description: `${rows.length} eligibility rules imported.` });
      }

      await loadStats();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
    setImporting(false);
    e.target.value = "";
  }, [importType, toast]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-lg font-heading font-bold text-foreground">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Vehicles", value: stats.vehicles, icon: Database },
            { label: "Plans", value: stats.plans, icon: FileSpreadsheet },
            { label: "Pricing Rows", value: stats.pricing, icon: FileSpreadsheet },
            { label: "Eligibility Rules", value: stats.rules, icon: Database },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="submissions" className="w-full">
          <TabsList>
            <TabsTrigger value="submissions">
              <Inbox className="w-4 h-4 mr-1.5" /> Submissions
            </TabsTrigger>
            <TabsTrigger value="csv">
              <Upload className="w-4 h-4 mr-1.5" /> CSV Import
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-1.5" /> Email Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submissions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Inbox className="w-5 h-5" /> Quote Submissions
                </CardTitle>
                <CardDescription>
                  Every quote attempt — completed, in progress, and abandoned.
                  Sessions inactive for over 30 minutes are marked as abandoned automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubmissionsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csv" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Upload className="w-5 h-5" /> CSV Import
                </CardTitle>
                <CardDescription>Upload pricing or eligibility data via CSV</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-1.5 block">Import Type</Label>
                  <Select value={importType} onValueChange={setImportType}>
                    <SelectTrigger className="w-60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pricing">Pricing Matrix</SelectItem>
                      <SelectItem value="eligibility">Eligibility Rules</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1.5 block">CSV File</Label>
                  <Input type="file" accept=".csv" onChange={handleCSVUpload} disabled={importing} />
                  {importing && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Importing...
                    </div>
                  )}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  {importType === "pricing" ? (
                    <>
                      <p className="font-medium text-foreground mb-1">Pricing CSV format (matrix/pivot):</p>
                      <code className="text-xs block">Plan Type, (term), Distance Coverage, Category A, ..., Category H, Rental Plus!, $0 Deductible, Disappearing Deductible, $50 Deductible, $200 Deductible</code>
                      <p className="mt-2 text-xs">Categories are unpivoted into individual rows. Each deductible column creates separate pricing entries. Prices can have $ and commas. Term like "4 Year Plan" is auto-parsed.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground mb-1">Eligibility CSV format:</p>
                      <code className="text-xs">make,model,min_year,max_year,max_mileage,eligible,ineligible_message</code>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Bell className="w-5 h-5" /> Notification Recipients
                </CardTitle>
                <CardDescription>
                  People who will receive automated notifications when customers
                  complete a purchase or submit a custom quote request.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationsRecipients />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Email Templates</CardTitle>
                <CardDescription>
                  Preview and edit the content of the notification emails.
                  Email sending isn't wired up yet — saved changes will be used
                  once it's enabled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmailTemplateEditor />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
