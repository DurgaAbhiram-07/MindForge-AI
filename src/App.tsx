import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  Flame,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react'
import { useDashboardStore, type DashboardActivity, type DashboardTask } from './store/dashboardStore'
import StudyMaterialsPage from './StudyMaterials'
import QuizzesPage from './Quizzes'
import WeakTopicsPage from './WeakTopics'
import StudyPlannerPage from './StudyPlanner'
import AnalyticsPage from './Analytics'
import AchievementsPage from './Achievements'
import { usePlannerStore } from './store/plannerStore'
import { useQuizStore } from './store/quizStore'
import { useNotesStore } from './store/notesStore'
import { calculateLevel, useGamificationStore } from './store/gamificationStore'
import { calculateStreak, toLocalDateKey } from './store/streakCalculations'

type NavItem = {
  label: string
  icon: typeof LayoutDashboard
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Study materials', icon: BookOpen },
  { label: 'Quizzes', icon: BrainCircuit },
  { label: 'Study planner', icon: CalendarDays },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Achievements', icon: Award },
  { label: 'Progress', icon: Trophy },
]

function App() {
  const activePage = useDashboardStore((state) => state.activePage)
  const tasks = useDashboardStore((state) => state.tasks)
  const activity = useDashboardStore((state) => state.activity)
  const studyMinutes = useDashboardStore((state) => state.studyMinutes)
  const plannerTasks = usePlannerStore((state) => state.tasks)
  const dailyGoalMinutes = useDashboardStore((state) => state.dailyGoalMinutes)
  const isDemoData = useDashboardStore((state) => state.isDemoData)
  const setActivePage = useDashboardStore((state) => state.setActivePage)
  const toggleTask = useDashboardStore((state) => state.toggleTask)
  const clearActivity = useDashboardStore((state) => state.clearActivity)
  const restoreDemoActivity = useDashboardStore((state) => state.restoreDemoActivity)

  const quizzes = useQuizStore((state) => state.quizzes)
  const attempts = useQuizStore((state) => state.attempts)
  const notes = useNotesStore((state) => state.notes)
  const transactions = useGamificationStore((state) => state.transactions)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [proModalOpen, setProModalOpen] = useState(false)

  const completedTasks = tasks.filter((task) => task.completed).length
  const completedMinutes = tasks.filter((task) => task.completed).reduce((total, task) => total + task.durationMinutes, 0)
  const dailyProgress = Math.min(100, Math.round((completedMinutes / dailyGoalMinutes) * 100))
  const plannerCompletedMinutes = plannerTasks.filter((task) => task.completed).reduce((total, task) => total + task.durationMinutes, 0)
  const studyHours = ((studyMinutes + plannerCompletedMinutes) / 60).toFixed(1)

  // Real Streak calculation
  const allActiveDates = useMemo(() => {
    return [
      ...attempts.map((a) => toLocalDateKey(a.completedAt)),
      ...plannerTasks.filter((t) => t.completed).map((t) => t.date),
      ...notes.filter((n) => !n.isDemoData).map((n) => toLocalDateKey(n.createdAt)),
    ]
  }, [attempts, plannerTasks, notes])

  const streakInfo = useMemo(() => calculateStreak(allActiveDates), [allActiveDates])
  const currentStreak = allActiveDates.length > 0 ? streakInfo.currentStreak : useDashboardStore.getState().currentStreak

  // Real Quiz Accuracy calculation
  const realAccuracy = useMemo(() => {
    if (attempts.length === 0) return null
    const sum = attempts.reduce((acc, a) => acc + a.score, 0)
    return Math.round(sum / attempts.length)
  }, [attempts])

  const displayedAccuracy = realAccuracy !== null ? realAccuracy : useDashboardStore.getState().quizAccuracy

  // Real XP and Level calculation
  const totalXp = useMemo(() => transactions.reduce((acc, t) => acc + t.xp, 0), [transactions])
  const levelInfo = useMemo(() => calculateLevel(totalXp), [totalXp])

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K and ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setSearchOpen(false)
        setProfileOpen(false)
        setProModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleExportData = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      user: { name: 'Durga Abhiram', workspace: "Durga's workspace" },
      stats: { totalXp, level: levelInfo.level, streak: currentStreak, accuracy: displayedAccuracy, studyHours },
      dashboard: useDashboardStore.getState(),
      notes: useNotesStore.getState().notes,
      quizzes: useQuizStore.getState().quizzes,
      attempts: useQuizStore.getState().attempts,
      plannerTasks: usePlannerStore.getState().tasks,
      transactions: useGamificationStore.getState().transactions,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mindforge-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setFeedback('Workspace backup exported successfully.')
  }

  const handleTaskToggle = (task: DashboardTask) => {
    toggleTask(task.id)
    const nextCompleted = !task.completed
    if (nextCompleted) {
      useGamificationStore.getState().awardXp({
        sourceId: `dash-task-${task.id}`,
        eventType: 'task-completion',
        xp: Math.max(20, Math.round(task.durationMinutes * 0.5)),
        description: `Completed task: ${task.title}`,
      })
      useGamificationStore.getState().evaluateAndUnlock({
        quizzes,
        attempts,
        plannerTasks,
        notes,
        dailyGoalMinutes,
        currentStreak,
        longestStreak: streakInfo.longestStreak,
      })
    }
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

        <button
          className="workspace-switcher"
          onClick={() => setProfileOpen(true)}
          style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
          aria-label="Manage Durga's workspace"
        >
          <div className="avatar avatar-purple">DA</div>
          <div className="workspace-copy"><span>Durga's workspace</span><small>Personal learning</small></div>
          <ChevronRight size={16} className="muted-icon" />
        </button>

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
            <button className="upgrade-button" onClick={() => setProModalOpen(true)}>
              Explore Pro <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="profile-row" onClick={() => setProfileOpen(true)} aria-label="Open Durga's profile">
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
            <button className="search-button" onClick={() => setSearchOpen(true)} aria-label="Search"><Search size={17} /><span>Search anything</span><kbd>⌘ K</kbd></button>
            <button className="topbar-avatar avatar avatar-cyan" onClick={() => setProfileOpen(true)} aria-label="Open Durga's profile">DA</button>
          </div>
        </header>

        <div className="page-content">
          {activePage === 'Study materials' ? (
            <StudyMaterialsPage onFeedback={setFeedback} onNavigate={setActivePage} />
          ) : activePage === 'Quizzes' ? (
            <QuizzesPage onFeedback={setFeedback} />
          ) : activePage === 'Study planner' ? (
            <StudyPlannerPage onFeedback={setFeedback} onOpenResource={(type) => { setActivePage(type === 'note' ? 'Study materials' : 'Quizzes'); setFeedback(`Opened linked ${type}.`) }} />
          ) : activePage === 'Analytics' ? (
            <AnalyticsPage onNavigate={setActivePage} />
          ) : activePage === 'Achievements' ? (
            <AchievementsPage onNavigate={setActivePage} />
          ) : activePage === 'Progress' ? (
            <WeakTopicsPage onNavigate={setActivePage} />
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">Friday, October 16, 2026 <span className="eyebrow-dot" /> 08:42 AM</p>
                  <h1>Good morning, Durga<span className="heading-spark">✦</span></h1>
                  <p className="heading-copy">Keep the momentum going. You’re building something remarkable.</p>
                </div>
                <button className="primary-button" onClick={() => setActivePage('Study planner')}><Plus size={17} /> New study session</button>
              </section>

              {isDemoData && allActiveDates.length === 0 && (
                <div className="demo-notice" role="note"><Sparkles size={14} /> Demo data — your progress is saved locally on this device.</div>
              )}
              {feedback && <div className="feedback-banner" role="status"><Check size={15} /> {feedback}</div>}

              <section className="stats-grid" aria-label="Learning statistics">
                <StatCard icon={<Target size={18} />} label="Daily goals" value={`${completedTasks}`} unit={`/ ${tasks.length}`} trend={`${dailyProgress}%`} helper="completed today" tone="violet" />
                <StatCard icon={<Check size={18} />} label="Study time" value={studyHours} unit="hrs" trend="+18.2%" helper="vs. last week" tone="cyan" />
                <StatCard icon={<Flame size={18} />} label="Learning streak" value={`${currentStreak}`} unit="days" trend={streakInfo.activeToday ? 'Active today' : 'Personal best'} helper="Keep it alive today" tone="amber" />
                <StatCard icon={<BrainCircuit size={18} />} label="Quiz accuracy" value={`${displayedAccuracy}`} unit="%" trend={realAccuracy !== null ? 'Verified' : '+6 pts'} helper={realAccuracy !== null ? 'from quiz attempts' : 'this month'} tone="pink" />
                <StatCard icon={<Trophy size={18} />} label="Knowledge score" value={`Lvl ${levelInfo.level}`} unit={`· ${totalXp} XP`} trend={levelInfo.title} helper="Verified rank" tone="violet" />
              </section>

              <div className="dashboard-grid">
                <section className="panel focus-panel">
                  <div className="panel-heading"><div><p className="section-kicker">Today’s focus</p><h2>Make progress, one session at a time.</h2></div><button className="icon-button"><MoreHorizontal size={19} /></button></div>
                  <div className="focus-progress-row">
                    <div>
                      <span className="focus-number">{dailyProgress}</span>
                      <span className="focus-unit">%</span>
                      <p>of your daily goal complete</p>
                    </div>
                    <div
                      className={`progress-ring ${dailyProgress === 100 ? 'progress-ring-complete' : ''}`}
                      aria-label={`${dailyProgress} percent of daily goal complete`}
                    >
                      <div className="water-container">
                        <div
                          className={`water-fill ${dailyProgress === 0 ? 'water-fill-empty' : ''}`}
                          style={{ height: `${dailyProgress}%` }}
                        >
                          <div className="water-wave wave-back" />
                          <div className="water-wave wave-front" />
                          {dailyProgress > 0 && (
                            <>
                              <div className="water-bubble b1" />
                              <div className="water-bubble b2" />
                              <div className="water-bubble b3" />
                            </>
                          )}
                        </div>
                      </div>
                      <svg className="progress-ring-svg" viewBox="0 0 100 100" aria-hidden="true">
                        <defs>
                          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fedab8" />
                            <stop offset="50%" stopColor="#fca86c" />
                            <stop offset="100%" stopColor="#203c3d" />
                          </linearGradient>
                        </defs>
                        <circle className="progress-ring-track" cx="50" cy="50" r="44" />
                        <circle
                          className="progress-ring-fill"
                          cx="50"
                          cy="50"
                          r="44"
                          style={{
                            strokeDasharray: 276.46,
                            strokeDashoffset: 276.46 - (276.46 * Math.min(100, Math.max(0, dailyProgress))) / 100,
                          }}
                        />
                      </svg>
                      <span className="progress-ring-text">{dailyProgress}%</span>
                    </div>
                  </div>
                  <div className="goal-bar"><span style={{ width: `${dailyProgress}%` }} /></div>
                  <div className="focus-footer"><span><span className="status-dot" /> {Math.max(0, dailyGoalMinutes - completedMinutes)} min remaining</span><span className="focus-count">{completedTasks}/{tasks.length} tasks</span></div>
                  <div className="task-list" aria-label="Today's study tasks">{tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => handleTaskToggle(task)} />)}</div>
                </section>

                <section className="panel insight-panel">
                  <div className="insight-orb"><Sparkles size={21} /></div>
                  <p className="section-kicker">MindForge insight</p>
                  <h2>Your recall is strongest in the morning.</h2>
                  <p className="insight-copy">You score 14% higher before noon. Consider moving your toughest topics to your first session.</p>
                  <button className="text-button" onClick={() => setActivePage('Analytics')}>View learning patterns <ArrowUpRight size={14} /></button>
                </section>
              </div>

              <section className="panel activity-panel">
                <div className="panel-heading"><div><p className="section-kicker">Recent activity</p><h2>Pick up where you left off.</h2></div>{activity.length > 0 && <button className="text-button" onClick={() => { clearActivity(); setFeedback('Recent activity cleared from this device.') }}>Clear activity <X size={14} /></button>}</div>
                {activity.length > 0 ? <div className="activity-list">{activity.map((item) => <ActivityRow key={item.id} {...item} onOpen={() => handleActivityOpen(item)} />)}</div> : <div className="empty-state"><div className="empty-state-icon"><BookOpen size={18} /></div><h3>No recent activity yet</h3><p>Complete a study task and your learning trail will appear here.</p><button className="text-button" onClick={() => { restoreDemoActivity(); setFeedback('Demo activity restored.') }}>Restore demo activity <ArrowUpRight size={14} /></button></div>}
              </section>
            </>
          )}
        </div>
      </main>

      {/* Profile Modal */}
      {profileOpen && (
        <div className="modal-backdrop" onClick={() => setProfileOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Student Profile and Preferences">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">User Profile &amp; Settings</p>
                <h2>Durga Abhiram</h2>
              </div>
              <button className="icon-button" onClick={() => setProfileOpen(false)} aria-label="Close profile">
                <X size={18} />
              </button>
            </div>

            <div className="profile-user-hero">
              <div className="profile-user-avatar">DA</div>
              <div className="profile-user-info">
                <h3>Durga Abhiram</h3>
                <p>Personal Workspace &bull; <span style={{ color: '#34d399', fontWeight: 600 }}>100% Offline-First</span></p>
              </div>
            </div>

            <div className="profile-level-card">
              <div className="profile-level-header">
                <h4>Level {levelInfo.level} &mdash; {levelInfo.title}</h4>
                <span>{totalXp} Total XP</span>
              </div>
              <div className="level-bar" style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ display: 'block', height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #fedab8, #fca86c)', width: `${levelInfo.levelProgressPercent}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                <span>Next Rank: Level {Math.min(10, levelInfo.level + 1)}</span>
                <span>{levelInfo.levelProgressPercent}% to Level Up</span>
              </div>
            </div>

            <div className="profile-stats-grid">
              <div className="profile-stat-box">
                <span>Active Streak</span>
                <strong>{currentStreak} Days 🔥</strong>
              </div>
              <div className="profile-stat-box">
                <span>Quiz Accuracy</span>
                <strong>{displayedAccuracy}%</strong>
              </div>
              <div className="profile-stat-box">
                <span>Study Time</span>
                <strong>{studyHours} hrs</strong>
              </div>
              <div className="profile-stat-box">
                <span>Saved Notes</span>
                <strong>{notes.length}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 14, margin: '20px 0', borderTop: '1px solid rgba(148,163,207,0.12)', paddingTop: 18 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                Daily Study Goal (Minutes)
                <div style={{ display: 'flex', gap: 8 }}>
                  {[30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      className={`date-filter-button ${dailyGoalMinutes === mins ? 'active' : ''}`}
                      onClick={() => {
                        useDashboardStore.setState({ dailyGoalMinutes: mins })
                        setFeedback(`Daily goal updated to ${mins} minutes.`)
                      }}
                      style={{ flex: 1, padding: '7px 0', fontSize: 12 }}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '18px 0', borderTop: '1px solid rgba(148,163,207,0.12)', paddingTop: 18 }}>
              <button
                className="secondary-button"
                onClick={handleExportData}
                style={{ flex: 1, minWidth: 160 }}
              >
                <Download size={14} /> Export Backup (JSON)
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  restoreDemoActivity()
                  setFeedback('Demo activity restored.')
                }}
                style={{ flex: 1, minWidth: 160 }}
              >
                <Sparkles size={14} /> Restore Demo Data
              </button>
            </div>

            <div className="modal-actions" style={{ marginTop: 24 }}>
              <button
                className="secondary-button"
                onClick={() => {
                  setActivePage('Analytics')
                  setProfileOpen(false)
                }}
              >
                <BarChart3 size={14} /> Analytics
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setActivePage('Achievements')
                  setProfileOpen(false)
                }}
              >
                <Award size={14} /> Badges
              </button>
              <button
                className="primary-button"
                onClick={() => setProfileOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette / Search Modal */}
      {searchOpen && (
        <div className="modal-backdrop" onClick={() => setSearchOpen(false)}>
          <div className="command-palette-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command search palette">
            <div className="command-search-header">
              <Search size={18} style={{ color: '#818cf8', flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                placeholder="Search workspaces, notes, quizzes, or tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                <X size={16} />
              </button>
            </div>

            <div className="command-search-results">
              <div className="command-group-title">Workspaces</div>
              {navItems
                .filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => (
                  <button
                    key={item.label}
                    className="command-item"
                    onClick={() => {
                      setActivePage(item.label)
                      setSearchOpen(false)
                    }}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                    <kbd>Go &rarr;</kbd>
                  </button>
                ))}

              {notes.length > 0 && (
                <>
                  <div className="command-group-title">Study Notes</div>
                  {notes
                    .filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.subject.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 4)
                    .map((n) => (
                      <button
                        key={n.id}
                        className="command-item"
                        onClick={() => {
                          setActivePage('Study materials')
                          setSearchOpen(false)
                        }}
                      >
                        <BookOpen size={16} />
                        <span>{n.title} <small style={{ color: '#64748b' }}>({n.subject})</small></span>
                      </button>
                    ))}
                </>
              )}

              {quizzes.length > 0 && (
                <>
                  <div className="command-group-title">Quizzes</div>
                  {quizzes
                    .filter((q) => q.title.toLowerCase().includes(searchQuery.toLowerCase()) || q.topic.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 4)
                    .map((q) => (
                      <button
                        key={q.id}
                        className="command-item"
                        onClick={() => {
                          setActivePage('Quizzes')
                          setSearchOpen(false)
                        }}
                      >
                        <BrainCircuit size={16} />
                        <span>{q.title} <small style={{ color: '#64748b' }}>({q.topic})</small></span>
                      </button>
                    ))}
                </>
              )}
            </div>

            <div className="command-footer">
              <span>Navigate with mouse or Tab</span>
              <span>ESC to dismiss</span>
            </div>
          </div>
        </div>
      )}

      {/* MindForge Pro Modal */}
      {proModalOpen && (
        <div className="modal-backdrop" onClick={() => setProModalOpen(false)}>
          <div className="pro-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="MindForge Pro Features">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Enterprise &amp; Deep Learning</p>
                <h2>MindForge Pro</h2>
              </div>
              <button className="icon-button" onClick={() => setProModalOpen(false)} aria-label="Close pro dialog">
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 18, borderRadius: 12, background: 'linear-gradient(145deg, rgba(254, 218, 184, 0.15), rgba(32, 60, 61, 0.4))', border: '1px solid rgba(254, 218, 184, 0.3)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fedab8', fontWeight: 700, fontSize: 14 }}>
                <Sparkles size={18} /> Everything You Need for True Cognitive Mastery
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                MindForge Pro remains 100% privacy-first. When you bring your own API key or run local models, features unlock without sending personal notes to remote cloud trackers.
              </p>
            </div>

            <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
              {[
                { title: 'Local AI Provider Bridge', desc: 'Plug into Ollama, LM Studio, or private OpenAI-compatible endpoints with custom system prompts.' },
                { title: 'Spaced Repetition Algorithm', desc: 'Deterministic SM-2 interval scheduling tailored to your weak topic accuracy ratings.' },
                { title: 'Unlimited PDF & Markdown Export', desc: 'Compile complete study guides and diagnostic mastery audit reports in one click.' },
                { title: 'Multi-device Encrypted Sync', desc: 'End-to-end encrypted backup sync across desktop and mobile devices.' },
              ].map((perk, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(148,163,207,0.1)' }}>
                  <ShieldCheck size={18} style={{ color: '#34d399', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: 13, color: '#f8fafc' }}>{perk.title}</strong>
                    <span style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{perk.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setProModalOpen(false)}>
                Maybe Later
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  setProModalOpen(false)
                  setFeedback('Pro waitlist confirmed. Thank you!')
                }}
              >
                Join Pro Early Access
              </button>
            </div>
          </div>
        </div>
      )}
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
