import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, MailX, XCircle } from "lucide-react";

type State = "loading" | "valid" | "used" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setState("invalid");
        if (data?.used || data?.already_unsubscribed) return setState("used");
        setState("valid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    setBusy(false);
    setState(error ? "error" : "done");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          {state === "loading" && <p className="text-muted-foreground">Checking your link…</p>}

          {state === "valid" && (
            <>
              <MailX className="w-10 h-10 text-primary mx-auto" />
              <h1 className="text-xl font-heading font-bold">Unsubscribe from emails?</h1>
              <p className="text-sm text-muted-foreground">
                You'll stop receiving emails from Eastgate Ford Extended Warranty.
              </p>
              <Button onClick={confirm} disabled={busy} size="lg" className="w-full">
                {busy ? "Unsubscribing…" : "Confirm unsubscribe"}
              </Button>
            </>
          )}

          {state === "done" && (
            <>
              <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
              <h1 className="text-xl font-heading font-bold">You're unsubscribed</h1>
              <p className="text-sm text-muted-foreground">You won't receive further emails from us.</p>
            </>
          )}

          {state === "used" && (
            <>
              <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
              <h1 className="text-xl font-heading font-bold">Already unsubscribed</h1>
              <p className="text-sm text-muted-foreground">This address has already been removed.</p>
            </>
          )}

          {(state === "invalid" || state === "error") && (
            <>
              <XCircle className="w-10 h-10 text-destructive mx-auto" />
              <h1 className="text-xl font-heading font-bold">Link not valid</h1>
              <p className="text-sm text-muted-foreground">
                This unsubscribe link is invalid or has expired.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
