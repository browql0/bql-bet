import { useState, useEffect, useCallback } from 'react'
import { predictionsService } from '../services/predictionsService'
import { settingsService } from '../services/settingsService'
import { profilesService } from '../services/profilesService'
import { Trophy, Medal, User, TrendingUp, EyeOff, BookOpen, Repeat, RefreshCw, BarChart3 } from 'lucide-react'
import LoadingState from '../components/LoadingState'
import './Results.css'

export default function Results({ user }) {
    const [results, setResults] = useState([])
    const [settings, setSettings] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const loadResults = useCallback(async () => {
        // Safety timeout
        const safetyTimer = setTimeout(() => {
            if (loading) {
                setLoading(false)
                setError('Le chargement prend trop de temps. Veuillez réessayer.')
            }
        }, 10000)

        try {
            // Charger les settings et données en parallèle
            const [settingsResult, votableResult, predictionsResult] = await Promise.all([
                settingsService.getAllSettings().catch(() => {
                    return { data: {} }
                }),
                profilesService.getAllVotableUsers().catch(err => {
                    console.error('Erreur chargement étudiants:', err)
                    return { data: [] }
                }),
                predictionsService.getAllPredictions().catch(err => {
                    console.error('Erreur chargement prédictions:', err)
                    return { data: [] }
                })
            ])

            if (settingsResult.data) setSettings(settingsResult.data)

            const votableUsers = votableResult.data || []
            const predictions = predictionsResult.data || []

            // Calculer les stats pour chaque étudiant
            const resultsData = votableUsers.map(student => {
                // Utiliser profile_id ou id selon le format retourné
                const studentId = student.profile_id || student.id
                const studentPredictions = predictions.filter(p => p.target_id === studentId)
                const totalVotes = studentPredictions.length

                if (totalVotes === 0) {
                    return {
                        ...student,
                        totalVotes: 0,
                        avgModules: '-',
                        avgRattrapages: '-'
                    }
                }

                const avgModules = studentPredictions.reduce((sum, p) => sum + (p.modules || 0), 0) / totalVotes
                const avgRattrapages = studentPredictions.reduce((sum, p) => sum + (p.rattrapages || 0), 0) / totalVotes

                return {
                    ...student,
                    totalVotes,
                    avgModules: avgModules.toFixed(1),
                    avgRattrapages: avgRattrapages.toFixed(1)
                }
            })

            // Trier par nombre de votes (décroissant)
            resultsData.sort((a, b) => b.totalVotes - a.totalVotes)

            setResults(resultsData)
            setError(null)
        } catch (err) {
            setError('Erreur lors du chargement des résultats. Veuillez réessayer.')
        } finally {
            clearTimeout(safetyTimer)
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadResults()

        // Rafraîchissement automatique toutes les 30 secondes
        const refreshInterval = setInterval(() => {
            loadResults()
        }, 30000)

        return () => clearInterval(refreshInterval)
    }, [loadResults])

    const showResults = settings.show_results === 'true'

    if (loading) {
        return (
            <div className="page">
                <LoadingState text="Calcul des moyennes..." />
            </div>
        )
    }

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header-icon">
                    <Trophy size={32} />
                </div>
                <div className="page-header-content">
                    <div>
                        <h1 className="page-title">Classement des Prédictions</h1>
                        <p className="page-subtitle">
                            Moyennes des modules validés et rattrapages par étudiant
                        </p>
                    </div>
                    <button
                        className="refresh-btn"
                        onClick={loadResults}
                        disabled={loading}
                        aria-label="Actualiser les résultats"
                        title="Actualiser les résultats"
                    >
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                        <span>Actualiser</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error mb-md fade-in">
                    ⚠️ {error}
                </div>
            )}

            {!showResults ? (
                <div className="alert alert-warning fade-in">
                    <EyeOff size={20} aria-hidden="true" /> 
                    <span>Les résultats sont masqués par l'administrateur</span>
                </div>
            ) : results.length === 0 ? (
                <div className="empty-state fade-in">
                    <div className="empty-state-content">
                        <div className="empty-icon-wrapper">
                            <BarChart3 size={48} strokeWidth={1.5} />
                        </div>
                        <h3 className="empty-title">Aucun résultat disponible</h3>
                        <p className="empty-text">
                            Les résultats apparaîtront ici une fois que les votes commenceront.
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="results-summary fade-in">
                        <div className="summary-stat">
                            <Trophy size={20} />
                            <div>
                                <span className="summary-value">{results.length}</span>
                                <span className="summary-label">Étudiant(s)</span>
                            </div>
                        </div>
                        <div className="summary-stat">
                            <TrendingUp size={20} />
                            <div>
                                <span className="summary-value">{results.filter(s => s.totalVotes > 0).length}</span>
                                <span className="summary-label">Avec votes</span>
                            </div>
                        </div>
                        <div className="summary-stat">
                            <BarChart3 size={20} />
                            <div>
                                <span className="summary-value">
                                    {results.reduce((sum, s) => sum + (s.totalVotes || 0), 0)}
                                </span>
                                <span className="summary-label">Votes totaux</span>
                            </div>
                        </div>
                    </div>

                    <div className="student-grid">
                        {results.map((student, index) => {
                            const studentId = student.id || student.profile_id || index
                            const profileId = student.profile_id || student.id
                            const isCurrentUser = profileId === user?.id
                            
                            return (
                            <div
                                key={studentId}
                                className={`student-card slide-up ${isCurrentUser ? 'current-user' : ''}`}
                                style={{ animationDelay: `${index * 0.03}s` }}
                            >
                                <div className="student-header">
                                    <div className="student-avatar">
                                        {student.full_name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="student-name">
                                            {student.full_name || 'Nom inconnu'}
                                            {isCurrentUser && (
                                                <span className="badge badge-primary" style={{ marginLeft: '8px' }}>Toi</span>
                                            )}
                                        </div>
                                        <div className="student-status">
                                            {student.totalVotes || 0} vote{(student.totalVotes || 0) > 1 ? 's' : ''} reçu{(student.totalVotes || 0) > 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    {index < 3 && (student.totalVotes || 0) > 0 && (
                                        <div className="medal-badge" aria-label={`Position ${index + 1}`}>
                                            {index === 0 ? <Medal className="gold" size={32} /> : index === 1 ? <Medal className="silver" size={32} /> : <Medal className="bronze" size={32} />}
                                        </div>
                                    )}
                                </div>

                                <div className="stats-grid" style={{ marginTop: 'var(--space-md)' }}>
                                    <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
                                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                                            {student.avgModules || '-'}
                                        </div>
                                        <div className="stat-label">
                                            <BookOpen size={16} style={{ display: 'inline', marginRight: '0.5rem' }} aria-hidden="true" />
                                            Modules
                                        </div>
                                    </div>
                                    <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
                                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                                            {student.avgRattrapages || '-'}
                                        </div>
                                        <div className="stat-label">
                                            <Repeat size={16} style={{ display: 'inline', marginRight: '0.5rem' }} aria-hidden="true" />
                                            Rattrapages
                                        </div>
                                    </div>
                                </div>
                            </div>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}
