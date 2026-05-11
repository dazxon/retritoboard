import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBY64FriyQOeh6jPC_e_lCGI8hQevRfzfA',
  authDomain: 'retritoboard.firebaseapp.com',
  projectId: 'retritoboard',
  storageBucket: 'retritoboard.firebasestorage.app',
  messagingSenderId: '126685348195',
  appId: '1:126685348195:web:6491d28d5f6f3faf121356',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
