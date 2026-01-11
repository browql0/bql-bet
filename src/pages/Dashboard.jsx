import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import './Dashboard.css'
import { profilesService } from '../services/profilesService'
import { predictionsService } from '../services/predictionsService'
import { settingsService } from '../services/settingsService'
import { Search, Users, Vote, Lock, CheckCircle, Clock, Eye } from 'lucide-react'
import LoadingState from '../components/LoadingState'
import VoteModal from '../components/VoteModal'
import { sanitizeString, validateVoteData, createSubmissionLock, debounce } from '../utils/validation'

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
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const submissionLock = useRef(createSubmissionLock())
    
    // Debounced search
    const debouncedSearch = useMemo(
        () => debounce((query) => {
            setSearchQuery(query)
        }, 300),
        []
    )

    const loadData = useCallback(async () => {
        if (!user?.id) return

        setLoading(true)
        setMessage({ type: '', text: '' })

        // Safety: Force stop loading after 8s
        const safetyTimer = setTimeout(() => {
            setLoading(false)
            setMessage({ type: 'error', text: 'Le chargement prend trop de temps. Vérifiez votre connexion.' })
        }, 8000)

        try {
            // Charger en parallèle pour meilleure performance
            const [settingsResult, votableResult, votesResult] = await Promise.all([
                settingsService.getAllSettings().catch(() => {
                    return { data: {} }
                }),
                profilesService.getVotableUsers(user.id).catch(err => {
                    console.error('Erreur chargement étudiants:', err)
                    return { data: [] }
                }),
                predictionsService.getMyPredictions(user.id).catch(() => {
                    return { data: [] }
                })
            ])

            if (settingsResult.data) setSettings(settingsResult.data)
            
            // Transformer les données pour s'assurer du bon format
            const studentsList = votableResult.data || []
            const formattedStudents = studentsList.map(student => ({
                id: student.id || student.profile_id,
                profile_id: student.profile_id || student.id,
                full_name: student.full_name || student.profile?.full_name || 'Nom inconnu',
                active: student.active !== false, // S'assurer que active est true par défaut
                profile: student.profile || student
            }))
            
            setStudents(formattedStudents)

            // Construire la map des votes
            const votesMap = {}
            votesResult.data?.forEach(v => {
                votesMap[v.target_id] = v
            })
            setMyVotes(votesMap)

        } catch (err) {
            setMessage({ type: 'error', text: 'Erreur lors du chargement des données. Veuillez réessayer.' })
        } finally {
            clearTimeout(safetyTimer)
            setLoading(false)
        }
    }, [user?.id])

    useEffect(() => {
        if (user?.id) {
            loadData()
            
            // Rafraîchissement automatique toutes les 20 secondes pour voir les nouveaux utilisateurs
            const refreshInterval = setInterval(() => {
                loadData()
            }, 20000)

            return () => clearInterval(refreshInterval)
        }
    }, [user?.id, loadData])

    const handleStudentClick = (student) => {
        // Si vote déjà effectué, on ne peut pas modifier
        const hasVoted = !!myVotes[student.profile_id]
        if (hasVoted) {
            setMessage({ type: 'info', text: 'Vous avez déjà voté pour cet étudiant. Les votes ne peuvent pas être modifiés.' })
            setTimeout(() => setMessage({ type: '', text: '' }), 3000)
            return
        }

        // Si votes fermés, ne pas ouvrir le modal
        if (!votingEnabled) {
            setMessage({ type: 'error', text: 'Les votes sont actuellement fermés.' })
            return
        }

        setSelectedStudent(student)
        setIsModalOpen(true)
    }

    const handleVoteSubmit = async (voteData) => {
        if (!selectedStudent) return

        // Prevent double submission
        if (submissionLock.current.isSubmitting()) {
            setMessage({ type: 'error', text: 'Une soumission est déjà en cours. Veuillez patienter.' })
            return
        }

        // Validate vote data
        const validation = validateVoteData(voteData)
        if (!validation.valid) {
            setMessage({ type: 'error', text: validation.error })
            return
        }

        setSubmitting(selectedStudent.profile_id)
        setMessage({ type: '', text: '' })

        try {
            await submissionLock.current.execute(async () => {
                const { success, error } = await predictionsService.submitPrediction(
                    user.id,
                    selectedStudent.profile_id,
                    voteData.modules,
                    voteData.rattrapages,
                    voteData.votes_data
                )

                if (success) {
                    // Recharger les votes pour mettre à jour la liste
                    const { data: myVotesData } = await predictionsService.getMyPredictions(user.id)
                    const votesMap = {}
                    myVotesData?.forEach(v => {
                        votesMap[v.target_id] = v
                    })
                    setMyVotes(votesMap)

                    setIsModalOpen(false)
                    setSelectedStudent(null)
                    setMessage({ type: 'success', text: '✓ Vote enregistré avec succès !' })
                    setTimeout(() => setMessage({ type: '', text: '' }), 4000)
                } else {
                    setMessage({ type: 'error', text: error || 'Erreur lors de l\'enregistrement du vote' })
                }
            })
        } catch (err) {
            if (err.message !== 'Une soumission est déjà en cours') {
                setMessage({ type: 'error', text: 'Erreur de connexion. Veuillez réessayer.' })
            }
        } finally {
            setSubmitting(null)
        }
    }

    const handleCloseModal = () => {
        if (!submitting) {
            setIsModalOpen(false)
            setSelectedStudent(null)
        }
    }

    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students
        const query = searchQuery.toLowerCase().trim()
        return students.filter(s =>
            s.full_name?.toLowerCase().includes(query)
        )
    }, [students, searchQuery])

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
                <div className="page-header-content">
                    <div>
                        <h1 className="page-title">Espace Votes</h1>
                        <p className="page-subtitle">
                            Prédit les modules validés et rattrapages de tes camarades
                        </p>
                    </div>
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
                <div className={`alert alert-${message.type === 'info' ? 'warning' : message.type} mb-md fade-in`}>
                    {message.type === 'success' && <CheckCircle size={18} />}
                    {message.type === 'error' && <span>⚠️</span>}
                    {message.type === 'info' && <span>ℹ️</span>}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="search-input fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="search-icon" aria-hidden="true"><Search size={20} /></div>
                <input
                    type="text"
                    placeholder="Rechercher un étudiant..."
                    value={searchQuery}
                    onChange={(e) => {
                        const sanitized = sanitizeString(e.target.value)
                        setSearchQuery(sanitized)
                        debouncedSearch(sanitized)
                    }}
                    aria-label="Rechercher un étudiant"
                    maxLength={100}
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
                                ? "Essaie une autre recherche ou vérifie l'orthographe."
                                : "Aucun autre étudiant inscrit pour le moment. Invite tes camarades à rejoindre la plateforme !"}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="students-count fade-in" style={{ animationDelay: '0.15s' }}>
                        <Users size={18} />
                        <span>
                            {filteredStudents.length} étudiant{filteredStudents.length > 1 ? 's' : ''} disponible{filteredStudents.length > 1 ? 's' : ''}
                            {searchQuery && students.length > filteredStudents.length && (
                                <span className="text-muted"> (sur {students.length} au total)</span>
                            )}
                        </span>
                    </div>
                    <div className="student-grid">
                    {filteredStudents.map((student, index) => {
                        const existingVote = myVotes[student.profile_id]
                        const currentPrediction = predictions[student.profile_id] || {}
                        const hasVoted = !!existingVote

                        return (
                            <div
                                key={student.id}
                                className={`student-card slide-up ${hasVoted ? 'voted' : ''} ${!hasVoted && votingEnabled ? 'clickable' : ''}`}
                                style={{ animationDelay: `${index * 0.05}s` }}
                                onClick={() => !hasVoted && votingEnabled && handleStudentClick(student)}
                                role={!hasVoted && votingEnabled ? 'button' : undefined}
                                tabIndex={!hasVoted && votingEnabled ? 0 : undefined}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ' ') && !hasVoted && votingEnabled) {
                                        e.preventDefault()
                                        handleStudentClick(student)
                                    }
                                }}
                                aria-label={hasVoted ? `${student.full_name} - Déjà voté` : `${student.full_name} - Cliquer pour voter`}
                            >
                                <div className="student-header">
                                    <div className="student-avatar">
                                        {student.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="student-info">
                                        <div className="student-name">{student.full_name}</div>
                                        <div className="student-status flex items-center gap-sm">
                                            {hasVoted ? (
                                                <span className="text-success flex items-center gap-xs">
                                                    <CheckCircle size={14} /> 
                                                    <span>Voté • {existingVote?.modules || 0} validés, {existingVote?.rattrapages || 0} rattrapages</span>
                                                </span>
                                            ) : (
                                                <span className="text-muted flex items-center gap-xs">
                                                    <Clock size={14} /> 
                                                    <span>En attente de vote</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {hasVoted ? (
                                    <div className="vote-summary-display">
                                        <div className="summary-badge validated">
                                            <CheckCircle size={16} />
                                            <span>{existingVote?.modules || 0} Validés</span>
                                        </div>
                                        <div className="summary-badge retake">
                                            <Clock size={16} />
                                            <span>{existingVote?.rattrapages || 0} Rattrapages</span>
                                        </div>
                                    </div>
                                ) : votingEnabled ? (
                                    <div className="vote-action-hint">
                                        <Eye size={18} />
                                        <span>Cliquer pour voir les matières et voter</span>
                                    </div>
                                ) : (
                                    <div className="vote-disabled-hint">
                                        <Lock size={18} />
                                        <span>Votes fermés</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    </div>
                </>
            )}

            {/* Modal de vote */}
            <VoteModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                student={selectedStudent}
                existingVote={selectedStudent ? myVotes[selectedStudent.profile_id] : null}
                onSubmit={handleVoteSubmit}
                isSubmitting={!!submitting && selectedStudent?.profile_id === submitting}
            />
        </div>
    )
}
