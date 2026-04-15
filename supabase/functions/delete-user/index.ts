/// <reference path="../_types/deno.d.ts" />
// @ts-ignore: npm: specifier is valid in Deno/Supabase Edge runtime
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hiérarchie des rôles (plus petit = plus de privilèges)
const ROLE_HIERARCHY: Record<string, number> = {
  'super_admin': 1,
  'admin_etat': 2,
  'directeur_aval': 3,
  'directeur_adjoint_aval': 3,
  'service_it': 1, // Autorité technique
  'directeur_importation': 3,
  'responsable_entreprise': 5
}

const USER_MANAGEMENT_ROLES = Object.keys(ROLE_HIERARCHY)

// Simple UUID regex validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
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

    // Verify calling user identity
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header requis', debug: 'Header completely missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!anonKey || !supabaseUrl) {
      console.error('Missing env vars:', { anonKey: !!anonKey, supabaseUrl: !!supabaseUrl })
      return new Response(
        JSON.stringify({ error: 'Configuration serveur erronée (variables environnement manquantes)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Extraction du jwt pur (au lieu d'utiliser le client global) est parfois plus fiable
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser(jwt)
    
    if (authError || !callerUser) {
      console.error('Auth verification failed:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Non autorisé', 
          details: authError?.message || 'Utilisateur introuvable',
          name: authError?.name 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check caller has a role allowed to delete users
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single()

    const callerRole = roleData.role;
    if (!roleData || !USER_MANAGEMENT_ROLES.includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: 'Permissions insuffisantes' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = await req.json()
    if (!userId || !UUID_REGEX.test(userId)) {
      return new Response(
        JSON.stringify({ error: 'userId invalide ou manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent self-deletion
    if (userId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: 'Impossible de supprimer son propre compte' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get target role to enforce hierarchy
    const { data: targetRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (targetRoleData) {
      const targetRole = targetRoleData.role;
      const callerLevel = ROLE_HIERARCHY[callerRole] || 99;
      const targetLevel = ROLE_HIERARCHY[targetRole] || 99;

      // Un admin ne peut pas supprimer un super_admin ou un rôle de même niveau/supérieur
      // Sauf super_admin et service_it qui peuvent gérer presque tout le monde (sauf eux-mêmes déjà bloqué)
      if (callerLevel > targetLevel && callerRole !== 'super_admin' && callerRole !== 'service_it') {
        return new Response(
          JSON.stringify({ error: 'Impossible de supprimer un utilisateur de niveau supérieur ou égal' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Delete from auth.users — cascades to profiles if FK is configured
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Explicitly clean up user_roles in case there's no cascade
    const { error: roleDeleteError } = await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
    if (roleDeleteError) console.error('Erreur nettoyage user_roles:', roleDeleteError)

    // Explicitly clean up profiles in case there's no cascade
    const { error: profileDeleteError } = await supabaseAdmin.from('profiles').delete().eq('user_id', userId)
    if (profileDeleteError) console.error('Erreur nettoyage profiles:', profileDeleteError)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Delete user error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
