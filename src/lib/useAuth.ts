import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { auth } from './firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u)
        setLoading(false)
      } else {
        signInAnonymously(auth).catch((e) => {
          console.error('Anonymous sign-in failed', e)
          setLoading(false)
        })
      }
    })
    return unsub
  }, [])

  return { user, loading }
}
