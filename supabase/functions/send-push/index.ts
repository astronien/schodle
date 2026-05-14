import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { employee_id, role, title, body, url } = await req.json()

    if (!employee_id && !role) {
      throw new Error('employee_id or role is required')
    }

    let targetEmployeeIds: string[] = []

    if (employee_id) {
      targetEmployeeIds = [employee_id]
    } else if (role) {
      const { data: employees, error: empError } = await supabaseClient
        .from('employees')
        .select('id')
        .eq('role', role)
      
      if (empError) throw empError
      targetEmployeeIds = employees.map((e: { id: string }) => e.id)
    }

    if (targetEmployeeIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No target employees found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 1. Get all subscriptions for these employees
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('subscription, employee_id')
      .in('employee_id', targetEmployeeIds)

    if (subError) throw subError
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Setup web-push
    webpush.setVapidDetails(
      'mailto:admin@example.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    // 3. Send notifications to all devices
    const results = await Promise.all(
      subscriptions.map(async (sub: { subscription: PushSubscriptionJSON }) => {
        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({ title, body, url: url || '/' })
          )
          return { success: true }
        } catch (err: unknown) {
          const error = err as { statusCode?: number; message?: string }
          console.error('Send error:', err)
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabaseClient
              .from('push_subscriptions')
              .delete()
              .eq('subscription', sub.subscription)
          }
          return { success: false, error: error.message || 'Send failed' }
        }
      })
    )

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Request failed'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
