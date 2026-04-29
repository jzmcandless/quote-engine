import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Mail, Plus } from "lucide-react";

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  created_at: string;
}

export function NotificationsRecipients() {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_recipients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({
        title: "Failed to load recipients",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setRecipients((data ?? []) as Recipient[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("notification_recipients").insert({
      email: newEmail.trim().toLowerCase(),
      name: newName.trim() || null,
      active: true,
    });
    setSaving(false);
    if (error) {
      toast({
        title: "Failed to add recipient",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setNewEmail("");
    setNewName("");
    toast({ title: "Recipient added" });
    load();
  }

  async function toggleActive(r: Recipient) {
    const { error } = await supabase
      .from("notification_recipients")
      .update({ active: !r.active })
      .eq("id", r.id);
    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setRecipients((rs) =>
      rs.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)),
    );
  }

  async function remove(r: Recipient) {
    const { error } = await supabase
      .from("notification_recipients")
      .delete()
      .eq("id", r.id);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setRecipients((rs) => rs.filter((x) => x.id !== r.id));
    toast({ title: "Recipient removed" });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
      >
        <div>
          <Label htmlFor="recipient-email" className="mb-1.5 block text-xs">
            Email
          </Label>
          <Input
            id="recipient-email"
            type="email"
            placeholder="alerts@yourcompany.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="recipient-name" className="mb-1.5 block text-xs">
            Name (optional)
          </Label>
          <Input
            id="recipient-name"
            placeholder="Sales Team"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-1" />
          )}
          Add
        </Button>
      </form>

      <div className="rounded-lg border border-border divide-y">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : recipients.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No recipients yet. Add one above to start receiving notifications.
          </div>
        ) : (
          recipients.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">
                  {r.email}
                </div>
                {r.name && (
                  <div className="text-xs text-muted-foreground truncate">
                    {r.name}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {r.active ? "Active" : "Paused"}
                </span>
                <Switch
                  checked={r.active}
                  onCheckedChange={() => toggleActive(r)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(r)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
