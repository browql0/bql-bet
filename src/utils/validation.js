/**
 * Input validation and sanitization utilities
 */

/**
 * Sanitize string input to prevent XSS
 */
export const sanitizeString = (input) => {
    if (typeof input !== 'string') return ''
    
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .substring(0, 500) // Limit length
}

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const sanitized = email.trim()
    
    if (!emailRegex.test(sanitized)) return false
    if (sanitized.length > 254) return false // RFC 5321 limit
    
    return true
}

/**
 * Validate password strength
 */
export const isValidPassword = (password) => {
    if (!password || typeof password !== 'string') return false
    if (password.length < 6) return false
    if (password.length > 128) return false // Reasonable limit
    
    return true
}

/**
 * Validate module name
 */
export const isValidModuleName = (name) => {
    if (!name || typeof name !== 'string') return false
    
    const sanitized = sanitizeString(name)
    if (sanitized.length < 1 || sanitized.length > 100) return false
    
    // Allow letters, numbers, spaces, hyphens, apostrophes
    const validPattern = /^[a-zA-Z0-9\s\-'éèêëàâäôöùûüçÉÈÊËÀÂÄÔÖÙÛÜÇ]+$/
    return validPattern.test(sanitized)
}

/**
 * Validate student name
 */
export const isValidStudentName = (name) => {
    if (!name || typeof name !== 'string') return false
    
    const sanitized = sanitizeString(name)
    if (sanitized.length < 2 || sanitized.length > 150) return false
    
    return true
}

/**
 * Prevent double submission
 */
export const createSubmissionLock = () => {
    let isSubmitting = false
    
    return {
        isSubmitting: () => isSubmitting,
        setSubmitting: (value) => {
            isSubmitting = value
        },
        execute: async (fn) => {
            if (isSubmitting) {
                throw new Error('Une soumission est déjà en cours')
            }
            isSubmitting = true
            try {
                return await fn()
            } finally {
                isSubmitting = false
            }
        }
    }
}

/**
 * Validate vote data
 */
export const validateVoteData = (voteData) => {
    if (!voteData || typeof voteData !== 'object') {
        return { valid: false, error: 'Données de vote invalides' }
    }
    
    const { modules, rattrapages, votes_data } = voteData
    
    if (typeof modules !== 'number' || modules < 0 || modules > 20) {
        return { valid: false, error: 'Nombre de modules invalide (0-20)' }
    }
    
    if (typeof rattrapages !== 'number' || rattrapages < 0 || rattrapages > 20) {
        return { valid: false, error: 'Nombre de rattrapages invalide (0-20)' }
    }
    
    if (votes_data && typeof votes_data !== 'object') {
        return { valid: false, error: 'Données de votes détaillées invalides' }
    }
    
    return { valid: true, error: null }
}

/**
 * Debounce function for search inputs
 */
export const debounce = (func, wait) => {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

