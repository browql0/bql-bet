import { useState, useEffect, useMemo } from 'react'
import { predictionsService } from '../services/predictionsService'
import { settingsService } from '../services/settingsService'
import LoadingState from '../components/LoadingState'
import './Profile.css'
import { ShieldCheck, GraduationCap, Users, BookOpen, Repeat, EyeOff, LayoutGrid } from 'lucide-react'

// Helper component for UserIcon
const UserIcon = (props) => <Users {...props} />

export default function Profile({ user }) {
    const [stats, setStats] = useState({ totalVotes: 0, avgModules: 0, avgRattrapages: 0 })
    const [voters, setVoters] = useState([])
    const [settings, setSettings] = useState({})
    const [loading, setLoading] = useState(true)

    // Stabiliser user.id pour éviter la boucle infinie
    const userId = useMemo(() => user?.id, [user?.id])

    useEffect(() => {
        if (userId) {
            loadProfile()
        }
    }, [userId])  // Dépend uniquement de userId, pas de tout l'objet user

    const loadProfile = async () => {
        if (!user) return

        // Safety timeout global pour ce composant
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout chargement data profil')), 8000)
        )

        try {
            // Utiliser Promise.all pour charger en parallèle (plus rapide)
            // Et Promise.race pour le timeout
            await Promise.race([
                Promise.all([
                    settingsService.getAllSettings().then(({ data }) => setSettings(data || {})).catch(() => {}),
                    predictionsService.calculateUserStats(user.id).then(setStats).catch(() => {}),
                    predictionsService.getPredictionsForUser(user.id).then(({ data }) => setVoters(data || [])).catch(() => {})
                ]),
                timeoutPromise
            ])
        } catch (err) {
            // Silently fail - user will see default values
        } finally {
            if (loading) setLoading(false)
        }
    }

    const showResults = settings.show_results === 'true'
    const anonymousVotes = settings.anonymous_votes === 'true'

    // Safety check for user profile
    if (!user) {
        return (
            <div className="page">
                <LoadingState text="Chargement du profil..." />
            </div>
        )
    }

    // Handle missing profile data
    const hasValidProfile = user.profile && typeof user.profile === 'object' && Object.keys(user.profile).length > 0 && user.profile.full_name

    if (!user.profile || !hasValidProfile) {
        return (
            <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div className="alert alert-error">
                    <ShieldCheck size={20} aria-hidden="true" /> 
                    <span>Profil introuvable. Veuillez vous reconnecter.</span>
                </div>
            </div>
        )
    }

    const profile = user.profile

    if (loading) {
        return (
            <div className="page">
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="page">
            {/* Header avec infos personnelles */}
            <div className="profile-header fade-in">
                <div className="profile-avatar">
                    {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <h1 className="profile-name">{profile?.full_name}</h1>
                <div className="profile-role">
                    {profile?.role === 'admin' ?
                        <><ShieldCheck /> Administrateur</> :
                        <><GraduationCap /> Étudiant</>
                    }
                </div>
            </div>

            {/* Détails étudiant */}
            <div className="results-section fade-in" style={{ marginTop: 0 }}>
                <h2 className="results-title">
                    <UserIcon size={20} aria-hidden="true" /> 
                    <span>Mes informations</span>
                </h2>
                <div className="info-grid">
                    <div className="info-item">
                        <span className="info-label">Matricule</span>
                        <span className="info-value">{profile?.matricule || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Groupe</span>
                        <span className="info-value">{profile?.groupe || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Sous-groupe</span>
                        <span className="info-value">{profile?.sous_groupe || 'N/A'}</span>
                    </div>
                </div>
            </div>

            {!showResults ? (
                <div className="alert alert-warning">
                    <EyeOff size={20} /> Les résultats sont masqués par l'admin
                </div>
            ) : (
                <>
                    {/* Statistiques */}
                    <div className="stats-grid mb-lg fade-in">
                        <div className="stat-card">
                            <div className="stat-value">{stats.totalVotes}</div>
                            <div className="stat-label">Votes reçus</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.avgModules}</div>
                            <div className="stat-label">Moy. Modules</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.avgRattrapages}</div>
                            <div className="stat-label">Moy. Rattrapages</div>
                        </div>
                    </div>

                    {/* Détail des votes */}
                    <div className="results-section slide-up">
                        <h2 className="results-title">
                            <LayoutGrid size={20} aria-hidden="true" /> 
                            <span>Détail des prédictions</span>
                        </h2>

                        {voters.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><Users size={40} /></div>
                                <p>Personne n'a encore voté pour toi</p>
                            </div>
                        ) : (
                            <div className="voter-list">
                                {voters.map((vote, index) => (
                                    <div
                                        key={vote.id}
                                        className="voter-item fade-in"
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <div className="voter-info">
                                            <div className="voter-icon" aria-hidden="true">
                                                {anonymousVotes ? <EyeOff size={16} /> : <UserIcon size={16} />}
                                            </div>
                                            <span className="voter-name">
                                                {anonymousVotes ? 'Anonyme' : vote.voter?.full_name || 'Inconnu'}
                                            </span>
                                        </div>
                                        <div className="voter-prediction">
                                            <span>
                                                <BookOpen size={16} aria-hidden="true" />
                                                <span className="sr-only">Modules: </span>
                                                {vote.modules}
                                            </span>
                                            <span>
                                                <Repeat size={16} aria-hidden="true" />
                                                <span className="sr-only">Rattrapages: </span>
                                                {vote.rattrapages}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
