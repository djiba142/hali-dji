import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface SendNotificationParams {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    category?: string;
    metadata?: any;
}

/**
 * Sends a notification to a specific user.
 * In a real-world app, this would also trigger SMS/Email via Edge Functions.
 */
export const sendNotification = async ({
    userId,
    title,
    message,
    type = 'info',
    category = 'system',
    metadata = {}
}: SendNotificationParams) => {
    try {
        const { error } = await (supabase.from('notifications' as any) as any).insert({
            user_id: userId,
            title,
            message,
            type,
            category,
            metadata,
            read: false,
        });

        if (error) throw error;

        // Mock SMS/Email Triggers
        console.log(`[NOTIFICATION] Sent to ${userId}: ${title} - ${message}`);
        
        return { success: true };
    } catch (error) {
        console.error("Error sending notification:", error);
        return { success: false, error };
    }
};

/**
 * Convenience method for station status updates
 */
export const notifyStationStatusUpdate = async (station: any, newStatus: string) => {
    const statusLabels: Record<string, string> = {
        'attente_dsa': 'Attente Validation Technique (DSA)',
        'attente_dla': 'Attente Validation Administrative (DLA)',
        'attente_djc': 'Attente Certification Juridique (DJ/C)',
        'attente_dsi': 'Attente Activation SIHG (DSI)',
        'ouverte': 'Activée et Opérationnelle',
        'rejete': 'Rejetée'
    };

    const title = `Mise à jour Dossier: ${station.nom}`;
    const message = `Le statut de votre installation a été mis à jour: ${statusLabels[newStatus] || newStatus}`;

    // Here we should find the responsible_entreprise for this station
    // For now, we'll notify the 'user_id' if available or log it
    if (station.created_by) {
        await sendNotification({
            userId: station.created_by,
            title,
            message,
            type: 'info',
            category: 'station',
            metadata: { station_id: station.id, status: newStatus }
        });
    }
};
