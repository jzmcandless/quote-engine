import { EmailTemplate, applyTokens } from "@/lib/emailTemplates";
import { EmailData } from "@/lib/emailSampleData";

interface EmailPreviewProps {
  template: EmailTemplate;
  data: EmailData;
}

export function EmailPreview({ template, data }: EmailPreviewProps) {
  const subject = applyTokens(template.subject, data.tokens);
  const heading = applyTokens(template.heading, data.tokens);
  const intro = applyTokens(template.intro, data.tokens);
  const footer = applyTokens(template.footer, data.tokens);

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      {/* Email client chrome */}
      <div className="border-b border-border bg-card px-4 py-3 space-y-1">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Subject:</span> {subject}
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">From:</span>{" "}
          notifications@yourdomain.com
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">To:</span>{" "}
          recipient@yourcompany.com
        </div>
      </div>

      {/* Email body — inline styles so it matches an actual sent email */}
      <div
        style={{
          background: "#ffffff",
          padding: "24px",
          fontFamily: "Inter, Arial, sans-serif",
          color: "#1f2937",
        }}
      >
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          <h1
            style={{
              fontFamily: "'DM Sans', Arial, sans-serif",
              fontSize: "22px",
              fontWeight: 700,
              color: "#0c4a6e",
              margin: "0 0 16px",
            }}
          >
            {heading}
          </h1>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#374151",
              margin: "0 0 24px",
              whiteSpace: "pre-wrap",
            }}
          >
            {intro}
          </p>

          {data.sections.map((section) => (
            <div
              key={section.title}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "14px 16px",
                marginBottom: "12px",
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  fontFamily: "'DM Sans', Arial, sans-serif",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#0EA5E9",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "8px",
                }}
              >
                {section.title}
              </div>
              <table style={{ width: "100%", fontSize: "13px" }}>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.label}>
                      <td
                        style={{
                          color: "#6b7280",
                          padding: "3px 8px 3px 0",
                          width: "45%",
                          verticalAlign: "top",
                        }}
                      >
                        {row.label}
                      </td>
                      <td
                        style={{
                          color: "#111827",
                          padding: "3px 0",
                          fontWeight: 500,
                        }}
                      >
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #e5e7eb",
              margin: "24px 0 16px",
            }}
          />
          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              margin: 0,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}
