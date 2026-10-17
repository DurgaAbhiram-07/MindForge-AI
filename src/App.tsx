import { useEffect, useState, type ReactNode } from 'react'
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
import { useDashboardStore, type DashboardActivity, type DashboardTask } from './store/dashboardStore'
import StudyMaterialsPage from './StudyMaterials'
import QuizzesPage from './Quizzes'
import WeakTopicsPage from './WeakTopics'

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

function App() {
  const activePage = useDashboardStore((state) => state.activePage)
  const tasks = useDashboardStore((state) => state.tasks)
  const activity = useDashboardStore((state) => state.activity)
  const studyMinutes = useDashboardStore((state) => state.studyMinutes)
  const currentStreak = useDashboardStore((state) => state.currentStreak)
  const quizAccuracy = useDashboardStore((state) => state.quizAccuracy)
  const dailyGoalMinutes = useDashboardStore((state) => state.dailyGoalMinutes)
  const isDemoData = useDashboardStore((state) => state.isDemoData)
  const setActivePage = useDashboardStore((state) => state.setActivePage)
  const toggleTask = useDashboardStore((state) => state.toggleTask)
  const clearActivity = useDashboardStore((state) => state.clearActivity)
  const restoreDemoActivity = useDashboardStore((state) => state.restoreDemoActivity)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const completedTasks = tasks.filter((task) => task.completed).length
  const completedMinutes = tasks.filter((task) => task.completed).reduce((total, task) => total + task.durationMinutes, 0)
  const dailyProgress = Math.min(100, Math.round((completedMinutes / dailyGoalMinutes) * 100))
  const studyHours = (studyMinutes / 60).toFixed(1)

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  const handleTaskToggle = (task: DashboardTask) => {
    toggleTask(task.id)
    setFeedback(task.completed ? `${task.title} reopened.` : `${task.title} marked complete.`)
  }

  const handleActivityOpen = (item: DashboardActivity) => setFeedback(`${item.title} is available in the upcoming study flow.`)

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
          {activePage === 'Study materials' ? <StudyMaterialsPage onFeedback={setFeedback} /> : activePage === 'Quizzes' ? <QuizzesPage onFeedback={setFeedback} /> : activePage === 'Progress' ? <WeakTopicsPage onNavigate={setActivePage} /> : <>
          <section className="page-heading">
            <div>
              <p className="eyebrow">Friday, October 16, 2026 <span className="eyebrow-dot" /> 08:42 AM</p>
              <h1>Good morning, Durga<span className="heading-spark">✦</span></h1>
              <p className="heading-copy">Keep the momentum going. You’re building something remarkable.</p>
            </div>
            <button className="primary-button" onClick={() => setFeedback('New study sessions will be available in the planner phase.')}><Plus size={17} /> New study session</button>
          </section>

          {isDemoData && <div className="demo-notice" role="note"><Sparkles size={14} /> Demo data — your progress is saved locally on this device.</div>}
          {feedback && <div className="feedback-banner" role="status"><Check size={15} /> {feedback}</div>}

          <section className="stats-grid" aria-label="Learning statistics">
            <StatCard icon={<Target size={18} />} label="Daily goals" value={`${completedTasks}`} unit={`/ ${tasks.length}`} trend={`${dailyProgress}%`} helper="completed today" tone="violet" />
            <StatCard icon={<Check size={18} />} label="Study time" value={studyHours} unit="hrs" trend="+18.2%" helper="vs. last week" tone="cyan" />
            <StatCard icon={<Flame size={18} />} label="Learning streak" value={`${currentStreak}`} unit="days" trend="Personal best" helper="Keep it alive today" tone="amber" />
            <StatCard icon={<BrainCircuit size={18} />} label="Quiz accuracy" value={`${quizAccuracy}`} unit="%" trend="+6 pts" helper="this month" tone="pink" />
            <StatCard icon={<Trophy size={18} />} label="Knowledge score" value="78" unit="/ 100" trend="Demo" helper="sample baseline" tone="violet" />
          </section>

          <div className="dashboard-grid">
            <section className="panel focus-panel">
              <div className="panel-heading"><div><p className="section-kicker">Today’s focus</p><h2>Make progress, one session at a time.</h2></div><button className="icon-button"><MoreHorizontal size={19} /></button></div>
              <div className="focus-progress-row"><div><span className="focus-number">{dailyProgress}</span><span className="focus-unit">%</span><p>of your daily goal complete</p></div><div className="progress-ring" aria-label={`${dailyProgress} percent of daily goal complete`}><span>{dailyProgress}%</span></div></div>
              <div className="goal-bar"><span style={{ width: `${dailyProgress}%` }} /></div>
              <div className="focus-footer"><span><span className="status-dot" /> {Math.max(0, dailyGoalMinutes - completedMinutes)} min remaining</span><span className="focus-count">{completedTasks}/{tasks.length} tasks</span></div>
              <div className="task-list" aria-label="Today's study tasks">{tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => handleTaskToggle(task)} />)}</div>
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
            <div className="panel-heading"><div><p className="section-kicker">Recent activity</p><h2>Pick up where you left off.</h2></div>{activity.length > 0 && <button className="text-button" onClick={() => { clearActivity(); setFeedback('Recent activity cleared from this device.') }}>Clear activity <X size={14} /></button>}</div>
            {activity.length > 0 ? <div className="activity-list">{activity.map((item) => <ActivityRow key={item.id} {...item} onOpen={() => handleActivityOpen(item)} />)}</div> : <div className="empty-state"><div className="empty-state-icon"><BookOpen size={18} /></div><h3>No recent activity yet</h3><p>Complete a study task and your learning trail will appear here.</p><button className="text-button" onClick={() => { restoreDemoActivity(); setFeedback('Demo activity restored.') }}>Restore demo activity <ArrowUpRight size={14} /></button></div>}
          </section>
          </>}
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, unit, trend, helper, tone }: { icon: ReactNode; label: string; value: string; unit: string; trend: string; helper: string; tone: string }) {
  return <article className="stat-card"><div className={`stat-icon stat-icon-${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}<span>{unit}</span></div><div className="stat-meta"><b className={`trend-${tone}`}>{trend}</b><span>{helper}</span></div></article>
}

function TaskRow({ task, onToggle }: { task: DashboardTask; onToggle: () => void }) {
  return <div className={`task-row ${task.completed ? 'task-row-complete' : ''}`}><button className="task-check" onClick={onToggle} aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`} aria-pressed={task.completed}>{task.completed && <Check size={13} />}</button><div className="task-copy"><strong>{task.title}</strong><span>{task.category} · {task.durationMinutes} min</span></div><button className="task-action" onClick={onToggle} aria-label={`${task.completed ? 'Completed' : 'Complete'} ${task.title}`}>{task.completed ? 'Completed' : 'Complete'}</button></div>
}

function ActivityRow({ subject, title, detail, color, onOpen }: DashboardActivity & { onOpen: () => void }) {
  return <div className="activity-row"><div className={`activity-icon activity-${color}`}><BookOpen size={17} /></div><div className="activity-copy"><p>{subject}</p><h3>{title}</h3><span>{detail}</span></div><button className="activity-action" onClick={onOpen} aria-label={`Open ${title}`}><ChevronRight size={17} /></button></div>
}

export default App
