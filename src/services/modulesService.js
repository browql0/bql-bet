import { supabase } from '../supabase/client';

/**
 * Récupère la liste des matières/modules depuis les settings
 * Si non définie, utilise une liste par défaut
 */
export const getModulesList = async () => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'modules_list')
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

        if (data?.value) {
            try {
                return { data: JSON.parse(data.value), error: null };
            } catch (parseError) {
                // Use default modules if parsing fails
            }
        }

        // Liste par défaut si non configurée
        const defaultModules = [
            'Analyse',
            'Algèbre',
            'Probabilités',
            'Statistiques',
            'Informatique',
            'Physique',
            'Anglais',
            'Communication'
        ];

        return { data: defaultModules, error: null };
    } catch (error) {
        // Retourner liste par défaut en cas d'erreur
        return { 
            data: [
                'Analyse',
                'Algèbre',
                'Probabilités',
                'Statistiques',
                'Informatique'
            ], 
            error: null 
        };
    }
};

export const modulesService = {
    getModulesList
};

