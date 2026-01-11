import { useState, useRef } from 'react'
import { authService } from '../services/authService'
import { GraduationCap, Mail, Lock } from 'lucide-react'
import { sanitizeString, isValidEmail, createSubmissionLock } from '../utils/validation'
import './Login.css'

export default function Login({ onNavigate, setUser }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const submissionLock = useRef(createSubmissionLock())

    const handleLogin = async (e) => {
        e.preventDefault()
        
        // Prevent double submission
        if (submissionLock.current.isSubmitting()) {
            return
        }

        setLoading(true)
        setError('')

        // Sanitize and validate inputs
        const sanitizedEmail = sanitizeString(email)
        if (!sanitizedEmail) {
            setError('Veuillez entrer votre email')
            setLoading(false)
            return
        }

        if (!password) {
            setError('Veuillez entrer votre mot de passe')
            setLoading(false)
            return
        }

        // Validate email format
        if (!isValidEmail(sanitizedEmail)) {
            setError('Format d\'email invalide')
            setLoading(false)
            return
        }

        try {
            await submissionLock.current.execute(async () => {
                const { error: authError } = await authService.signIn(sanitizedEmail, password)

                if (authError) {
                    setError(authError)
                    setLoading(false)
                    return
                }

                // Succès : AuthContext détectera le changement de session et App.jsx affichera le Dashboard via le re-render.
                // On nettoie juste le flag de logout manuellement par sécurité.
                localStorage.removeItem('user-logged-out')
            })
        } catch (err) {
            if (err.message !== 'Une soumission est déjà en cours') {
                setError(err.message || 'Erreur de connexion. Veuillez réessayer.')
            }
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card fade-in">
                    <div className="auth-header">
                        <div className="auth-logo"><GraduationCap /></div>
                        <h1 className="auth-title">Bon retour !</h1>
                        <p className="auth-subtitle">Connectez-vous pour voir les prédictions</p>
                    </div>

                    {error && (
                        <div className="alert alert-error mb-md">
                            ⚠️ {error}
                        </div>
                    )}

                    <form className="auth-form" onSubmit={handleLogin}>
                        <div className="form-group">
                            <label className="form-label">Email étudiant</label>
                            <div className="input-with-icon">
                                <span className="input-icon"><Mail /></span>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="exemple@etudiant.univ"
                                    value={email}
                                    onChange={(e) => setEmail(sanitizeString(e.target.value))}
                                    required
                                    autoComplete="email"
                                    aria-label="Email étudiant"
                                    aria-invalid={error && error.includes('email') ? 'true' : 'false'}
                                    disabled={loading}
                                    maxLength={254}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="flex justify-between">
                                <label className="form-label">Mot de passe</label>
                            </div>
                            <div className="input-with-icon">
                                <span className="input-icon"><Lock /></span>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    aria-label="Mot de passe"
                                    aria-invalid={error && error.includes('mot de passe') ? 'true' : 'false'}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full btn-lg mt-sm"
                            disabled={loading || !email.trim() || !password}
                            aria-label={loading ? 'Connexion en cours...' : 'Se connecter'}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} aria-hidden="true"></div>
                                    <span>Connexion...</span>
                                </>
                            ) : (
                                'Se connecter'
                            )}
                        </button>
                    </form>

                    <p style={{ marginTop: '20px', color: 'rgba(255,255,255,0.6)' }}>
                        Pas encore de compte ?{' '}
                        <span
                            onClick={() => onNavigate('signup')}
                            style={{ color: '#ffd700', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            S'inscrire
                        </span>
                    </p></div>
            </div>
        </div>
    )
}
