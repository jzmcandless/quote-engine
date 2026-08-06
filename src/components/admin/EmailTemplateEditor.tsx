import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";

interface LiveTemplate {
  name: string;
  displayName: string;
  subject: string;
  html: string;
}

const TRIGGERS: Record<string, string> = {
  "quote-ineligible-request":
    "Sent when a customer's vehicle is not eligible and they submit a custom quote request.",
  "quote-contact-captured":
    "Sent when a customer enters their contact details to view their quote.",
  "quote-purchase-submitted":
    "Sent when a customer submits their warranty purchase.",
};

export function EmailTemplateEditor() {
  const [templates, setTemplates] = useState<LiveTemplate[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("preview-quote-email");
      if (error) {
        setError("Could not load the live email templates.");
      } else {
        const list = (data?.templates ?? []) as LiveTemplate[];
        setTemplates(list);
        setActive(list[0]?.name ?? null);
      }
      setLoading(false);
    })();
  }, []);

  const current = templates.find((t) => t.name === active);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> Notification emails
        </CardTitle>
        <CardDescription>
          These are the live emails sent to everyone on your notification list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && (
          <>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <Button
                  key={t.name}
                  variant={t.name === active ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActive(t.name)}
                >
                  {t.displayName}
                </Button>
              ))}
            </div>

            {current && (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    When it sends
                  </p>
                  <p className="text-sm">{TRIGGERS[current.name] ?? ""}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground pt-2">
                    Subject
                  </p>
                  <p className="text-sm font-medium">{current.subject}</p>
                </div>

                <div className="rounded-lg border overflow-hidden bg-white">
                  <iframe
                    title={`${current.displayName} preview`}
                    srcDoc={current.html}
                    className="w-full h-[600px] border-0"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Sample data is shown for preview. Real emails use the customer's actual
                  vehicle, coverage and contact details.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
