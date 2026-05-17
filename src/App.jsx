import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/appStore'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import TopBar from './components/layout/TopBar'
import Toast from './components/ui/Toast'
import TxnModal from './components/ui/TxnModal'
import Onboarding from './components/ui/Onboarding'
import Beranda from './pages/Beranda'
import Laporan from './pages/Laporan'
import Target from './pages/Target'
import AIAdvisor from './pages/AIAdvisor'
import Profil from './pages/Profil'
import Tutorial from './pages/Tutorial'
import Auth from './pages/Auth'

function Layout() {
  const [modal, setModal]         = useState(null)
  const [showOnboard, setOnboard] = useState(false)
  const authUser = useStore(s => s.authUser)

  useEffect(() => {
    if (!authUser) return
    const key = `tabungdulu_onboarded_${authUser.uid}`
    if (!localStorage.getItem(key)) {
      // Small delay so DOM elements render first
      setTimeout(() => setOnboard(true), 600)
    }
  }, [authUser?.uid])

  const doneOnboard = () => {
    if (authUser) localStorage.setItem(`tabungdulu_onboarded_${authUser.uid}`, '1')
    setOnboard(false)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-[272px] min-h-screen overflow-x-hidden">
        <TopBar onIncome={() => setModal('income')} onExpense={() => setModal('expense')} />
        <main className="flex-1 p-6 lg:p-8 pb-24 lg:pb-10">
          <Routes>
            <Route path="/"         element={<Beranda onIncome={() => setModal('income')} onExpense={() => setModal('expense')} />} />
            <Route path="/laporan"  element={<Laporan />} />
            <Route path="/target"   element={<Target />} />
            <Route path="/ai"       element={<AIAdvisor />} />
            <Route path="/profil"   element={<Profil />} />
            <Route path="/tutorial" element={<Tutorial />} />
            <Route path="*"         element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
      <BottomNav onAdd={() => setModal('income')} />
      <TxnModal open={!!modal} onClose={() => setModal(null)} defaultType={modal || 'income'} />
      <Toast />
      {showOnboard && <Onboarding onDone={doneOnboard} />}
    </div>
  )
}

export default function App() {
  const authUser = useStore(s => s.authUser)
  return (
    <BrowserRouter>
      {authUser ? <Layout /> : <Auth />}
    </BrowserRouter>
  )
}
