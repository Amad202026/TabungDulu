import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// ── DB helpers (sementara dipakai untuk data non-auth, lokal) ───────────
const DB_KEY   = (uid) => `tabungdulu_${uid}`
const CATS_KEY = (uid) => `tabungdulu_cats_${uid}`

function loadDB(uid) {
  try { const r = localStorage.getItem(DB_KEY(uid)); return r ? JSON.parse(r) : null } catch { return null }
}
function saveDB(uid, data) {
  try { localStorage.setItem(DB_KEY(uid), JSON.stringify(data)) } catch {}
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

export const useStore = create((set, get) => {
  return {
    authUser: null,
    authError: null,
    authLoading: true,
    categories: { income: [...DEFAULT_INCOME_CATS], expense: [...DEFAULT_EXPENSE_CATS] },
    user: null, targets: [], transactions: [], recurring: [],
    aiChats: [], nextId: 1,
    settings: { currency: 'IDR', notifWeekly: true, notifTarget: true, twoFA: false },

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
    initAuth: async () => {
      const { data } = await supabase.auth.getSession()
      const sUser = data?.session?.user
      if (sUser) {
        const sess = { uid: sUser.id, email: sUser.email, name: sUser.user_metadata?.name || sUser.email }
        const localData = loadDB(sUser.id) || emptyState(sess)
        const cats = loadCats(sUser.id)
        set({ authUser: sess, categories: cats, ...localData, authLoading: false })
        get().loadTransactions()
      } else {
        set({ authLoading: false })
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        const sUser = session?.user
        if (sUser) {
          const sess = { uid: sUser.id, email: sUser.email, name: sUser.user_metadata?.name || sUser.email }
          const localData = loadDB(sUser.id) || emptyState(sess)
          const cats = loadCats(sUser.id)
          set({ authUser: sess, authError: null, categories: cats, ...localData })
          get().loadTransactions()
        } else {
          set({
            authUser: null, user: null, targets: [], transactions: [],
            recurring: [], aiChats: [], nextId: 1,
            settings: { currency: 'IDR', notifWeekly: true, notifTarget: true, twoFA: false },
            categories: { income: [...DEFAULT_INCOME_CATS], expense: [...DEFAULT_EXPENSE_CATS] },
          })
        }
      })
    },

    register: async ({ name, email, password }) => {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { name } },
      })
      if (error) { set({ authError: error.message }); return false }
      // jika konfirmasi email diaktifkan, session bisa null
      if (data.session && data.user) {
        const sess = { uid: data.user.id, email: data.user.email, name }
        const emptyData = emptyState(sess)
        const cats = { income: [...DEFAULT_INCOME_CATS], expense: [...DEFAULT_EXPENSE_CATS] }
        saveDB(sess.uid, emptyData)
        saveCats(sess.uid, cats)
        set({ authUser: sess, authError: null, categories: cats, ...emptyData })
      } else {
        set({ authError: 'Cek email kamu untuk konfirmasi akun, lalu login.' })
      }
      return true
    },

    login: async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { set({ authError: 'Email atau password salah!' }); return false }
      const sUser = data.user
      const sess = { uid: sUser.id, email: sUser.email, name: sUser.user_metadata?.name || sUser.email }
      const localData = loadDB(sess.uid) || emptyState(sess)
      const cats = loadCats(sess.uid)
      saveDB(sess.uid, localData)
      set({ authUser: sess, authError: null, categories: cats, ...localData })
      get().loadTransactions()
      return true
    },

    logout: async () => {
      await supabase.auth.signOut()
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
      const s = get()
      const tempId = 'tmp_' + Date.now()
      const date = txn.date || new Date().toISOString().split('T')[0]
      const newTxn = { ...txn, id: tempId, date }
      set({ transactions: [newTxn, ...s.transactions] })
      get()._persist()

      if (s.authUser) {
        supabase.from('transactions').insert({
          user_id: s.authUser.uid,
          type: txn.type,
          amount: txn.amount,
          note: txn.note,
          category: txn.category,
          transaction_date: date,
        }).select().single().then(({ data, error }) => {
          if (error) return
          set(ss => ({ transactions: ss.transactions.map(t => t.id === tempId ? { ...t, id: data.id } : t) }))
          get()._persist()
        })
      }
    },
    deleteTransaction: (id) => {
      const s = get()
      set({ transactions: s.transactions.filter(t => t.id !== id) })
      get()._persist()
      if (s.authUser && typeof id === 'string' && !id.startsWith('tmp_')) {
        supabase.from('transactions').delete().eq('id', id).then(() => {})
      }
    },
    updateTransaction: (id, updates) => {
      const s = get()
      set({ transactions: s.transactions.map(t => t.id === id ? { ...t, ...updates } : t) })
      get()._persist()
      if (s.authUser && typeof id === 'string' && !id.startsWith('tmp_')) {
        const payload = {}
        if (updates.type) payload.type = updates.type
        if (updates.amount !== undefined) payload.amount = updates.amount
        if (updates.note !== undefined) payload.note = updates.note
        if (updates.category !== undefined) payload.category = updates.category
        if (updates.date !== undefined) payload.transaction_date = updates.date
        supabase.from('transactions').update(payload).eq('id', id).then(() => {})
      }
    },

    // ── LOAD FROM SUPABASE ──────────────────────────────────────────────
    loadTransactions: async () => {
      const s = get()
      if (!s.authUser) return
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error || !data) return
      const mapped = data.map(r => ({
        id: r.id, type: r.type, amount: parseFloat(r.amount),
        note: r.note, category: r.category, date: r.transaction_date,
      }))
      set({ transactions: mapped })
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
    clearAllTransactions: () => {
      const s = get()
      set({ transactions: [] })
      get()._persist()
      if (s.authUser) supabase.from('transactions').delete().eq('user_id', s.authUser.uid).then(() => {})
    },
    clearAllTargets:      () => { set({ targets: [] }); get()._persist() },
    clearAllRecurring:    () => { set({ recurring: [] }); get()._persist() },
    clearAllData: () => {
      set({ transactions: [], targets: [], recurring: [], nextId: 1, aiChats: [{ role: 'ai', text: 'Data direset! Siap bantu dari awal 💚' }] })
      get()._persist()
    },
    deleteLastTransaction: () => {
      const s = get()
      const last = s.transactions[0]
      set(ss => ({ transactions: ss.transactions.slice(1) }))
      get()._persist()
      if (s.authUser && last && typeof last.id === 'string' && !last.id.startsWith('tmp_')) {
        supabase.from('transactions').delete().eq('id', last.id).then(() => {})
      }
    },
    deleteTransactionsByCategory: (cat) => {
      const s = get()
      const toDelete = s.transactions.filter(t => t.category === cat).map(t => t.id)
      set(ss => ({ transactions: ss.transactions.filter(t => t.category !== cat) }))
      get()._persist()
      if (s.authUser && toDelete.length) {
        supabase.from('transactions').delete().in('id', toDelete.filter(id => typeof id === 'string' && !id.startsWith('tmp_'))).then(() => {})
      }
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
// Ganti password via Supabase Auth
export async function changePassword(email, oldPw, newPw) {
  // verifikasi password lama dengan re-login
  const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password: oldPw })
  if (loginErr) return 'Password lama salah!'
  const { error } = await supabase.auth.updateUser({ password: newPw })
  if (error) return error.message
  return null // null = success
}
