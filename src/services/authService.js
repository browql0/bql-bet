import { supabase } from '../supabase/client';
import { studentService } from './studentService';

/**
 * Connexion (Email + Mot de passe)
 */
export const signIn = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                return { data: null, error: 'Email ou mot de passe incorrect' };
            }
            return { data: null, error: error.message };
        }

        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

/**
 * Inscription (Email + Mot de passe + Infos étudiant)
 */
export const signUp = async (email, password, studentInfo) => {
    try {
        // 1. Double validation (sécurité)
        const isUsed = await studentService.isMatriculeAlreadyUsed(studentInfo.matricule);
        if (isUsed) {
            return { data: null, error: 'Un compte existe déjà pour cet étudiant.' };
        }

        // 2. Création du compte auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: studentInfo.nom,
                    matricule: studentInfo.matricule
                }
            }
        });

        if (authError) return { data: null, error: authError.message };
        if (!authData.user) return { data: null, error: 'Erreur lors de la création du compte' };

        // 3. Créer le profil manuellement si le trigger SQL ne l'a pas fait
        // Attendre un peu pour laisser le trigger faire son travail
        await new Promise(resolve => setTimeout(resolve, 500));

        // Vérifier si le profil existe déjà (créé par trigger)
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', authData.user.id)
            .maybeSingle();

        // Si le profil n'existe pas, le créer manuellement
        if (!existingProfile) {
            // Préparer les données du profil
            const profileData = {
                id: authData.user.id,
                full_name: studentInfo.nom,
                matricule: studentInfo.matricule,
                active: true, // IMPORTANT : Actif par défaut pour apparaître dans les votes
                role: 'student'
            };

            // Ajouter groupe et sous_groupe si disponibles
            if (studentInfo.gp) {
                profileData.groupe = studentInfo.gp;
            }
            if (studentInfo.sgp) {
                profileData.sous_groupe = studentInfo.sgp;
            }
            
            const { error: profileError } = await supabase
                .from('profiles')
                .insert(profileData);

            if (profileError) {
                // Ne pas bloquer l'inscription si l'insertion échoue (peut être un problème de permissions)
                // Le trigger devrait créer le profil, ou un admin pourra le faire
                // Mais on retourne quand même le succès pour que l'utilisateur puisse se connecter
            }
        } else {
            // Si le profil existe déjà, s'assurer qu'il est actif pour apparaître dans les votes
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ active: true })
                .eq('id', authData.user.id);

            // Silently continue - profile exists
        }

        return { data: authData, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

/**
 * Déconnexion
 */
export const signOut = async () => {
    try {
        // 1. Set a flag to indicate user explicitly logged out
        localStorage.setItem('user-logged-out', 'true');

        // 2. Clear Supabase session globally
        const { error } = await supabase.auth.signOut({ scope: 'global' });

        // 3. Manually clear ALL Supabase-related localStorage items
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        return { error };
    } catch (err) {
        console.error('Logout error:', err);
        return { error: err };
    }
};

/**
 * Récupérer la session courante
 */
export const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
};

/**
 * Écouter les changements d'auth
 */
export const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange(callback);
};

export const authService = {
    signIn,
    signUp,
    signOut,
    getSession,
    onAuthStateChange
};
