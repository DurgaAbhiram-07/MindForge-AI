import { useState } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react'

type NavItem = {
  label: string
  icon: typeof LayoutDashboard
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Study materials', icon: BookOpen },
  { label: 'Quizzes', icon: BrainCircuit },
  { label: 'Study planner', icon: CalendarDays },
  { label: 'Progress', icon: Trophy },
]

const activity = [
  { subject: 'Biology', title: 'Cellular respiration quiz', detail: '18 questions · 92% score', color: 'violet' },
  { subject: 'Mathematics', title: 'Quadratic equations notes', detail: '12 min read · 3 highlights', color: 'cyan' },
  { subject: 'History', title: 'World War II flashcards', detail: '24 cards reviewed', color: 'amber' },
]

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [goalComplete, setGoalComplete] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-label="Primary navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><Sparkles size={18} /></div>
          <div>
            <p className="brand-name">MindForge</p>
            <p className="brand-subtitle">AI learning studio</p>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <div className="avatar avatar-purple">DA</div>
          <div className="workspace-copy"><span>Durga's workspace</span><small>Personal learning</small></div>
          <ChevronRight size={16} className="muted-icon" />
        </div>

        <nav className="nav-list">
          <p className="nav-label">Workspace</p>
          {navItems.map(({ label, icon: Icon }) => (
            <button
              className={`nav-item ${activePage === label ? 'nav-item-active' : ''}`}
              key={label}
              onClick={() => { setActivePage(label); setSidebarOpen(false) }}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === 'Quizzes' && <span className="nav-badge">2</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Sparkles size={16} /></div>
            <p>Unlock your full potential</p>
            <span>Get deeper insights with MindForge Pro.</span>
            <button className="upgrade-button">Explore Pro <ArrowUpRight size={14} /></button>
          </div>
          <button className="profile-row">
            <div className="avatar avatar-cyan">DA</div>
            <span className="profile-name">Durga Abhiram</span>
            <MoreHorizontal size={18} className="muted-icon" />
          </button>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={15} /><strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <button className="search-button" aria-label="Search"><Search size={17} /><span>Search anything</span><kbd>⌘ K</kbd></button>
            <div className="topbar-avatar avatar avatar-cyan">DA</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">Friday, October 16, 2026 <span className="eyebrow-dot" /> 08:42 AM</p>
              <h1>Good morning, Durga<span className="heading-spark">✦</span></h1>
              <p className="heading-copy">Keep the momentum going. You’re building something remarkable.</p>
            </div>
            <button className="primary-button"><Plus size={17} /> New study session</button>
          </section>

          <section className="stats-grid" aria-label="Learning statistics">
            <StatCard icon={<Target size={18} />} label="Weekly focus" value="8.4" unit="hrs" trend="+18.2%" helper="vs. last week" tone="violet" />
            <StatCard icon={<Check size={18} />} label="Study goals" value={goalComplete ? '4' : '3'} unit="/ 5" trend="60%" helper="completed this week" tone="cyan" />
            <StatCard icon={<Flame size={18} />} label="Current streak" value="12" unit="days" trend="Personal best" helper="Keep it alive today" tone="amber" />
            <StatCard icon={<Trophy size={18} />} label="Knowledge score" value="78" unit="/ 100" trend="+6 pts" helper="this month" tone="pink" />
          </section>

          <div className="dashboard-grid">
            <section className="panel focus-panel">
              <div className="panel-heading"><div><p className="section-kicker">Today’s focus</p><h2>Make progress, one session at a time.</h2></div><button className="icon-button"><MoreHorizontal size={19} /></button></div>
              <div className="focus-progress-row"><div><span className="focus-number">68</span><span className="focus-unit">%</span><p>of your daily goal complete</p></div><div className="progress-ring" aria-label="68 percent of daily goal complete"><span>68%</span></div></div>
              <div className="goal-bar"><span style={{ width: goalComplete ? '100%' : '68%' }} /></div>
              <div className="focus-footer"><span><span className="status-dot" /> 42 min remaining</span><button className="text-button" onClick={() => setGoalComplete(!goalComplete)}>{goalComplete ? 'Reset goal' : 'Mark session complete'} <ArrowUpRight size={14} /></button></div>
            </section>

            <section className="panel insight-panel">
              <div className="insight-orb"><Sparkles size={21} /></div>
              <p className="section-kicker">MindForge insight</p>
              <h2>Your recall is strongest in the morning.</h2>
              <p className="insight-copy">You score 14% higher before noon. Consider moving your toughest topics to your first session.</p>
              <button className="text-button">View learning patterns <ArrowUpRight size={14} /></button>
            </section>
          </div>

          <section className="panel activity-panel">
            <div className="panel-heading"><div><p className="section-kicker">Recent activity</p><h2>Pick up where you left off.</h2></div><button className="text-button">View all <ArrowUpRight size={14} /></button></div>
            <div className="activity-list">{activity.map((item) => <ActivityRow key={item.title} {...item} />)}</div>
          </section>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, unit, trend, helper, tone }: { icon: React.ReactNode; label: string; value: string; unit: string; trend: string; helper: string; tone: string }) {
  return <article className="stat-card"><div className={`stat-icon stat-icon-${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}<span>{unit}</span></div><div className="stat-meta"><b className={`trend-${tone}`}>{trend}</b><span>{helper}</span></div></article>
}

function ActivityRow({ subject, title, detail, color }: { subject: string; title: string; detail: string; color: string }) {
  return <div className="activity-row"><div className={`activity-icon activity-${color}`}><BookOpen size={17} /></div><div className="activity-copy"><p>{subject}</p><h3>{title}</h3><span>{detail}</span></div><button className="activity-action" aria-label={`Open ${title}`}><ChevronRight size={17} /></button></div>
}

export default App
