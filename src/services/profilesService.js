import { supabase } from '../supabase/client';

/**
 * Récupère le profil d'un utilisateur
 */
export const getProfile = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

/**
 * Récupère tous les profils
 */
export const getAllProfiles = async () => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name');

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        return { data: [], error: error.message };
    }
};

/**
 * Met à jour le profil d'un utilisateur
 */
export const updateProfile = async (userId, updates) => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) throw error;

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Vérifie si un utilisateur est admin (Vérification serveur via RLS/RPC recommandée pour actions critiques)
 * Ici on lit juste le profil chargé, mais l'action réelle sera bloquée par RLS si n'est pas legit.
 */
export const isAdmin = async (userId) => {
    try {
        const { data } = await getProfile(userId);
        return data?.role === 'admin';
    } catch (error) {
        return false;
    }
};

/**
 * Récupère les utilisateurs votables (actifs)
 * Note: Utilise la vue 'votable_users' qui doit inclure tous les profils avec active=true
 * Si la vue n'existe pas, essaie directement depuis profiles
 */
export const getVotableUsers = async (excludeUserId = null) => {
    try {
        // Essayer d'abord avec la vue votable_users
        let query = supabase
            .from('votable_users')
            .select('*, profile:profiles(*)')
            .eq('active', true)
            .order('full_name');

        if (excludeUserId) {
            query = query.neq('profile_id', excludeUserId);
        }

        let { data, error } = await query;

        // Si la vue n'existe pas ou erreur, essayer directement depuis profiles
        if (error && (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist'))) {
            let profilesQuery = supabase
                .from('profiles')
                .select('*')
                .eq('active', true)
                .order('full_name');

            if (excludeUserId) {
                profilesQuery = profilesQuery.neq('id', excludeUserId);
            }

            const { data: profilesData, error: profilesError } = await profilesQuery;
            
            if (profilesError) throw profilesError;

            // Transformer les données pour correspondre au format attendu
            data = profilesData?.map(profile => ({
                id: profile.id,
                profile_id: profile.id,
                full_name: profile.full_name,
                active: profile.active,
                profile: profile
            })) || [];
            
            error = null;
        }

        if (error) throw error;

        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error: error.message };
    }
};

/**
 * Récupère tous les utilisateurs votables (sans exclusion)
 */
export const getAllVotableUsers = async () => {
    try {
        const { data, error } = await supabase
            .from('votable_users')
            .select('*, profile:profiles(*)')
            .eq('active', true)
            .order('full_name');

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        return { data: [], error: error.message };
    }
};

export const profilesService = {
    getProfile,
    getAllProfiles,
    updateProfile,
    isAdmin,
    getVotableUsers,
    getAllVotableUsers
};
