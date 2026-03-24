import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
}

interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: string; // Use string to accept all AppRoles defined in DB
  prenom?: string;
  phone?: string;
  region?: string;
  prefecture?: string;
  commune?: string;
  organisation?: string;
  direction?: string;
  poste?: string;
  sexe?: 'M' | 'F';
  date_naissance?: string;
  adresse?: string;
  matricule?: string;
  force_password_change?: boolean;
  entreprise_id?: string;
  station_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the authorization header to verify calling user has permission
    const authHeader = req.headers.get('Authorization')
    
    if (authHeader) {
      // Create a client with the SERVICE_ROLE_KEY but use the user's Authorization header to check identity
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      })
      
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: `Unauthorized: ${authError?.message || 'User not found'}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user has admin privileges
      const { data: roleData, error: dbRoleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (dbRoleError) {
        return new Response(
          JSON.stringify({ success: false, error: `DB Role Error: ${dbRoleError.message}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const adminRoles = [
        'super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 
        'service_it', 'directeur_aval', 'directeur_adjoint_aval', 
        'directeur_administratif', 'directeur_logistique', 'directeur_financier', 
        'directeur_importation', 'directeur_juridique', 'secretariat_direction'
      ];

      if (!roleData || !adminRoles.includes(roleData.role)) {
        return new Response(
          JSON.stringify({ success: false, error: `Insufficient permissions: Role "${roleData?.role}" not authorized` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Allow initial admin creation with special key (for bootstrapping)
      const adminKey = req.headers.get('x-admin-key')
      if (adminKey !== 'SIHG_BOOTSTRAP_2026') {
        return new Response(
          JSON.stringify({ success: false, error: 'Authorization required: Missing auth header or admin key' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const payload: CreateUserPayload = await req.json()

    // Validate required fields
    if (!payload.email || !payload.password || !payload.full_name || !payload.role) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: email, password, full_name, role' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user with admin API
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name
      }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ success: false, error: `Auth Error: ${createError.message}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // Update profile with additional info
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: payload.full_name,
        prenom: payload.prenom || null,
        phone: payload.phone || null,
        region: payload.region || null,
        prefecture: payload.prefecture || null,
        commune: payload.commune || null,
        organisation: payload.organisation || null,
        direction: payload.direction || null,
        poste: payload.poste || null,
        sexe: payload.sexe || null,
        date_naissance: payload.date_naissance || null,
        adresse: payload.adresse || null,
        matricule: payload.matricule || null,
        force_password_change: payload.force_password_change || false,
        entreprise_id: payload.entreprise_id || null,
        station_id: payload.station_id || null
      })
      .eq('user_id', userId)

    if (profileError) {
      return new Response(
        JSON.stringify({ success: false, error: `Profile Update Error: ${profileError.message}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update role (trigger already creates default role)
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: payload.role })
      .eq('user_id', userId)

    if (roleInsertError) {
      // Try insert if update affected 0 rows
      const { error: roleRetryError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: userId, role: payload.role }, { onConflict: 'user_id' })

      if (roleRetryError) {
        return new Response(
          JSON.stringify({ success: false, error: `Role Update/Upsert Error: ${roleRetryError.message}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: userId,
          email: payload.email,
          full_name: payload.full_name,
          role: payload.role
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Create user error:', error)
    return new Response(
      JSON.stringify({ success: false, error: `Internal Catch Error: ${error instanceof Error ? error.message : String(error)}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
