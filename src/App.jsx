import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
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

  // Navigation pour utilisateur connecté
  const renderPage = () => {
    switch (currentPage) {
      case 'profile': return <Profile user={user} />
      case 'results': return <Results user={user} />
      case 'dashboard':
      default: return <Dashboard user={user} />
    }
  }

  return (
    <div className="app-container fade-in">
      <div className="container" style={{ paddingBottom: '100px' }}>
        {renderPage()}
      </div>

      <nav className="navbar fade-in">
        <button
          className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentPage('dashboard')}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Vote</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'results' ? 'active' : ''}`}
          onClick={() => setCurrentPage('results')}
        >
          <span className="nav-icon">🏆</span>
          <span className="nav-label">Résultats</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentPage('profile')}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profil</span>
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
