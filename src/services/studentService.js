import { supabase } from '../supabase/client';
import etudiantsData from '../../etudiant.json';

/**
 * Récupère tous les étudiants depuis le fichier JSON
 */
export const getAllStudents = () => {
    return etudiantsData;
};

/**
 * Normalise une chaîne en tokens (mots) majuscules sans accents
 */
const getNametokens = (name) => {
    if (!name) return [];
    return name
        .trim()
        .toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlever accents
        .replace(/[^A-Z0-9\s]/g, '') // Garder uniquement alphanum et espaces
        .split(/\s+/) // Séparer par espace
        .filter(token => token.length > 0); // Enlever vides
};

/**
 * Récupère un étudiant par son nom (Flexible : Ordre indifférent, Subset accepté si unique)
 */
export const getStudentByName = (name) => {
    if (!name || !name.trim()) return { match: null, error: null };

    const inputTokens = getNametokens(name);
    if (inputTokens.length === 0) return { match: null, error: 'Nom vide' };

    // 1. Chercher correspondance exacte (permutation acceptée)
    // Ex: "Bilal Mouttali" == "MOUTTALI BILAL"
    const exactMatches = etudiantsData.filter(student => {
        const studentTokens = getNametokens(student.nom);
        // Vérifier si même nombre de mots et mêmes mots (sets égaux)
        if (studentTokens.length !== inputTokens.length) return false;
        const studentSet = new Set(studentTokens);
        return inputTokens.every(token => studentSet.has(token));
    });

    if (exactMatches.length === 1) return { match: exactMatches[0], error: null };
    if (exactMatches.length > 1) return { match: null, error: 'Plusieurs étudiants correspondent exactement. Contactez l\'admin.' };

    // 2. Si pas de match exact, chercher correspondance partielle (Subset match)
    // Ex: "Mouttali" est dans "MOUTTALI BILAL"
    const subsetMatches = etudiantsData.filter(student => {
        const studentTokens = getNametokens(student.nom);
        // Tous les tokens d'entrée doivent être dans le nom de l'étudiant
        return inputTokens.every(token => studentTokens.includes(token));
    });

    if (subsetMatches.length === 1) {
        return { match: subsetMatches[0], error: null };
    }

    if (subsetMatches.length > 1) {
        // Si trop de résultats (ex: "Mohamed"), on demande plus de précision
        const namesFound = subsetMatches.slice(0, 3).map(s => s.nom).join(', ');
        return {
            match: null,
            error: `Plusieurs étudiants trouvés (${subsetMatches.length}). Soyez plus précis (ex: ${namesFound}...)`
        };
    }

    return { match: null, error: null };
};

/**
 * Vérifie si un matricule est déjà utilisé par un compte
 */
export const isMatriculeAlreadyUsed = async (matricule) => {
    try {
        if (!matricule) {
            console.warn('⚠️ Matricule vide fourni à isMatriculeAlreadyUsed');
            return false;
        }

        console.log('🔍 Vérification matricule:', matricule);

        // Safety: Timeout after 5s
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout Supabase')), 5000)
        );

        const query = supabase
            .from('profiles')
            .select('matricule, full_name')
            .eq('matricule', matricule)
            .limit(1);

        const { data, error } = await Promise.race([query, timeout]);

        if (error) {
            console.error('❌ Erreur vérification matricule:', error);
            // En cas d'erreur, on bloque par sécurité
            return true; // Considère comme déjà utilisé pour sécurité
        }

        const isUsed = data && data.length > 0;

        if (isUsed) {
            console.log('⛔ Matricule déjà utilisé:', matricule, '- Compte:', data[0].full_name);
        } else {
            console.log('✅ Matricule disponible:', matricule);
        }

        return isUsed;
    } catch (error) {
        if (error.message === 'Timeout Supabase') {
            console.error('⏱️ Timeout lors de la vérification du matricule');
            // En cas de timeout, bloquer par sécurité
            return true;
        }
        console.error('❌ Erreur lors de la vérification du matricule:', error);
        // En cas d'erreur, on bloque par sécurité
        return true;
    }
};

/**
 * Vérifie via RPC sécurisé si un étudiant est éligible et disponible
 */
export const checkStudentStatus = async (matricule) => {
    try {
        const { data, error } = await supabase
            .rpc('check_student_eligibility', { p_matricule: matricule });

        if (error) throw error;

        // RPC retourne une liste de rows, on prend le premier
        const result = data && data[0] ? data[0] : { valid: false, available: false };
        return { error: null, ...result };
    } catch (error) {
        console.error('Erreur RPC check_student_eligibility:', error);
        // Fallback sécurité: on bloque si erreur
        return { valid: false, available: false, error: error.message };
    }
};

/**
 * Valide un nom et vérifie sa disponibilité (Nouvelle version hybride)
 */
export const validateAndCheckName = async (name) => {
    if (!name || !name.trim()) {
        return {
            valid: false,
            available: false,
            error: 'Le nom est requis',
            studentInfo: null
        };
    }

    // 1. Recherche floue locale (On garde etudiant.json pour l'UX rapide)
    const { match: localStudent, error: searchError } = getStudentByName(name);

    if (searchError) {
        return {
            valid: false,
            available: false,
            error: searchError,
            studentInfo: null
        };
    }

    if (!localStudent) {
        return {
            valid: false,
            available: false,
            error: 'Étudiant introuvable dans la liste.',
            studentInfo: null
        };
    }

    // 2. Vérification SERVEUR via RPC (Source de vérité)
    const { valid, available, error: rpcError } = await checkStudentStatus(localStudent.matricule);

    if (rpcError) {
        return {
            valid: true, // Nom trouvé localement
            available: false,
            error: "Erreur de connexion au serveur de vérification.",
            studentInfo: localStudent
        };
    }

    if (!valid) {
        // Cas rare: dans json mais pas dans DB allowed_users
        return {
            valid: false,
            available: false,
            error: "Cet étudiant n'est pas autorisé par le système (Liste blanche DB).",
            studentInfo: null
        };
    }

    if (!available) {
        return {
            valid: true,
            available: false,
            error: `Un compte existe déjà pour ${localStudent.nom}`,
            studentInfo: localStudent
        };
    }

    return {
        valid: true,
        available: true,
        error: null,
        studentInfo: localStudent
    };
};

// Note: isMatriculeAlreadyUsed devient redondant avec checkStudentStatus mais on le garde pour compatibilité si besoin,
// ou on le redirige vers le RPC.
export const isMatriculeAlreadyUsed = async (matricule) => {
    const { available } = await checkStudentStatus(matricule);
    return !available;
};

export const studentService = {
    getAllStudents,
    getStudentByName,
    validateAndCheckName,
    isMatriculeAlreadyUsed,
    checkStudentStatus
};
