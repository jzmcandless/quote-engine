// Renders the live staff-notification email templates for the admin UI.
// Admin-only: requires a signed-in user with the admin role.
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) return json(401, { error: 'unauthorized' })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userRes?.user) return json(401, { error: 'unauthorized' })

    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: userRes.user.id,
      _role: 'admin',
    })
    if (isAdmin !== true) return json(403, { error: 'forbidden' })

    const templates = []
    for (const [name, entry] of Object.entries(TEMPLATES)) {
      const data = entry.previewData ?? {}
      const html = await renderAsync(React.createElement(entry.component, data))
      templates.push({
        name,
        displayName: entry.displayName ?? name,
        subject: typeof entry.subject === 'function' ? entry.subject(data) : entry.subject,
        html,
      })
    }

    return json(200, { templates })
  } catch (err) {
    console.error('[preview-quote-email]', err)
    return json(500, { error: 'server_error' })
  }
})
