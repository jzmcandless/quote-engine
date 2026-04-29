import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, RotateCcw } from "lucide-react";
import {
  EmailTemplate,
  EmailTemplateKey,
  loadTemplate,
  saveTemplate,
  resetTemplate,
  DEFAULT_TEMPLATES,
} from "@/lib/emailTemplates";
import { getSampleData } from "@/lib/emailSampleData";
import { EmailPreview } from "./EmailPreview";

const KEYS: EmailTemplateKey[] = [
  "ineligible-quote-request",
  "purchase-completed",
];

function TemplateForm({ templateKey }: { templateKey: EmailTemplateKey }) {
  const { toast } = useToast();
  const [template, setTemplate] = useState<EmailTemplate>(() =>
    loadTemplate(templateKey),
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTemplate(loadTemplate(templateKey));
    setDirty(false);
  }, [templateKey]);

  function update<K extends keyof EmailTemplate>(
    field: K,
    value: EmailTemplate[K],
  ) {
    setTemplate((t) => ({ ...t, [field]: value }));
    setDirty(true);
  }

  function handleSave() {
    saveTemplate(template);
    setDirty(false);
    toast({ title: "Template saved" });
  }

  function handleReset() {
    const defaults = resetTemplate(templateKey);
    setTemplate(defaults);
    setDirty(false);
    toast({ title: "Reset to default" });
  }

  const sample = getSampleData(templateKey);
  const def = DEFAULT_TEMPLATES[templateKey];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor */}
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {def.description} Use{" "}
          <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
            {"{{firstName}}"}
          </code>{" "}
          and{" "}
          <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
            {"{{lastName}}"}
          </code>{" "}
          for personalization.
        </p>

        <div>
          <Label htmlFor="subject" className="mb-1.5 block text-xs">
            Subject
          </Label>
          <Input
            id="subject"
            value={template.subject}
            onChange={(e) => update("subject", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="heading" className="mb-1.5 block text-xs">
            Heading
          </Label>
          <Input
            id="heading"
            value={template.heading}
            onChange={(e) => update("heading", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="intro" className="mb-1.5 block text-xs">
            Intro paragraph
          </Label>
          <Textarea
            id="intro"
            rows={4}
            value={template.intro}
            onChange={(e) => update("intro", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="footer" className="mb-1.5 block text-xs">
            Footer
          </Label>
          <Textarea
            id="footer"
            rows={2}
            value={template.footer}
            onChange={(e) => update("footer", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={!dirty}>
            <Save className="w-4 h-4 mr-1" /> Save changes
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" /> Reset to default
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          The data sections below the intro (customer, vehicle, coverage,
          pricing) render automatically from the actual submission data and
          aren't editable here — this keeps the email content safe and
          consistent.
        </p>
      </div>

      {/* Preview */}
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-medium">
          Live preview
        </div>
        <EmailPreview template={template} data={sample} />
      </div>
    </div>
  );
}

export function EmailTemplateEditor() {
  return (
    <Tabs defaultValue={KEYS[0]} className="w-full">
      <TabsList>
        {KEYS.map((k) => (
          <TabsTrigger key={k} value={k}>
            {DEFAULT_TEMPLATES[k].name}
          </TabsTrigger>
        ))}
      </TabsList>
      {KEYS.map((k) => (
        <TabsContent key={k} value={k} className="mt-4">
          <TemplateForm templateKey={k} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
