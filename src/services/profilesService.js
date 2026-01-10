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
 */
export const getVotableUsers = async (excludeUserId = null) => {
    try {
        let query = supabase
            .from('votable_users')
            .select('*, profile:profiles(*)')
            .eq('active', true)
            .order('full_name');

        if (excludeUserId) {
            query = query.neq('profile_id', excludeUserId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        return { data: [], error: error.message };
    }
};

// ... (Autres fonctions de lecture gardées, mais fonctions d'écriture Admin supprimées car doivent passer par RPC/Admin Console)

export const profilesService = {
    getProfile,
    getAllProfiles,
    updateProfile,
    isAdmin,
    getVotableUsers,
    getAllVotableUsers
};
