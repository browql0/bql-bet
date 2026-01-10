import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { predictionsService } from '../services/predictionsService'
import { settingsService } from '../services/settingsService'
import { Trophy, Medal, User, TrendingUp } from 'lucide-react'
import LoadingState from '../components/LoadingState'
import './Results.css'

export default function Results({ user }) {
    const [results, setResults] = useState([])
    const [settings, setSettings] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadResults()
    }, [])

    const loadResults = async () => {
        try {
            // Charger les settings
            const { data: settingsData } = await supabase
                .from('settings')
                .select('*')

            const settingsMap = {}
            settingsData?.forEach(s => {
                settingsMap[s.key] = s.value
            })
            setSettings(settingsMap)

            // Charger tous les étudiants votables
            const { data: votableUsers } = await supabase
                .from('votable_users')
                .select('*, profile:profiles(*)')
                .eq('active', true)

            // Charger toutes les prédictions
            const { data: predictions } = await supabase
                .from('predictions')
                .select('*')

            // Calculer les stats pour chaque étudiant
            const resultsData = votableUsers?.map(student => {
                const studentPredictions = predictions?.filter(p => p.target_id === student.profile_id) || []
                const totalVotes = studentPredictions.length

                if (totalVotes === 0) {
                    return {
                        ...student,
                        totalVotes: 0,
                        avgModules: '-',
                        avgRattrapages: '-'
                    }
                }

                const avgModules = studentPredictions.reduce((sum, p) => sum + p.modules, 0) / totalVotes
                const avgRattrapages = studentPredictions.reduce((sum, p) => sum + p.rattrapages, 0) / totalVotes

                return {
                    ...student,
                    totalVotes,
                    avgModules: avgModules.toFixed(1),
                    avgRattrapages: avgRattrapages.toFixed(1)
                }
            }) || []

            // Trier par nombre de votes (décroissant)
            resultsData.sort((a, b) => b.totalVotes - a.totalVotes)

            setResults(resultsData)
        } catch (err) {
            console.error('Erreur chargement résultats:', err)
        } finally {
            setLoading(false)
        }
    }

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
                <h1 className="page-title">📊 Résultats</h1>
                <p className="page-subtitle">
                    Moyennes des prédictions pour chaque étudiant
                </p>
            </div>

            {!showResults ? (
                <div className="alert alert-warning">
                    🔒 Les résultats sont masqués par l'admin
                </div>
            ) : (
                <div className="student-grid">
                    {results.map((student, index) => (
                        <div
                            key={student.id}
                            className="student-card slide-up"
                            style={{ animationDelay: `${index * 0.03}s` }}
                        >
                            <div className="student-header">
                                <div className="student-avatar">
                                    {student.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="student-name">
                                        {student.full_name}
                                        {student.profile_id === user.id && (
                                            <span className="badge badge-primary" style={{ marginLeft: '8px' }}>Toi</span>
                                        )}
                                    </div>
                                    <div className="student-status">
                                        {student.totalVotes} vote{student.totalVotes > 1 ? 's' : ''} reçu{student.totalVotes > 1 ? 's' : ''}
                                    </div>
                                </div>
                                {index < 3 && student.totalVotes > 0 && (
                                    <span style={{ fontSize: '1.5rem' }}>
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                    </span>
                                )}
                            </div>

                            <div className="stats-grid" style={{ marginTop: 'var(--space-md)' }}>
                                <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
                                    <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                                        {student.avgModules}
                                    </div>
                                    <div className="stat-label">📚 Modules</div>
                                </div>
                                <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
                                    <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                                        {student.avgRattrapages}
                                    </div>
                                    <div className="stat-label">🔄 Rattrapages</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
