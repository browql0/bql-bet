import { useState, useRef } from 'react'
import { studentService } from '../services/studentService'
import { authService } from '../services/authService'
import { Rocket, User, Search, Check, Mail, Lock, Key, GraduationCap } from 'lucide-react'
import { sanitizeString, isValidEmail, isValidPassword, isValidStudentName, createSubmissionLock } from '../utils/validation'
import './Signup.css'

export default function Signup({ onNavigate }) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const [foundStudent, setFoundStudent] = useState(null)
    const submissionLock = useRef(createSubmissionLock())
    const checkLock = useRef(createSubmissionLock())

    // Vérifier le nom dans la liste
    const checkName = async () => {
        // Prevent double submission
        if (checkLock.current.isSubmitting()) {
            return
        }

        const sanitizedName = sanitizeString(name)
        if (!sanitizedName) {
            setError('Veuillez entrer un nom valide')
            return
        }

        if (!isValidStudentName(sanitizedName)) {
            setError('Le nom doit contenir entre 2 et 150 caractères')
            return
        }

        setChecking(true)
        setError('')
        setFoundStudent(null)

        try {
            await checkLock.current.execute(async () => {
                const result = await studentService.validateAndCheckName(sanitizedName)

                if (!result.valid) {
                    setError(result.error)
                } else if (!result.available) {
                    setError(result.error)
                } else {
                    setFoundStudent(result.studentInfo)
                }
            })
        } catch (err) {
            if (err.message !== 'Une soumission est déjà en cours') {
                setError('Erreur de connexion au serveur. Veuillez réessayer.')
            }
        } finally {
            setChecking(false)
        }
    }

    const handleSignup = async (e) => {
        e.preventDefault()
        
        // Prevent double submission
        if (submissionLock.current.isSubmitting()) {
            return
        }

        setLoading(true)
        setError('')

        // Validations
        if (!foundStudent) {
            setError('Veuillez d\'abord valider votre identité')
            setLoading(false)
            return
        }

        // Sanitize and validate email
        const sanitizedEmail = sanitizeString(email)
        if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
            setError('Format d\'email invalide')
            setLoading(false)
            return
        }

        // Validate password
        if (!isValidPassword(password)) {
            setError('Le mot de passe doit contenir entre 6 et 128 caractères')
            setLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas')
            setLoading(false)
            return
        }

        try {
            await submissionLock.current.execute(async () => {
                // Appel service inscription
                const { error: signupError } = await authService.signUp(sanitizedEmail, password, foundStudent)

                if (signupError) {
                    setError(signupError)
                    setLoading(false)
                } else {
                    // ✅ Clear logout flag so session can be restored automatically
                    localStorage.removeItem('user-logged-out')
                    setSuccess(true)
                    setLoading(false)
                }
            })
        } catch (err) {
            if (err.message !== 'Une soumission est déjà en cours') {
                setError('Erreur lors de l\'inscription. Veuillez réessayer.')
            }
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-card fade-in text-center">
                        <div className="auth-logo" style={{ animation: 'none' }}><Check size={48} /></div>
                        <h1 className="auth-title">Compte créé !</h1>
                        <p className="auth-subtitle mb-lg">
                            Bienvenue <strong>{foundStudent?.nom}</strong>.<br />
                            Ton inscription est validée avec succès.
                        </p>

                        <button
                            className="btn btn-primary btn-full btn-lg"
                            onClick={() => onNavigate('login')}
                        >
                            Accéder à la connexion
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card fade-in">
                    <div className="auth-header">
                        <div className="auth-logo"><Rocket /></div>
                        <h1 className="auth-title">Créer un compte</h1>
                        <p className="auth-subtitle">Rejoignez la plateforme et commencez à voter</p>
                    </div>

                    {error && (
                        <div className="alert alert-error mb-md">
                            ⚠️ {error}
                        </div>
                    )}

                    <form className="auth-form" onSubmit={handleSignup}>

                        {/* ÉTAPE 1: Identification */}
                        <div className="form-group">
                            <label className="form-label">Identification</label>
                            <div className="input-with-icon" style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <span className="input-icon"><User /></span>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Votre Nom Complet"
                                        value={name}
                                        onChange={(e) => {
                                            const sanitized = sanitizeString(e.target.value)
                                            setName(sanitized)
                                            setFoundStudent(null)
                                            setError('')
                                        }}
                                        required
                                        disabled={loading || checking}
                                        aria-label="Nom complet de l'étudiant"
                                        aria-describedby="name-validation"
                                        maxLength={150}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className={`btn ${foundStudent ? 'btn-success' : 'btn-secondary'}`}
                                    onClick={checkName}
                                    disabled={!name.trim() || checking || loading}
                                    style={{ minWidth: '60px' }}
                                    aria-label={checking ? 'Vérification en cours...' : foundStudent ? 'Nom validé' : 'Vérifier le nom'}
                                >
                                    {checking ? (
                                        <div className="spinner" style={{ width: 20, height: 20 }} aria-hidden="true"></div>
                                    ) : foundStudent ? (
                                        <Check size={20} aria-hidden="true" />
                                    ) : (
                                        <Search size={20} aria-hidden="true" />
                                    )}
                                </button>
                            </div>

                            {/* Student Found Badge */}
                            {foundStudent && (
                                <div className="alert alert-success mt-sm" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.25rem' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                        <GraduationCap size={18} /> {foundStudent.nom}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                                        Groupe {foundStudent.gp} • {foundStudent.sgp}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ÉTAPE 2: Identifiants (apparaît seulement après validation) */}
                        {foundStudent && (
                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Email personnel</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon"><Mail /></span>
                                        <input
                                            type="email"
                                            className="form-input"
                                            placeholder="exemple@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(sanitizeString(e.target.value))}
                                            required
                                            disabled={loading}
                                            autoComplete="email"
                                            aria-label="Email personnel"
                                            aria-invalid={error && error.includes('email') ? 'true' : 'false'}
                                            maxLength={254}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Mot de passe</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon"><Lock /></span>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder="Min. 6 caractères"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            disabled={loading}
                                            autoComplete="new-password"
                                            minLength={6}
                                            maxLength={128}
                                            aria-label="Mot de passe (minimum 6 caractères)"
                                            aria-invalid={error && error.includes('mot de passe') ? 'true' : 'false'}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Confirmation</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon"><Key /></span>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder="Confirmez le mot de passe"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            disabled={loading}
                                            autoComplete="new-password"
                                            minLength={6}
                                            maxLength={128}
                                            aria-label="Confirmation du mot de passe"
                                            aria-invalid={error && error.includes('correspondent') ? 'true' : 'false'}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary btn-full btn-lg mt-sm"
                                    disabled={loading}
                                >
                                    {loading ? <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }}></div> : 'Finaliser l\'inscription'}
                                </button>
                            </div>
                        )}
                    </form>

                    <div className="auth-footer">
                        Vous avez déjà un compte ?{' '}
                        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('login') }}>
                            Se connecter
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}

