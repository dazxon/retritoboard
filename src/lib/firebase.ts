import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

// `vite build --mode emulator` (lo usa npm run test:e2e) apunta a los
// emuladores locales en vez del proyecto real
const EMULATOR = import.meta.env.MODE === 'emulator'

const firebaseConfig = {
  apiKey: 'AIzaSyBY64FriyQOeh6jPC_e_lCGI8hQevRfzfA',
  authDomain: 'retritoboard.firebaseapp.com',
  projectId: EMULATOR ? 'demo-retritoboard' : 'retritoboard',
  storageBucket: 'retritoboard.firebasestorage.app',
  messagingSenderId: '126685348195',
  appId: '1:126685348195:web:6491d28d5f6f3faf121356',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

if (EMULATOR) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
