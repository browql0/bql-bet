import { useState, useEffect } from 'react'
import './Dashboard.css'
import { profilesService } from '../services/profilesService'
import { predictionsService } from '../services/predictionsService'
import { settingsService } from '../services/settingsService'
import { Search, Users, Vote, Lock, CheckCircle, Clock } from 'lucide-react'
import LoadingState from '../components/LoadingState'

export default function Dashboard({ user }) {
    if (!user) return <LoadingState text="Chargement du profil..." />

    const [students, setStudents] = useState([])
    const [predictions, setPredictions] = useState({})
    const [myVotes, setMyVotes] = useState({})
    const [settings, setSettings] = useState({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [message, setMessage] = useState({ type: '', text: '' })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        // Safety: Force stop loading after 2s
        const safetyTimer = setTimeout(() => setLoading(false), 2000)

        try {
            // Charger les settings
            const { data: settingsData } = await settingsService.getAllSettings()
            if (settingsData) setSettings(settingsData)

            // Charger les étudiants votables (actifs seulement, exclure soi-même)
            const { data: votableData } = await profilesService.getVotableUsers(user.id)
            if (votableData) setStudents(votableData)

            // Charger mes votes existants
            const { data: myVotesData } = await predictionsService.getMyPredictions(user.id)
            const votesMap = {}
            myVotesData?.forEach(v => {
                votesMap[v.target_id] = v
            })
            setMyVotes(votesMap)

        } catch (err) {
            console.error('Erreur chargement:', err)
        } finally {
            clearTimeout(safetyTimer)
            setLoading(false)
        }
    }

    const handlePredictionChange = (studentId, field, value) => {
        const numValue = Math.min(20, Math.max(0, parseInt(value) || 0))
        setPredictions(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: numValue
            }
        }))
    }

    const submitVote = async (targetId) => {
        const prediction = predictions[targetId]
        if (!prediction || prediction.modules === undefined || prediction.rattrapages === undefined) {
            setMessage({ type: 'error', text: 'Remplis les deux champs !' })
            return
        }

        setSubmitting(targetId)
        setMessage({ type: '', text: '' })

        const { success, error } = await predictionsService.submitPrediction(
            user.id,
            targetId,
            prediction.modules,
            prediction.rattrapages
        )

        if (success) {
            setMyVotes(prev => ({
                ...prev,
                [targetId]: {
                    ...prev[targetId],
                    modules: prediction.modules,
                    rattrapages: prediction.rattrapages
                }
            }))
            setMessage({ type: 'success', text: 'Vote enregistré !' })
            setTimeout(() => setMessage({ type: '', text: '' }), 2000)
        } else {
            setMessage({ type: 'error', text: error || 'Erreur lors du vote' })
        }

        setSubmitting(null)
    }

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const votingEnabled = settings.voting_enabled === 'true'

    if (loading) {
        return (
            <div className="page">
                <LoadingState text="Chargement des votes..." />
            </div>
        )
    }

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header-icon">
                    <Vote size={32} />
                </div>
                <div>
                    <h1 className="page-title">Espace Votes</h1>
                    <p className="page-subtitle">
                        Prédit les modules validés et rattrapages de tes camarades
                    </p>
                </div>
            </div>

            {!votingEnabled && (
                <div className="voting-banner slide-down">
                    <div className="banner-icon">
                        <Lock size={20} />
                    </div>
                    <div className="banner-content">
                        <strong>Votes fermés</strong>
                        <span>L'administrateur n'a pas encore ouvert les votes. Prépare tes pronostics !</span>
                    </div>
                </div>
            )}

            {message.text && (
                <div className={`alert alert-${message.type} mb-md fade-in`}>
                    {message.type === 'success' && <CheckCircle size={18} />}
                    {message.text}
                </div>
            )}

            <div className="search-input fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="search-icon"><Search size={20} /></div>
                <input
                    type="text"
                    placeholder="Rechercher un étudiant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {filteredStudents.length === 0 ? (
                <div className="empty-state fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="empty-state-content">
                        <div className="empty-icon-wrapper">
                            <Users size={48} strokeWidth={1.5} />
                        </div>
                        <h3 className="empty-title">
                            {searchQuery ? "Aucun résultat" : "C'est calme ici..."}
                        </h3>
                        <p className="empty-text">
                            {searchQuery
                                ? "Essaie une autre recherche."
                                : "Aucun autre étudiant inscrit pour le moment. Invite tes camarades à rejoindre la plateforme !"}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="student-grid">
                    {filteredStudents.map((student, index) => {
                        const existingVote = myVotes[student.profile_id]
                        const currentPrediction = predictions[student.profile_id] || {}
                        const hasVoted = !!existingVote

                        return (
                            <div
                                key={student.id}
                                className={`student-card slide-up ${hasVoted ? 'voted' : ''}`}
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="student-header">
                                    <div className="student-avatar">
                                        {student.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="student-info">
                                        <div className="student-name">{student.full_name}</div>
                                        <div className="student-status flex items-center gap-sm">
                                            {hasVoted ?
                                                <span className="text-success flex items-center gap-xs"><CheckCircle size={14} /> Voté</span> :
                                                <span className="text-muted flex items-center gap-xs"><Clock size={14} /> En attente</span>
                                            }
                                        </div>
                                    </div>
                                </div>

                                <div className="vote-form">
                                    <div className="vote-field">
                                        <label>Modules</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="20"
                                            placeholder={existingVote?.modules ?? '0'}
                                            value={currentPrediction.modules ?? ''}
                                            onChange={(e) => handlePredictionChange(student.profile_id, 'modules', e.target.value)}
                                            disabled={!votingEnabled}
                                        />
                                    </div>
                                    <div className="vote-field">
                                        <label>Rattrapages</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="20"
                                            placeholder={existingVote?.rattrapages ?? '0'}
                                            value={currentPrediction.rattrapages ?? ''}
                                            onChange={(e) => handlePredictionChange(student.profile_id, 'rattrapages', e.target.value)}
                                            disabled={!votingEnabled}
                                        />
                                    </div>
                                </div>

                                <button
                                    className={`btn ${hasVoted ? 'btn-secondary' : 'btn-primary'} btn-full`}
                                    onClick={() => submitVote(student.profile_id)}
                                    disabled={!votingEnabled || submitting === student.profile_id}
                                >
                                    {submitting === student.profile_id ? 'Envoi...' :
                                        hasVoted ? 'Modifier mon vote' :
                                            <><Vote size={18} /> Voter</>}
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
