import { supabase } from '../supabase/client';

/**
 * Récupère tous les paramètres
 */
export const getAllSettings = async () => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*');

        if (error) throw error;

        const settingsMap = {};
        data?.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        return { data: settingsMap, error: null };
    } catch (error) {
        console.error('Erreur chargement settings:', error);
        return { data: {}, error: error.message };
    }
};

/**
 * Récupère un paramètre spécifique
 */
export const getSetting = async (key) => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) throw error;

        return { value: data?.value, error: null };
    } catch (error) {
        return { value: null, error: error.message };
    }
};

/**
 * Met à jour un paramètre
 */
export const updateSetting = async (key, value) => {
    try {
        const { error } = await supabase
            .from('settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', key);

        if (error) throw error;

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Vérifie si les votes sont activés
 */
export const isVotingEnabled = async () => {
    const { value } = await getSetting('voting_enabled');
    return value === 'true';
};

/**
 * Vérifie si les votes sont anonymes
 */
export const areVotesAnonymous = async () => {
    const { value } = await getSetting('anonymous_votes');
    return value === 'true';
};

/**
 * Vérifie si les résultats sont visibles
 */
export const areResultsVisible = async () => {
    const { value } = await getSetting('show_results');
    return value === 'true';
};

export const settingsService = {
    getAllSettings,
    getSetting,
    updateSetting,
    isVotingEnabled,
    areVotesAnonymous,
    areResultsVisible
};
