import { create } from 'zustand'

// ── DB helpers ──────────────────────────────────────────────────────────
const DB_KEY   = (uid) => `tabungdulu_${uid}`
const CATS_KEY = (uid) => `tabungdulu_cats_${uid}`

function loadDB(uid) {
  try { const r = localStorage.getItem(DB_KEY(uid)); return r ? JSON.parse(r) : null } catch { return null }
}
function saveDB(uid, data) {
  try { localStorage.setItem(DB_KEY(uid), JSON.stringify(data)) } catch {}
}

const USERS_KEY = 'tabungdulu_users'
function loadUsers() {
  try { const r = localStorage.getItem(USERS_KEY); return r ? JSON.parse(r) : {} } catch { return {} }
}
function saveUsers(u) { try { localStorage.setItem(USERS_KEY, JSON.stringify(u)) } catch {} }
function loadSession() {
  try { const r = localStorage.getItem('tabungdulu_session'); return r ? JSON.parse(r) : null } catch { return null }
}
function saveSession(s) {
  try { if (s) localStorage.setItem('tabungdulu_session', JSON.stringify(s)); else localStorage.removeItem('tabungdulu_session') } catch {}
}

// Default categories per user
const DEFAULT_INCOME_CATS  = ['Gaji','Freelance','Investasi','Bisnis','Bonus','Lainnya']
const DEFAULT_EXPENSE_CATS = ['Makanan','Transport','Belanja','Tagihan','Hiburan','Kesehatan','Pendidikan','Lainnya']

function loadCats(uid) {
  try {
    const r = localStorage.getItem(CATS_KEY(uid))
    if (r) return JSON.parse(r)
  } catch {}
  return { income: [...DEFAULT_INCOME_CATS], expense: [...DEFAULT_EXPENSE_CATS] }
}
function saveCats(uid, cats) {
  try { localStorage.setItem(CATS_KEY(uid), JSON.stringify(cats)) } catch {}
}

const emptyState = (user) => ({
  user: { name: user.name, email: user.email, phone: user.phone || '' },
  targets: [],
  transactions: [],
  recurring: [],
  aiChats: [{ role: 'ai', text: 'Halo! Aku TabungDulu Advisor. Mau bantu apa hari ini? 💚' }],
  nextId: 1,
  settings: { currency: 'IDR', notifWeekly: true, notifTarget: true, twoFA: false },
})

const session = loadSession()

export const useStore = create((set, get) => {
  const initData = session ? (loadDB(session.uid) || emptyState(session)) : null
  const initCats = session ? loadCats(session.uid) : { income: [...DEFAULT_INCOME_CATS], expense: [...DEFAULT_EXPENSE_CATS] }

  return {
    authUser: session || null,
    authError: null,
    categories: initCats,
    ...(initData || {
      user: null, targets: [], transactions: [], recurring: [],
      aiChats: [], nextId: 1,
      settings: { currency: 'IDR', notifWeekly: true, notifTarget: true, twoFA: false },
    }),

    _persist: () => {
      const s = get()
      if (!s.authUser) return
      saveDB(s.authUser.uid, {
        user: s.user, targets: s.targets, transactions: s.transactions,
        recurring: s.recurring, aiChats: s.aiChats, nextId: s.nextId, settings: s.settings,
      })
    },
    _persistCats: () => {
      const s = get()
      if (!s.authUser) return
      saveCats(s.authUser.uid, s.categories)
    },

    // ── AUTH ─────────────────────────────────────────────────────────
    register: ({ name, email, password }) => {
      const users = loadUsers()
      if (users[email]) { set({ authError: 'Email sudah terdaftar!' }); return false }
      const uid = 'u_' + Date.now()
      users[email] = { uid, name, email, password }
      saveUsers(users)
      const sess = { uid, email, name }
      saveSession(sess)
      const data = emptyState({ name, email })
      const cats = { income: [...DEFAULT_INCOME_CATS], expense: [...DEFAULT_EXPENSE_CATS] }
      saveDB(uid, data)
      saveCats(uid, cats)
      set({ authUser: sess, authError: null, ...data, categories: cats })
      return true
    },

    login: ({ email, password }) => {
      const users = loadUsers()
      const u = users[email]
      if (!u) { set({ authError: 'Email tidak ditemukan!' }); return false }
      if (u.password !== password) { set({ authError: 'Password salah!' }); return false }
      const sess = { uid: u.uid, email: u.email, name: u.name }
      saveSession(sess)
      const data = loadDB(u.uid) || emptyState(u)
      const cats = loadCats(u.uid)
      set({ authUser: sess, authError: null, ...data, categories: cats })
      return true
    },

    logout: () => {
      saveSession(null)
      set({
        authUser: null, authError: null, user: null, targets: [], transactions: [],
        recurring: [], aiChats: [], nextId: 1,
        settings: { currency: 'IDR', notifWeekly: true, notifTarget: true, twoFA: false },
        categories: { income: [...DEFAULT_INCOME_CATS], expense: [...DEFAULT_EXPENSE_CATS] },
      })
    },

    clearAuthError: () => set({ authError: null }),

    // ── CATEGORIES ────────────────────────────────────────────────────
    addCategory: (type, name) => {
      const s = get()
      const trimmed = name.trim()
      if (!trimmed) return false
      if (s.categories[type].includes(trimmed)) return false
      const updated = { ...s.categories, [type]: [...s.categories[type], trimmed] }
      set({ categories: updated })
      get()._persistCats()
      return true
    },
    removeCategory: (type, name) => {
      const s = get()
      const updated = { ...s.categories, [type]: s.categories[type].filter(c => c !== name) }
      set({ categories: updated })
      get()._persistCats()
    },
    resetCategories: () => {
      const cats = { income: [...DEFAULT_INCOME_CATS], expense: [...DEFAULT_EXPENSE_CATS] }
      set({ categories: cats })
      get()._persistCats()
    },

    // ── USER ─────────────────────────────────────────────────────────
    updateUser: (d) => { set(s => ({ user: { ...s.user, ...d } })); get()._persist() },
    updateSettings: (d) => { set(s => ({ settings: { ...s.settings, ...d } })); get()._persist() },

    // ── TRANSACTIONS ──────────────────────────────────────────────────
    addTransaction: (txn) => {
      set(s => ({
        transactions: [{ ...txn, id: s.nextId, date: txn.date || new Date().toISOString().split('T')[0] }, ...s.transactions],
        nextId: s.nextId + 1,
      }))
      get()._persist()
    },
    deleteTransaction: (id) => {
      set(s => ({ transactions: s.transactions.filter(t => t.id !== id) }))
      get()._persist()
    },
    updateTransaction: (id, updates) => {
      set(s => ({ transactions: s.transactions.map(t => t.id === id ? { ...t, ...updates } : t) }))
      get()._persist()
    },

    // ── TARGETS ───────────────────────────────────────────────────────
    addTarget: (t) => {
      set(s => ({ targets: [...s.targets, { ...t, id: s.nextId, saved: 0 }], nextId: s.nextId + 1 }))
      get()._persist()
    },
    updateTarget: (id, d) => {
      set(s => ({ targets: s.targets.map(t => t.id === id ? { ...t, ...d } : t) }))
      get()._persist()
    },
    deleteTarget: (id) => {
      set(s => ({ targets: s.targets.filter(t => t.id !== id) }))
      get()._persist()
    },

    getAvailableBalance: () => {
      const s = get()
      return s.getTotalIncome() - s.getTotalExpense() - s.getTotalSaved()
    },

    addToTarget: (id, amt) => {
      const s = get()
      const available = s.getAvailableBalance()
      if (available <= 0) return 0
      const target = s.targets.find(t => t.id === id)
      if (!target) return 0
      const maxDeposit = Math.min(amt, available, target.goal - target.saved)
      if (maxDeposit <= 0) return 0
      set(ss => ({ targets: ss.targets.map(t => t.id === id ? { ...t, saved: t.saved + maxDeposit } : t) }))
      get()._persist()
      return maxDeposit
    },

    // ── RECURRING ─────────────────────────────────────────────────────
    addRecurring: (r) => {
      set(s => ({ recurring: [...s.recurring, { ...r, id: s.nextId }], nextId: s.nextId + 1 }))
      get()._persist()
    },
    deleteRecurring: (id) => {
      set(s => ({ recurring: s.recurring.filter(r => r.id !== id) }))
      get()._persist()
    },

    // ── AI CHAT ───────────────────────────────────────────────────────
    addAIChat: (msg) => { set(s => ({ aiChats: [...s.aiChats, msg] })); get()._persist() },
    clearAIChat: () => {
      set({ aiChats: [{ role: 'ai', text: 'Halo! Aku Tablu 💚 Siap bantu dari awal!' }] })
      get()._persist()
    },

    // ── CLEAR DATA ────────────────────────────────────────────────────
    clearAllTransactions: () => { set({ transactions: [] }); get()._persist() },
    clearAllTargets:      () => { set({ targets: [] }); get()._persist() },
    clearAllRecurring:    () => { set({ recurring: [] }); get()._persist() },
    clearAllData: () => {
      set({ transactions: [], targets: [], recurring: [], nextId: 1, aiChats: [{ role: 'ai', text: 'Data direset! Siap bantu dari awal 💚' }] })
      get()._persist()
    },
    deleteLastTransaction: () => { set(s => ({ transactions: s.transactions.slice(1) })); get()._persist() },
    deleteTransactionsByCategory: (cat) => {
      set(s => ({ transactions: s.transactions.filter(t => t.category !== cat) }))
      get()._persist()
    },

    // ── COMPUTED ──────────────────────────────────────────────────────
    getTotalIncome:  () => get().transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0),
    getTotalExpense: () => get().transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
    getBalance:      () => { const s = get(); return s.getTotalIncome() - s.getTotalExpense() },
    getTotalSaved:   () => get().targets.reduce((a, t) => a + t.saved, 0),
    getTotalGoal:    () => get().targets.reduce((a, t) => a + t.goal, 0),
  }
})

// Expose changePassword as a standalone export helper
// (called directly, not through zustand, since we need loadUsers/saveUsers)
export function changePassword(email, oldPw, newPw) {
  const users = JSON.parse(localStorage.getItem('tabungdulu_users') || '{}')
  const u = users[email]
  if (!u) return 'Email tidak ditemukan!'
  if (u.password !== oldPw) return 'Password lama salah!'
  users[email] = { ...u, password: newPw }
  localStorage.setItem('tabungdulu_users', JSON.stringify(users))
  return null // null = success
}
