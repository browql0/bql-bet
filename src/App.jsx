import { useState, useMemo } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Vote, Trophy, User, LogOut } from 'lucide-react'
import { authService } from './services/authService'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Results from './pages/Results'
import './components/Navbar.css'
import './App.css'

// Composant interne qui consomme le contexte Auth
const AppContent = () => {
  const { user, session, logOut } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard') // Default page for logged users
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await authService.signOut()
      await logOut()
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Navigation pour utilisateur connecté - Utilise useMemo pour éviter les re-renders
  const currentPageComponent = useMemo(() => {
    if (!session || !user) return null
    
    switch (currentPage) {
      case 'profile': 
        return <Profile key="profile" user={user} />
      case 'results': 
        return <Results key="results" user={user} />
      case 'dashboard':
      default: 
        return <Dashboard key="dashboard" user={user} />
    }
  }, [currentPage, session, user])

  // Gestion simplifiée de la navigation
  // Si pas de session, on est forcé sur Login ou Signup
  if (!session) {
    return (
      <div className="app-container">
        {currentPage === 'signup'
          ? <Signup onNavigate={setCurrentPage} />
          : <Login onNavigate={setCurrentPage} />
        }
      </div>
    )
  }

  return (
    <div className="app-container fade-in">
      <div className="container" style={{ paddingBottom: '100px' }}>
        {currentPageComponent}
      </div>

      <nav className="navbar fade-in" role="navigation" aria-label="Navigation principale">
        <div className="navbar-main">
          <button
            className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
            aria-label="Page de vote"
            aria-current={currentPage === 'dashboard' ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              <Vote size={24} />
            </span>
            <span className="nav-label">Vote</span>
          </button>

          <button
            className={`nav-item ${currentPage === 'results' ? 'active' : ''}`}
            onClick={() => setCurrentPage('results')}
            aria-label="Résultats"
            aria-current={currentPage === 'results' ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              <Trophy size={24} />
            </span>
            <span className="nav-label">Résultats</span>
          </button>

          <button
            className={`nav-item ${currentPage === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentPage('profile')}
            aria-label="Mon profil"
            aria-current={currentPage === 'profile' ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              <User size={24} />
            </span>
            <span className="nav-label">Profil</span>
          </button>
        </div>

        <div className="navbar-separator"></div>

        <button
          className="nav-item nav-logout"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <span className="nav-icon" aria-hidden="true">
            <LogOut size={20} />
          </span>
          <span className="nav-label">Déconnexion</span>
        </button>
      </nav>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
