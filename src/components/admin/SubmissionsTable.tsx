import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Download, Search } from "lucide-react";
import { SubmissionDetailDrawer, QuoteSession } from "./SubmissionDetailDrawer";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In Progress" },
  { value: "abandoned", label: "Abandoned" },
  { value: "completed_purchase", label: "Purchased" },
  { value: "completed_custom_request", label: "Custom Request" },
  { value: "completed_ineligible", label: "Ineligible" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-900 hover:bg-blue-100" },
  abandoned: { label: "Abandoned", className: "bg-amber-100 text-amber-900 hover:bg-amber-100" },
  completed_purchase: { label: "Purchased", className: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100" },
  completed_custom_request: { label: "Custom Request", className: "bg-purple-100 text-purple-900 hover:bg-purple-100" },
  completed_ineligible: { label: "Ineligible", className: "bg-rose-100 text-rose-900 hover:bg-rose-100" },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function vehicleLabel(v: any) {
  if (!v) return "—";
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "—";
}

export function SubmissionsTable() {
  const [rows, setRows] = useState<QuoteSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<QuoteSession | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase.from("quote_sessions").select("*").order("last_activity_at", { ascending: false }).limit(500);
    if (status !== "all") q = q.eq("status", status);
    const { data } = await q;
    setRows((data ?? []) as QuoteSession[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [status]);

  useEffect(() => {
    const channel = supabase
      .channel("quote_sessions_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "quote_sessions" }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = [
        r.email, r.first_name, r.last_name, r.phone,
        vehicleLabel(r.vehicle),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(s);
    });
  }, [rows, search]);

  function exportCSV() {
    const headers = [
      "Created", "Last Activity", "Status", "Step", "First Name", "Last Name",
      "Email", "Phone", "Vehicle", "Vehicle Class", "Plan", "Years", "Mileage",
      "Deductible", "Price", "Eligible", "Ineligible Message", "Referrer", "User Agent",
    ];
    const csvRows = [headers.join(",")];
    for (const r of filtered) {
      const cov: any = r.coverage || {};
      const cells = [
        formatDate(r.created_at),
        formatDate(r.last_activity_at),
        r.status,
        String(r.current_step ?? ""),
        r.first_name ?? "",
        r.last_name ?? "",
        r.email ?? "",
        r.phone ?? "",
        vehicleLabel(r.vehicle),
        r.vehicle_class ?? "",
        cov.planName ?? "",
        cov.yearsCovered ?? "",
        cov.mileageCovered ?? "",
        cov.deductible ?? "",
        r.price ?? "",
        r.is_eligible === null ? "" : String(r.is_eligible),
        r.ineligible_message ?? "",
        r.referrer ?? "",
        r.user_agent ?? "",
      ].map((v) => {
        const str = String(v ?? "");
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      });
      csvRows.push(cells.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-60 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, vehicle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No submissions found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const badge = STATUS_BADGE[r.status] ?? { label: r.status, className: "" };
                const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || "—";
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <TableCell>
                      <Badge className={badge.className} variant="secondary">{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.email || "—"}</TableCell>
                    <TableCell>{vehicleLabel(r.vehicle)}</TableCell>
                    <TableCell>{r.current_step}/6</TableCell>
                    <TableCell>{r.price != null ? `$${Number(r.price).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(r.last_activity_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <SubmissionDetailDrawer
        session={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
