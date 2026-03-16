import { supabase } from '@/integrations/supabase/client';

export type AuditActionType = 'LOGIN' | 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'DOWNLOAD';
export type AuditStatus = 'success' | 'failed';

export interface AuditLog {
  user_email?: string;
  action_type: AuditActionType;
  resource_type?: string;
  resource_name?: string;
  details?: Record<string, any>;
  status: AuditStatus;
  error_message?: string;
  entreprise_id?: string;
}

/**
 * Log an action to the audit table
 * Note: audit_logs table must be created in Supabase first
 * Run: supabase/audit_logs_table.sql
 */
export async function logAuditAction(log: Partial<AuditLog>): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('No authenticated user found for audit log');
      return { success: false, error: 'User not authenticated' };
    }

    // Get user enterprise if they're a responsable_entreprise
    let entreprise_id = log.entreprise_id;
    if (!entreprise_id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.entreprise_id) {
          entreprise_id = profile.entreprise_id;
        }
      } catch {
        // Profile fetch failed, continue without it
      }
    }

    // Prepare audit log entry
    const auditEntry = {
      user_id: user.id,
      user_email: log.user_email || user.email || 'unknown',
      action_type: log.action_type,
      resource_type: log.resource_type,
      resource_name: log.resource_name,
      status: log.status,
      error_message: log.error_message,
      entreprise_id: entreprise_id,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
      details: {
        ...(log.details || {}),
        device_id: getDeviceId()
      }
    };

    // Insert into audit_logs table
    const { error } = await (supabase as any)
      .from('audit_logs')
      .insert([auditEntry]);

    if (error) {
      console.warn('Audit logging skipped (table may not exist):', error);
      // Don't throw, continue gracefully
      return { success: true };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Error logging audit action:', err);
    // Don't throw errors for audit logging
    return { success: true };
  }
}

/**
 * Log user login
 */
export async function logLogin(): Promise<void> {
  await logAuditAction({
    action_type: 'LOGIN',
    status: 'success',
    details: { login_timestamp: new Date().toISOString() }
  });
}

/**
 * Log viewing a resource
 */
export async function logViewResource(
  resourceType: string,
  resourceName: string,
  resourceId?: string
): Promise<void> {
  await logAuditAction({
    action_type: 'VIEW',
    resource_type: resourceType,
    resource_name: resourceName,
    status: 'success',
    details: { resource_id: resourceId }
  });
}

/**
 * Log creating a resource
 */
export async function logCreateResource(
  resourceType: string,
  resourceName: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditAction({
    action_type: 'CREATE',
    resource_type: resourceType,
    resource_name: resourceName,
    status: 'success',
    details
  });
}

/**
 * Log updating a resource
 */
export async function logUpdateResource(
  resourceType: string,
  resourceName: string,
  changes?: Record<string, any>,
  resourceId?: string
): Promise<void> {
  await logAuditAction({
    action_type: 'UPDATE',
    resource_type: resourceType,
    resource_name: resourceName,
    status: 'success',
    details: { changes, resource_id: resourceId }
  });
}

/**
 * Log deleting a resource
 */
export async function logDeleteResource(
  resourceType: string,
  resourceName: string,
  resourceId?: string
): Promise<void> {
  await logAuditAction({
    action_type: 'DELETE',
    resource_type: resourceType,
    resource_name: resourceName,
    status: 'success',
    details: { resource_id: resourceId }
  });
}

/**
 * Log exporting data
 */
export async function logExportData(
  dataType: string,
  format: string,
  recordCount?: number
): Promise<void> {
  await logAuditAction({
    action_type: 'EXPORT',
    resource_type: dataType,
    resource_name: `Export en ${format}`,
    status: 'success',
    details: { format, record_count: recordCount }
  });
}

/**
 * Log downloading a file
 */
export async function logDownloadFile(
  fileName: string,
  fileSize?: number
): Promise<void> {
  await logAuditAction({
    action_type: 'DOWNLOAD',
    resource_type: 'file',
    resource_name: fileName,
    status: 'success',
    details: { file_size: fileSize }
  });
}

/**
 * Log an action failure
 */
export async function logFailedAction(
  actionType: AuditActionType,
  resourceType: string,
  resourceName: string,
  errorMessage: string
): Promise<void> {
  await logAuditAction({
    action_type: actionType,
    resource_type: resourceType,
    resource_name: resourceName,
    status: 'failed',
    error_message: errorMessage
  });
}

/**
 * Helper function to get client IP
 */
async function getClientIP(): Promise<string> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(id);
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Fetch audit logs with optional filters
 */
export async function fetchAuditLogs(filters?: {
  startDate?: string;
  endDate?: string;
  actionType?: string;
  userEmail?: string;
  limit?: number;
}) {
  try {
    let query = (supabase as any)
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters?.userEmail) {
      query = query.ilike('user_email', `%${filters.userEmail}%`);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100); // Default limit
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Audit logs fetch warning:', error);
      return { data: [], error: null }; // Return empty array if table doesn't exist
    }
    return { data: data || [], error: null };
  } catch (err: any) {
    console.warn('Audit logs fetch failed:', err);
    return { data: [], error: null }; // Return empty array
  }
}

/**
 * Helper to get or create a persistent device ID
 */
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('sihg_device_id');
  if (!deviceId) {
    deviceId = 'DEV-' + Math.random().toString(36).substring(2, 11).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    localStorage.setItem('sihg_device_id', deviceId);
  }
  return deviceId;
}
