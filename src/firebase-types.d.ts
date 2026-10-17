declare module 'firebase/app' {
  export function initializeApp(config: any): any;
  export function getApps(): any[];
  export type FirebaseApp = any;
}
declare module 'firebase/auth' {
  export function getAuth(app?: any): any;
  export type User = any;
  export type Auth = any;
  export function onAuthStateChanged(auth: Auth, cb: (u: User | null) => void): () => void;
  export function createUserWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<{ user: User }>;
  export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<{ user: User }>;
  export function signOut(auth: Auth): Promise<void>;
  export function deleteUser(user: User): Promise<void>;
  export function updateProfile(user: User, data: { displayName?: string; photoURL?: string }): Promise<void>;
}
declare module 'firebase/firestore' {
  export function getFirestore(app?: any): any;
  export type Firestore = any;
  export type DocumentData = any;
  export function doc(db: Firestore, path: string, ...ids: string[]): any;
  export function getDoc(ref: any): Promise<{ exists(): boolean; data(): DocumentData }>;
  export function setDoc(ref: any, data: any, opts?: any): Promise<void>;
  export function updateDoc(ref: any, data: any): Promise<void>;
  export function increment(v: number): any;
  export function collection(db: Firestore, path: string): any;
  export function query(...args: any[]): any;
  export function orderBy(field: string, directionStr?: 'asc' | 'desc'): any;
  export function limit(n: number): any;
  export function getDocs(q: any): Promise<{ docs: Array<{ data(): DocumentData }> }>;
}
