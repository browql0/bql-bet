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

        // 3. Le profil est créé automatiquement par le Trigger SQL (handle_new_user)
        // On n'a plus rien à faire ici manuellement.

        return { data: authData, error: null };

        return { data: authData, error: null };
    } catch (error) {
        console.error('Erreur inscription:', error);
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
            console.log('🧹 Removed:', key);
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
