import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDE2hNl8tME4MrJR2jzjPXEaklUQ_shCQ8",
  authDomain: "mirecetario-1a58d.firebaseapp.com",
  projectId: "mirecetario-1a58d",
  storageBucket: "mirecetario-1a58d.firebasestorage.app",
  messagingSenderId: "174183238596",
  appId: "1:174183238596:web:1fdfe149a4f2c0f0033291"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore con persistencia local en caché multitestaña (IndexedDB)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Inicializar Auth
const auth = getAuth(app);

// Proveedores de Autenticación
const googleProvider = new GoogleAuthProvider();
const emailProvider = new EmailAuthProvider();

export { app, db, auth, googleProvider, emailProvider };
export default app;
