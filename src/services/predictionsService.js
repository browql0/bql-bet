import { supabase } from '../supabase/client';

/**
 * Récupère toutes les prédictions de l'utilisateur
 */
export const getMyPredictions = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('predictions')
            .select(`
        *,
        target:profiles!predictions_target_id_fkey(full_name, matricule)
      `)
            .eq('voter_id', userId);

        if (error) throw error;

        // Parser votes_data si présent
        const parsedData = data?.map(pred => {
            if (pred.votes_data && typeof pred.votes_data === 'string') {
                try {
                    pred.votes_data = JSON.parse(pred.votes_data);
                } catch (err) {
                    // Invalid JSON, use as is
                }
            }
            return pred;
        });

        return { data: parsedData || [], error: null };
    } catch (error) {
        return { data: [], error: error.message };
    }
};

/**
 * Récupère les prédictions reçues par un utilisateur
 */
export const getPredictionsForUser = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('predictions')
            .select(`
        *,
        voter:profiles!predictions_voter_id_fkey(full_name, matricule)
      `)
            .eq('target_id', userId);

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        return { data: [], error: error.message };
    }
};

/**
 * Soumet une nouvelle prédiction
 * @param {string} voterId - ID de l'utilisateur qui vote
 * @param {string} targetId - ID de l'utilisateur pour qui on vote
 * @param {number} modules - Nombre de modules validés
 * @param {number} rattrapages - Nombre de rattrapages
 * @param {object} votesData - (Optionnel) Détail des votes par matière { "matière": "validated"|"retake" }
 */
export const submitPrediction = async (voterId, targetId, modules, rattrapages, votesData = null) => {
    try {
        // Vérifier si un vote existe déjà (vote unique - pas de modification)
        const { data: existing } = await supabase
            .from('predictions')
            .select('id')
            .eq('voter_id', voterId)
            .eq('target_id', targetId)
            .maybeSingle();

        if (existing) {
            return { success: false, error: 'Vous avez déjà voté pour cet étudiant. Les votes ne peuvent pas être modifiés.' };
        }

        // Préparer les données à insérer
        const predictionData = {
            voter_id: voterId,
            target_id: targetId,
            modules,
            rattrapages
        };

        // Si votes_data est fourni, le stocker (en JSON string si la colonne existe)
        if (votesData) {
            // Essayer de stocker dans votes_data si la colonne existe
            try {
                predictionData.votes_data = typeof votesData === 'string' ? votesData : JSON.stringify(votesData);
            } catch (err) {
                // Silently continue without votes_data
            }
        }

        const { error } = await supabase
            .from('predictions')
            .insert(predictionData);

        if (error) throw error;

        return { success: true, error: null };
    } catch (error) {
        let errorMessage = error.message;

        if (error.message?.includes('check constraint')) {
            errorMessage = 'Valeurs invalides (0-20)';
        } else if (error.message?.includes('voter_id != target_id')) {
            errorMessage = 'Tu ne peux pas voter pour toi-même';
        } else if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
            errorMessage = 'Vous avez déjà voté pour cet étudiant. Les votes ne peuvent pas être modifiés.';
        }

        return { success: false, error: errorMessage };
    }
};

/**
 * Supprime une prédiction
 */
export const deletePrediction = async (predictionId, userId) => {
    try {
        const { error } = await supabase
            .from('predictions')
            .delete()
            .eq('id', predictionId)
            .eq('voter_id', userId);

        if (error) throw error;

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Calcule les statistiques pour un utilisateur
 */
export const calculateUserStats = async (userId) => {
    try {
        const { data: predictions } = await getPredictionsForUser(userId);

        if (!predictions || predictions.length === 0) {
            return {
                totalVotes: 0,
                avgModules: 0,
                avgRattrapages: 0
            };
        }

        const totalVotes = predictions.length;
        const avgModules = predictions.reduce((sum, p) => sum + p.modules, 0) / totalVotes;
        const avgRattrapages = predictions.reduce((sum, p) => sum + p.rattrapages, 0) / totalVotes;

        return {
            totalVotes,
            avgModules: parseFloat(avgModules.toFixed(1)),
            avgRattrapages: parseFloat(avgRattrapages.toFixed(1))
        };
    } catch (error) {
        return { totalVotes: 0, avgModules: 0, avgRattrapages: 0 };
    }
};

/**
 * Récupère toutes les prédictions (admin)
 */
export const getAllPredictions = async () => {
    try {
        const { data, error } = await supabase
            .from('predictions')
            .select(`
        *,
        voter:profiles!predictions_voter_id_fkey(full_name),
        target:profiles!predictions_target_id_fkey(full_name)
      `);

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        return { data: [], error: error.message };
    }
};

/**
 * Supprime toutes les prédictions (admin)
 */
export const resetAllPredictions = async () => {
    try {
        const { error } = await supabase
            .from('predictions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) throw error;

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Calcule les statistiques globales (admin)
 */
export const getGlobalStats = async () => {
    try {
        const { data: predictions } = await getAllPredictions();
        const { data: profiles } = await supabase.from('profiles').select('*');

        if (!predictions || predictions.length === 0) {
            return {
                totalVotes: 0,
                totalUsers: profiles?.length || 0,
                mostVotedUser: null,
                avgModules: 0,
                avgRattrapages: 0
            };
        }

        const totalVotes = predictions.length;
        const avgModules = predictions.reduce((sum, p) => sum + p.modules, 0) / totalVotes;
        const avgRattrapages = predictions.reduce((sum, p) => sum + p.rattrapages, 0) / totalVotes;

        // Trouver l'étudiant le plus voté
        const votesByTarget = {};
        predictions.forEach(p => {
            votesByTarget[p.target_id] = (votesByTarget[p.target_id] || 0) + 1;
        });

        const mostVotedId = Object.entries(votesByTarget).sort((a, b) => b[1] - a[1])[0]?.[0];
        const mostVotedUser = profiles?.find(p => p.id === mostVotedId);

        return {
            totalVotes,
            totalUsers: profiles?.length || 0,
            mostVotedUser: mostVotedUser?.full_name || null,
            mostVotedCount: votesByTarget[mostVotedId] || 0,
            avgModules: parseFloat(avgModules.toFixed(1)),
            avgRattrapages: parseFloat(avgRattrapages.toFixed(1))
        };
    } catch (error) {
        return null;
    }
};

export const predictionsService = {
    getMyPredictions,
    getPredictionsForUser,
    submitPrediction,
    deletePrediction,
    calculateUserStats,
    getAllPredictions,
    resetAllPredictions,
    getGlobalStats
};
