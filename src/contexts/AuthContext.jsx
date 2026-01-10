import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import LoadingScreen from '../components/LoadingScreen'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        // 1. Initial Session Check (avec sécurité timeout)
        const checkUser = async () => {
            // Sécurité : si Supabase ne répond pas en 3s, on arrête le chargement
            const safetyTimer = setTimeout(() => {
                if (mounted && loading) {
                    console.warn('⏱️ Auth check timeout - forcing stop loading')
                    setLoading(false)
                }
            }, 3000)

            try {
                // Utilisation sécurisée sans destructuring immédiat qui peut throw
                const response = await supabase.auth.getSession()
                const session = response.data?.session
                const error = response.error

                if (error) throw error

                if (session?.user) {
                    if (mounted) setSession(session)

                    // Fetch Profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single()

                    if (mounted) {
                        setUser({ ...session.user, profile })
                    }
                } else {
                    if (mounted) {
                        setSession(null)
                        setUser(null)
                    }
                }
            } catch (error) {
                console.error('Auth Check Error:', error)
                // 🧹 Nettoyage automatique en cas de token invalide
                if (error.message && (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token'))) {
                    console.warn('⚠️ Token invalide détecté, nettoyage de la session...');
                    await supabase.auth.signOut().catch(() => { }); // Force cleanup interne
                    if (mounted) {
                        setSession(null);
                        setUser(null);
                    }
                }
            } finally {
                clearTimeout(safetyTimer)
                if (mounted) setLoading(false)
            }
        }

        checkUser()

        // 2. Auth State Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return

            if (session?.user) {
                setSession(session)
                // On recharge le profil au changement d'état (ex: login)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()

                setUser({ ...session.user, profile })
            } else {
                setSession(null)
                setUser(null)
            }
            setLoading(false)
        })

        return () => {
            mounted = false
            subscription?.unsubscribe()
        }
    }, [])

    const logOut = async () => {
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
    }

    const value = {
        session,
        user,
        logOut,
        loading
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading ? children : <LoadingScreen text="Initialisation..." />}
        </AuthContext.Provider>
    )
}
