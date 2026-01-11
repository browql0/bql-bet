import { useState, useEffect } from 'react'
import { X, Check, XCircle, Loader2 } from 'lucide-react'
import { modulesService } from '../services/modulesService'
import './VoteModal.css'

/**
 * Modal de vote matière par matière
 * Permet de sélectionner "Validé" ou "Rattrapage" pour chaque matière
 */
export default function VoteModal({ 
    isOpen, 
    onClose, 
    student, 
    existingVote, 
    onSubmit, 
    isSubmitting 
}) {
    const [modules, setModules] = useState([])
    const [votes, setVotes] = useState({}) // { moduleName: 'validated' | 'retake' | null }
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            loadModules()
            initializeVotes()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, existingVote])

    const loadModules = async () => {
        setLoading(true)
        try {
            const { data, error: modulesError } = await modulesService.getModulesList()
            if (modulesError) throw modulesError
            setModules(data || [])
        } catch (err) {
            console.error('Erreur chargement modules:', err)
            setError('Erreur lors du chargement des matières')
        } finally {
            setLoading(false)
        }
    }

    const initializeVotes = () => {
        // Si vote existant, parser les données
        if (existingVote && existingVote.votes_data) {
            try {
                const parsed = typeof existingVote.votes_data === 'string' 
                    ? JSON.parse(existingVote.votes_data) 
                    : existingVote.votes_data
                setVotes(parsed)
            } catch (err) {
                console.warn('Erreur parsing votes_data, initialisation vide')
                setVotes({})
            }
        } else {
            setVotes({})
        }
    }

    const handleVoteChange = (moduleName, status) => {
        setVotes(prev => ({
            ...prev,
            [moduleName]: status
        }))
        setError('')
    }

    const handleSubmit = () => {
        // Validation : toutes les matières doivent avoir un vote
        const allVoted = modules.every(module => votes[module] === 'validated' || votes[module] === 'retake')
        
        if (!allVoted) {
            setError('Veuillez voter pour toutes les matières')
            return
        }

        // Compter les totaux
        const validatedCount = Object.values(votes).filter(v => v === 'validated').length
        const retakeCount = Object.values(votes).filter(v => v === 'retake').length

        // Appeler la fonction de soumission avec les données complètes
        onSubmit({
            modules: validatedCount,
            rattrapages: retakeCount,
            votes_data: votes // Stocker le détail des votes
        })
    }

    if (!isOpen) return null

    const validatedCount = Object.values(votes).filter(v => v === 'validated').length
    const retakeCount = Object.values(votes).filter(v => v === 'retake').length
    const canSubmit = modules.length > 0 && validatedCount + retakeCount === modules.length

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-section">
                        <h2 className="modal-title">
                            Vote pour {student?.full_name || 'l\'étudiant'}
                        </h2>
                        <p className="modal-subtitle">
                            Sélectionne le statut de chaque matière
                        </p>
                    </div>
                    <button
                        className="modal-close-btn"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Fermer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-content">
                    {loading ? (
                        <div className="modal-loading">
                            <Loader2 className="spinner" size={32} />
                            <p>Chargement des matières...</p>
                        </div>
                    ) : error && !modules.length ? (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="alert alert-error fade-in">
                                    {error}
                                </div>
                            )}

                            <div className="modules-list">
                                {modules.map((module, index) => {
                                    const currentVote = votes[module]
                                    return (
                                        <div 
                                            key={module} 
                                            className={`module-item ${currentVote ? `voted-${currentVote}` : ''}`}
                                            style={{ animationDelay: `${index * 0.05}s` }}
                                        >
                                            <div className="module-name">
                                                <span className="module-number">{index + 1}</span>
                                                <span>{module}</span>
                                            </div>
                                            <div className="module-actions">
                                                <button
                                                    type="button"
                                                    className={`vote-btn vote-validated ${currentVote === 'validated' ? 'active' : ''}`}
                                                    onClick={() => handleVoteChange(module, 'validated')}
                                                    disabled={isSubmitting || !!existingVote}
                                                    aria-label={`Voter "Validé" pour ${module}`}
                                                    aria-pressed={currentVote === 'validated'}
                                                >
                                                    <Check size={18} />
                                                    <span>Validé</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`vote-btn vote-retake ${currentVote === 'retake' ? 'active' : ''}`}
                                                    onClick={() => handleVoteChange(module, 'retake')}
                                                    disabled={isSubmitting || !!existingVote}
                                                    aria-label={`Voter "Rattrapage" pour ${module}`}
                                                    aria-pressed={currentVote === 'retake'}
                                                >
                                                    <XCircle size={18} />
                                                    <span>Rattrapage</span>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {modules.length > 0 && (
                                <div className="vote-summary">
                                    <div className="summary-item">
                                        <span className="summary-label">Validés:</span>
                                        <span className="summary-value validated">{validatedCount}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">Rattrapages:</span>
                                        <span className="summary-value retake">{retakeCount}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">Total:</span>
                                        <span className="summary-value">{validatedCount + retakeCount} / {modules.length}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    {existingVote ? (
                        <div className="vote-locked-message">
                            <p>✓ Vote déjà effectué. Tu ne peux plus le modifier.</p>
                        </div>
                    ) : (
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Annuler
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={!canSubmit || isSubmitting || loading}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="spinner" size={18} />
                                        <span>Enregistrement...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={18} />
                                        <span>Confirmer le vote</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

