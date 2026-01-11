import { useState, useMemo, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Vote, Trophy, User, LogOut, ShieldCheck } from 'lucide-react'
import { authService } from './services/authService'
import { profilesService } from './services/profilesService'
import ErrorBoundary from './components/ErrorBoundary'
import { lazy, Suspense } from 'react'
import LoadingState from './components/LoadingState'
import Login from './pages/Login'
import Signup from './pages/Signup'

// Lazy load heavy components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const Results = lazy(() => import('./pages/Results'))
const Admin = lazy(() => import('./pages/Admin'))
import './components/Navbar.css'
import './App.css'

// Composant interne qui consomme le contexte Auth
const AppContent = () => {
  const { user, session, logOut } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard') // Default page for logged users
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await authService.signOut()
      await logOut()
    } catch (error) {
      // Silently handle logout errors
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        setIsAdmin(false)
        setCheckingAdmin(false)
        return
      }
      
      try {
        const adminStatus = await profilesService.isAdmin(user.id)
        setIsAdmin(adminStatus)
      } catch (error) {
        setIsAdmin(false)
      } finally {
        setCheckingAdmin(false)
      }
    }
    
    checkAdminStatus()
  }, [user?.id])

  // Navigation pour utilisateur connecté - Utilise useMemo pour éviter les re-renders
  const currentPageComponent = useMemo(() => {
    if (!session || !user) return null
    
    let Page = null
    switch (currentPage) {
      case 'admin':
        Page = <Admin key="admin" />
        break
      case 'profile':
        Page = <Profile key="profile" user={user} />
        break
      case 'results':
        Page = <Results key="results" user={user} />
        break
      case 'dashboard':
      default:
        Page = <Dashboard key="dashboard" user={user} />
        break
    }
    
    return (
      <Suspense fallback={<LoadingState text="Chargement de la page..." />}>
        {Page}
      </Suspense>
    )
  }, [currentPage, session, user])
  
  // Redirect away from admin if not admin
  useEffect(() => {
    if (!checkingAdmin && currentPage === 'admin' && !isAdmin) {
      setCurrentPage('dashboard')
    }
  }, [currentPage, isAdmin, checkingAdmin])

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
      <a href="#main-content" className="skip-to-main">Aller au contenu principal</a>
      <div className="container" style={{ paddingBottom: '100px' }} id="main-content" role="main">
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
          
          {isAdmin && (
            <button
              className={`nav-item ${currentPage === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentPage('admin')}
              aria-label="Administration"
              aria-current={currentPage === 'admin' ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                <ShieldCheck size={24} />
              </span>
              <span className="nav-label">Admin</span>
            </button>
          )}
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
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
