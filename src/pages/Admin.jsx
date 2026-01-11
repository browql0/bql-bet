import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { profilesService } from '../services/profilesService'
import { settingsService } from '../services/settingsService'
import { modulesService } from '../services/modulesService'
import { predictionsService } from '../services/predictionsService'
import { sanitizeString, isValidModuleName, createSubmissionLock } from '../utils/validation'
import { 
    ShieldCheck, 
    Users, 
    Settings, 
    BookOpen, 
    BarChart3, 
    Trash2, 
    Save,
    X,
    Check,
    AlertTriangle,
    RefreshCw,
    Edit3,
    Plus,
    Loader2
} from 'lucide-react'
import LoadingState from '../components/LoadingState'
import './Admin.css'

export default function Admin() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    
    // Overview stats
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalVotes: 0,
        avgModules: 0,
        avgRattrapages: 0
    })
    
    // User management
    const [users, setUsers] = useState([])
    const [usersLoading, setUsersLoading] = useState(false)
    const [userSearch, setUserSearch] = useState('')
    
    // Settings
    const [settings, setSettings] = useState({
        voting_enabled: 'false',
        show_results: 'false',
        anonymous_votes: 'false'
    })
    const [settingsLoading, setSettingsLoading] = useState(false)
    
    // Modules
    const [modules, setModules] = useState([])
    const [modulesLoading, setModulesLoading] = useState(false)
    const [editingModule, setEditingModule] = useState(null)
    const [newModule, setNewModule] = useState('')
    
    // Messages
    const [message, setMessage] = useState({ type: '', text: '' })
    const submissionLock = useRef(createSubmissionLock())
    
    useEffect(() => {
        checkAdminAccess()
    }, [user])
    
    const checkAdminAccess = async () => {
        if (!user?.id) {
            setLoading(false)
            return
        }
        
        try {
            const adminCheck = await profilesService.isAdmin(user.id)
            setIsAdmin(adminCheck)
            if (adminCheck) {
                loadInitialData()
            } else {
                setLoading(false)
            }
        } catch (error) {
            setLoading(false)
            showMessage('error', 'Erreur lors de la vérification des droits d\'accès')
        }
    }
    
    const loadInitialData = async () => {
        try {
            await Promise.all([
                loadOverviewStats(),
                loadSettings(),
                loadModules()
            ])
        } catch (error) {
            showMessage('error', 'Erreur lors du chargement des données')
        } finally {
            setLoading(false)
        }
    }
    
    const loadOverviewStats = async () => {
        try {
            const globalStats = await predictionsService.getGlobalStats()
            const { data: allProfiles } = await profilesService.getAllProfiles()
            
            setStats({
                totalUsers: allProfiles?.length || 0,
                activeUsers: allProfiles?.filter(p => p.active)?.length || 0,
                totalVotes: globalStats?.totalVotes || 0,
                avgModules: globalStats?.avgModules || 0,
                avgRattrapages: globalStats?.avgRattrapages || 0
            })
        } catch (error) {
            // Silently fail, stats will show 0
        }
    }
    
    const loadUsers = async () => {
        setUsersLoading(true)
        try {
            const { data, error } = await profilesService.getAllProfiles()
            if (error) throw error
            setUsers(data || [])
        } catch (error) {
            showMessage('error', 'Erreur lors du chargement des utilisateurs')
        } finally {
            setUsersLoading(false)
        }
    }
    
    const loadSettings = async () => {
        try {
            const { data } = await settingsService.getAllSettings()
            setSettings(prev => ({ ...prev, ...data }))
        } catch (error) {
            // Silently fail, defaults will be used
        }
    }
    
    const loadModules = async () => {
        setModulesLoading(true)
        try {
            const { data } = await modulesService.getModulesList()
            setModules(data || [])
        } catch (error) {
            showMessage('error', 'Erreur lors du chargement des modules')
        } finally {
            setModulesLoading(false)
        }
    }
    
    const handleUpdateSetting = async (key, value) => {
        setSettingsLoading(true)
        try {
            const { success, error } = await settingsService.updateSetting(key, value)
            if (error) throw error
            if (success) {
                setSettings(prev => ({ ...prev, [key]: value }))
                showMessage('success', 'Paramètre mis à jour avec succès')
                if (key === 'modules_list') {
                    await loadModules()
                }
            }
        } catch (error) {
            showMessage('error', 'Erreur lors de la mise à jour')
        } finally {
            setSettingsLoading(false)
        }
    }
    
    const handleToggleUserActive = async (userId, currentActive) => {
        try {
            const { success, error } = await profilesService.updateProfile(userId, { 
                active: !currentActive 
            })
            if (error) throw error
            if (success) {
                await loadUsers()
                showMessage('success', `Utilisateur ${!currentActive ? 'activé' : 'désactivé'} avec succès`)
            }
        } catch (error) {
            showMessage('error', 'Erreur lors de la mise à jour')
        }
    }
    
    const handleAddModule = async () => {
        if (submissionLock.current.isSubmitting()) return
        
        const sanitized = sanitizeString(newModule)
        if (!sanitized.trim()) {
            showMessage('error', 'Le nom du module est requis')
            return
        }
        
        const moduleName = sanitized.trim()
        
        // Validate module name
        if (!isValidModuleName(moduleName)) {
            showMessage('error', 'Le nom du module contient des caractères invalides')
            return
        }
        
        if (modules.includes(moduleName)) {
            showMessage('error', 'Ce module existe déjà')
            return
        }
        
        if (modules.length >= 50) {
            showMessage('error', 'Nombre maximum de modules atteint (50)')
            return
        }
        
        setModulesLoading(true)
        try {
            await submissionLock.current.execute(async () => {
                const updatedModules = [...modules, moduleName]
                const { success, error } = await settingsService.updateSetting('modules_list', JSON.stringify(updatedModules))
                if (error) throw error
                if (success) {
                    setModules(updatedModules)
                    setNewModule('')
                    showMessage('success', 'Module ajouté avec succès')
                }
            })
        } catch (error) {
            if (error.message !== 'Une soumission est déjà en cours') {
                showMessage('error', 'Erreur lors de l\'ajout')
            }
        } finally {
            setModulesLoading(false)
        }
    }
    
    const handleUpdateModule = async (oldName, newName) => {
        if (submissionLock.current.isSubmitting()) return
        
        const sanitized = sanitizeString(newName)
        if (!sanitized.trim() || sanitized.trim() === oldName) {
            setEditingModule(null)
            return
        }
        
        const moduleName = sanitized.trim()
        
        // Validate module name
        if (!isValidModuleName(moduleName)) {
            showMessage('error', 'Le nom du module contient des caractères invalides')
            setEditingModule(null)
            return
        }
        
        if (modules.includes(moduleName) && moduleName !== oldName) {
            showMessage('error', 'Ce nom de module existe déjà')
            setEditingModule(null)
            return
        }
        
        setModulesLoading(true)
        try {
            await submissionLock.current.execute(async () => {
                const updatedModules = modules.map(m => m === oldName ? moduleName : m)
                const { success, error } = await settingsService.updateSetting('modules_list', JSON.stringify(updatedModules))
                if (error) throw error
                if (success) {
                    setModules(updatedModules)
                    setEditingModule(null)
                    showMessage('success', 'Module mis à jour avec succès')
                }
            })
        } catch (error) {
            if (error.message !== 'Une soumission est déjà en cours') {
                showMessage('error', 'Erreur lors de la mise à jour')
            }
            setEditingModule(null)
        } finally {
            setModulesLoading(false)
        }
    }
    
    const handleDeleteModule = async (moduleName) => {
        if (submissionLock.current.isSubmitting()) return
        if (!confirm(`Supprimer le module "${moduleName}" ?`)) return
        
        setModulesLoading(true)
        try {
            await submissionLock.current.execute(async () => {
                const updatedModules = modules.filter(m => m !== moduleName)
                const { success, error } = await settingsService.updateSetting('modules_list', JSON.stringify(updatedModules))
                if (error) throw error
                if (success) {
                    setModules(updatedModules)
                    showMessage('success', 'Module supprimé avec succès')
                }
            })
        } catch (error) {
            if (error.message !== 'Une soumission est déjà en cours') {
                showMessage('error', 'Erreur lors de la suppression')
            }
        } finally {
            setModulesLoading(false)
        }
    }
    
    const handleResetVotes = async () => {
        if (submissionLock.current.isSubmitting()) return
        if (!confirm('⚠️ Cette action supprimera TOUS les votes. Êtes-vous sûr ?')) return
        
        try {
            await submissionLock.current.execute(async () => {
                const { success, error } = await predictionsService.resetAllPredictions()
                if (error) throw error
                if (success) {
                    await loadOverviewStats()
                    showMessage('success', 'Tous les votes ont été supprimés')
                }
            })
        } catch (error) {
            if (error.message !== 'Une soumission est déjà en cours') {
                showMessage('error', 'Erreur lors de la suppression')
            }
        }
    }
    
    const showMessage = (type, text) => {
        setMessage({ type, text })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }
    
    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers()
        }
    }, [activeTab])
    
    if (loading) {
        return (
            <div className="page">
                <LoadingState text="Vérification des droits d'accès..." />
            </div>
        )
    }
    
    if (!isAdmin) {
        return (
            <div className="page">
                <div className="admin-access-denied">
                    <ShieldCheck size={64} />
                    <h1>Accès refusé</h1>
                    <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
                </div>
            </div>
        )
    }
    
    const filteredUsers = users.filter(u => 
        u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.matricule?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
    )
    
    return (
        <div className="page">
            <div className="admin-header">
                <div className="admin-header-icon">
                    <ShieldCheck size={32} />
                </div>
                <div>
                    <h1 className="admin-title">Panneau d'Administration</h1>
                    <p className="admin-subtitle">Gérer les utilisateurs, paramètres et modules</p>
                </div>
            </div>
            
            {message.text && (
                <div className={`alert alert-${message.type} mb-md fade-in`}>
                    {message.type === 'success' && <Check size={18} />}
                    {message.type === 'error' && <AlertTriangle size={18} />}
                    <span>{message.text}</span>
                </div>
            )}
            
            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <BarChart3 size={20} />
                    <span>Vue d'ensemble</span>
                </button>
                <button
                    className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={20} />
                    <span>Utilisateurs</span>
                </button>
                <button
                    className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    <Settings size={20} />
                    <span>Paramètres</span>
                </button>
                <button
                    className={`admin-tab ${activeTab === 'modules' ? 'active' : ''}`}
                    onClick={() => setActiveTab('modules')}
                >
                    <BookOpen size={20} />
                    <span>Modules</span>
                </button>
            </div>
            
            <div className="admin-content">
                {activeTab === 'overview' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">
                            <BarChart3 size={24} />
                            <span>Statistiques générales</span>
                        </h2>
                        <div className="admin-stats-grid">
                            <div className="admin-stat-card">
                                <div className="admin-stat-value">{stats.totalUsers}</div>
                                <div className="admin-stat-label">Utilisateurs totaux</div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-value">{stats.activeUsers}</div>
                                <div className="admin-stat-label">Utilisateurs actifs</div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-value">{stats.totalVotes}</div>
                                <div className="admin-stat-label">Votes totaux</div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-value">{stats.avgModules.toFixed(1)}</div>
                                <div className="admin-stat-label">Moy. Modules</div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-value">{stats.avgRattrapages.toFixed(1)}</div>
                                <div className="admin-stat-label">Moy. Rattrapages</div>
                            </div>
                        </div>
                        
                        <div className="admin-actions">
                            <button
                                className="btn btn-danger"
                                onClick={handleResetVotes}
                            >
                                <Trash2 size={18} />
                                <span>Réinitialiser tous les votes</span>
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={loadOverviewStats}
                            >
                                <RefreshCw size={18} />
                                <span>Actualiser</span>
                            </button>
                        </div>
                    </div>
                )}
                
                {activeTab === 'users' && (
                    <div className="admin-section">
                        <div className="admin-section-header">
                            <h2 className="admin-section-title">
                                <Users size={24} />
                                <span>Gestion des utilisateurs</span>
                            </h2>
                            <div className="admin-search">
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom, matricule, email..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(sanitizeString(e.target.value))}
                                    className="admin-search-input"
                                    maxLength={150}
                                    aria-label="Rechercher des utilisateurs"
                                />
                            </div>
                        </div>
                        
                        {usersLoading ? (
                            <div className="admin-loading">
                                <Loader2 className="spinner" size={32} />
                                <p>Chargement des utilisateurs...</p>
                            </div>
                        ) : (
                            <div className="user-list">
                                {filteredUsers.length === 0 ? (
                                    <div className="admin-empty">
                                        <Users size={48} />
                                        <p>Aucun utilisateur trouvé</p>
                                    </div>
                                ) : (
                                    filteredUsers.map(userItem => (
                                        <div key={userItem.id} className="user-item">
                                            <div className="user-item-info">
                                                <div className="user-item-avatar">
                                                    {userItem.full_name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <div className="user-item-details">
                                                    <div className="user-item-name">
                                                        {userItem.full_name || 'Nom inconnu'}
                                                        {userItem.role === 'admin' && (
                                                            <span className="user-badge admin">Admin</span>
                                                        )}
                                                        {!userItem.active && (
                                                            <span className="user-badge inactive">Inactif</span>
                                                        )}
                                                    </div>
                                                    <div className="user-item-meta">
                                                        {userItem.matricule && <span>Matricule: {userItem.matricule}</span>}
                                                        {userItem.email && <span>Email: {userItem.email}</span>}
                                                        {userItem.groupe && <span>Groupe: {userItem.groupe}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="user-item-actions">
                                                <button
                                                    className={`btn btn-sm ${userItem.active ? 'btn-warning' : 'btn-success'}`}
                                                    onClick={() => handleToggleUserActive(userItem.id, userItem.active)}
                                                    disabled={userItem.id === user?.id}
                                                >
                                                    {userItem.active ? 'Désactiver' : 'Activer'}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'settings' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">
                            <Settings size={24} />
                            <span>Paramètres de la plateforme</span>
                        </h2>
                        
                        <div className="settings-list">
                            <div className="setting-item">
                                <div className="setting-info">
                                    <div className="setting-label">Activer les votes</div>
                                    <div className="setting-description">
                                        Permet aux utilisateurs de voter pour leurs camarades
                                    </div>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.voting_enabled === 'true'}
                                        onChange={(e) => handleUpdateSetting('voting_enabled', e.target.checked ? 'true' : 'false')}
                                        disabled={settingsLoading}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            
                            <div className="setting-item">
                                <div className="setting-info">
                                    <div className="setting-label">Afficher les résultats</div>
                                    <div className="setting-description">
                                        Rend les résultats visibles pour tous les utilisateurs
                                    </div>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.show_results === 'true'}
                                        onChange={(e) => handleUpdateSetting('show_results', e.target.checked ? 'true' : 'false')}
                                        disabled={settingsLoading}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            
                            <div className="setting-item">
                                <div className="setting-info">
                                    <div className="setting-label">Votes anonymes</div>
                                    <div className="setting-description">
                                        Masque l'identité des votants dans les résultats
                                    </div>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.anonymous_votes === 'true'}
                                        onChange={(e) => handleUpdateSetting('anonymous_votes', e.target.checked ? 'true' : 'false')}
                                        disabled={settingsLoading}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'modules' && (
                    <div className="admin-section">
                        <div className="admin-section-header">
                            <h2 className="admin-section-title">
                                <BookOpen size={24} />
                                <span>Gestion des modules</span>
                            </h2>
                        </div>
                        
                        <div className="modules-add">
                            <input
                                type="text"
                                placeholder="Nom du module..."
                                value={newModule}
                                onChange={(e) => setNewModule(sanitizeString(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}
                                className="admin-input"
                                disabled={modulesLoading || submissionLock.current.isSubmitting()}
                                maxLength={100}
                                aria-label="Nom du module à ajouter"
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleAddModule}
                                disabled={!newModule.trim() || modulesLoading}
                            >
                                <Plus size={18} />
                                <span>Ajouter</span>
                            </button>
                        </div>
                        
                        {modulesLoading ? (
                            <div className="admin-loading">
                                <Loader2 className="spinner" size={32} />
                                <p>Chargement...</p>
                            </div>
                        ) : (
                            <div className="modules-list">
                                {modules.length === 0 ? (
                                    <div className="admin-empty">
                                        <BookOpen size={48} />
                                        <p>Aucun module configuré</p>
                                    </div>
                                ) : (
                                    modules.map((module, index) => (
                                        <div key={index} className="module-list-item">
                                            {editingModule === index ? (
                                                <input
                                                    type="text"
                                                    defaultValue={module}
                                                    onBlur={(e) => handleUpdateModule(module, sanitizeString(e.target.value))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleUpdateModule(module, sanitizeString(e.target.value))
                                                        } else if (e.key === 'Escape') {
                                                            setEditingModule(null)
                                                        }
                                                    }}
                                                    className="admin-input"
                                                    autoFocus
                                                    disabled={modulesLoading || submissionLock.current.isSubmitting()}
                                                    maxLength={100}
                                                    aria-label="Modifier le nom du module"
                                                />
                                            ) : (
                                                <span className="module-name">{module}</span>
                                            )}
                                            <div className="module-actions">
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => setEditingModule(editingModule === index ? null : index)}
                                                    disabled={modulesLoading}
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    className="btn-icon btn-icon-danger"
                                                    onClick={() => handleDeleteModule(module)}
                                                    disabled={modulesLoading}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

