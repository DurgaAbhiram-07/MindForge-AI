import { useMemo, useState } from 'react'
import {
  Award,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Info,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import {
  deriveLearningAnalytics,
  type DateFilterRange,
  type QuizAccuracyPoint,
  type DailyStudyPoint,
} from './store/analyticsCalculations'
import { useGamificationStore, calculateLevel } from './store/gamificationStore'
import { useNotesStore } from './store/notesStore'
import { usePlannerStore } from './store/plannerStore'
import { useQuizStore } from './store/quizStore'
import './analytics.css'

type AnalyticsPageProps = {
  onNavigate: (page: string) => void
}

export default function AnalyticsPage({ onNavigate }: AnalyticsPageProps) {
  const [filter, setFilter] = useState<DateFilterRange>('7d')
  const [activityFilter, setActivityFilter] = useState<'all' | 'quiz' | 'task' | 'note' | 'achievement'>('all')

  const quizzes = useQuizStore((state) => state.quizzes)
  const attempts = useQuizStore((state) => state.attempts)
  const plannerTasks = usePlannerStore((state) => state.tasks)
  const dailyGoalMinutes = usePlannerStore((state) => state.preferences.dailyGoalMinutes)
  const notes = useNotesStore((state) => state.notes)
  const transactions = useGamificationStore((state) => state.transactions)
  const unlockedAchievements = useGamificationStore((state) => state.unlockedAchievements)

  const analytics = useMemo(() => {
    return deriveLearningAnalytics({
      quizzes,
      attempts,
      plannerTasks,
      notes,
      transactions,
      unlockedAchievements,
      filter,
    })
  }, [quizzes, attempts, plannerTasks, notes, transactions, unlockedAchievements, filter])

  const totalXp = useMemo(
    () => transactions.reduce((acc, t) => acc + t.xp, 0),
    [transactions],
  )
  const levelInfo = useMemo(() => calculateLevel(totalXp), [totalXp])

  const filteredHistory = useMemo(() => {
    if (activityFilter === 'all') return analytics.activityHistory
    return analytics.activityHistory.filter((item) => item.type === activityFilter)
  }, [analytics.activityHistory, activityFilter])

  return (
    <section className="analytics-page">
      <section className="page-heading materials-heading">
        <div>
          <p className="eyebrow">
            Performance Intelligence <span className="eyebrow-dot" /> Verified App Records
          </p>
          <h1>Learning Analytics</h1>
          <p className="heading-copy">
            Descriptive metrics and historical progress derived strictly from your persisted quizzes, study planner
            tasks, and notes. No synthetic estimations or black-box predictions.
          </p>
        </div>
      </section>

      <div className="analytics-toolbar">
        <div className="date-filters" role="group" aria-label="Date range filters">
          <button
            className={`date-filter-button ${filter === '7d' ? 'active' : ''}`}
            onClick={() => setFilter('7d')}
            aria-pressed={filter === '7d'}
          >
            7 Days
          </button>
          <button
            className={`date-filter-button ${filter === '30d' ? 'active' : ''}`}
            onClick={() => setFilter('30d')}
            aria-pressed={filter === '30d'}
          >
            30 Days
          </button>
          <button
            className={`date-filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
          >
            All Time
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="analytics-status-badge">
            <Award size={13} /> Level {levelInfo.level} · {levelInfo.title}
          </span>
          {analytics.hasRealData ? (
            <span className="analytics-status-badge real-data">
              <CheckCircle2 size={13} /> Active records ({analytics.activityHistory.length} events logged)
            </span>
          ) : (
            <span className="analytics-status-badge">
              <Sparkles size={13} /> Initial state — complete a session to record personal history
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <section className="kpi-grid" aria-label="Key Performance Indicators">
        <article className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Quiz Accuracy</span>
            <div className="kpi-icon kpi-icon-violet"><BrainCircuit size={16} /></div>
          </div>
          <div className="kpi-value">
            {analytics.averageQuizAccuracy !== null ? `${analytics.averageQuizAccuracy}%` : '—'}
          </div>
          <div className="kpi-detail">
            {analytics.totalQuizzesCompleted > 0
              ? `${analytics.totalQuizzesCompleted} quizzes · high score ${analytics.highQuizScore}%`
              : 'No quizzes taken in this timeframe'}
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Study Time</span>
            <div className="kpi-icon kpi-icon-cyan"><Clock size={16} /></div>
          </div>
          <div className="kpi-value">
            {analytics.totalStudyHours}<span>hrs</span>
          </div>
          <div className="kpi-detail">
            {analytics.totalStudyMinutes > 0
              ? `${analytics.totalStudyMinutes} min total · ~${analytics.averageDailyMinutes}m daily avg`
              : '0 min recorded in this timeframe'}
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Task Completion</span>
            <div className="kpi-icon kpi-icon-amber"><Target size={16} /></div>
          </div>
          <div className="kpi-value">
            {analytics.taskCompletionRate !== null ? `${analytics.taskCompletionRate}%` : '—'}
          </div>
          <div className="kpi-detail">
            {analytics.totalPlannedTasks > 0
              ? `${analytics.completedTasksCount} of ${analytics.totalPlannedTasks} planned tasks finished`
              : 'No tasks scheduled in this window'}
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Current Streak</span>
            <div className="kpi-icon kpi-icon-pink"><Flame size={16} /></div>
          </div>
          <div className="kpi-value">
            {analytics.currentStreak}<span>days</span>
          </div>
          <div className="kpi-detail">
            {analytics.activeToday
              ? 'Active today · Best: ' + analytics.longestStreak + ' days'
              : 'Study today to keep your streak alive'}
          </div>
        </article>
      </section>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Quiz Accuracy Over Time Chart */}
        <section className="chart-panel" aria-label="Quiz accuracy chart">
          <div className="chart-header">
            <div>
              <p className="section-kicker">Practice Studio</p>
              <h2>Quiz Accuracy Over Time</h2>
            </div>
            {analytics.quizAccuracyOverTime.length > 0 && (
              <span className="status-badge status-excelling">
                {analytics.quizAccuracyOverTime.length} attempts
              </span>
            )}
          </div>

          <div className="chart-container">
            {analytics.quizAccuracyOverTime.length === 0 ? (
              <div className="chart-empty" role="status">
                <BrainCircuit size={28} />
                <h3>No quiz attempts in this window</h3>
                <p>Complete a quiz in the practice studio to start plotting your accuracy trend over time.</p>
                <button className="primary-button" onClick={() => onNavigate('Quizzes')}>
                  <BrainCircuit size={14} /> Open quizzes
                </button>
              </div>
            ) : (
              <AccuracyChart points={analytics.quizAccuracyOverTime} />
            )}
          </div>
        </section>

        {/* Study Time Activity by Day */}
        <section className="chart-panel" aria-label="Daily study time chart">
          <div className="chart-header">
            <div>
              <p className="section-kicker">Daily Rhythm</p>
              <h2>Study Time by Day</h2>
            </div>
            <span className="status-badge status-developing">
              Goal: {dailyGoalMinutes} min/day
            </span>
          </div>

          <div className="chart-container">
            {analytics.totalStudyMinutes === 0 && analytics.dailyStudyTime.every((d) => d.studyMinutes === 0) ? (
              <div className="chart-empty" role="status">
                <CalendarDays size={28} />
                <h3>No study time recorded</h3>
                <p>Complete scheduled sessions in the study planner to track your focused learning time.</p>
                <button className="primary-button" onClick={() => onNavigate('Study planner')}>
                  <CalendarDays size={14} /> Open planner
                </button>
              </div>
            ) : (
              <StudyTimeBarChart data={analytics.dailyStudyTime} goalMinutes={dailyGoalMinutes} />
            )}
          </div>
        </section>
      </div>

      {/* Subject-Wise Performance Breakdown */}
      <section className="panel" style={{ marginBottom: '22px' }}>
        <div className="panel-heading" style={{ marginBottom: '18px' }}>
          <div>
            <p className="section-kicker">Topic Mastery</p>
            <h2>Subject-Wise Performance</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate('Progress')}>
            View Weak Topics <TrendingUp size={14} />
          </button>
        </div>

        {analytics.subjectPerformance.length === 0 ? (
          <div className="chart-empty" role="status">
            <Compass size={28} />
            <h3>No subject data yet</h3>
            <p>Study notes, take quizzes, or plan tasks under different subjects to see detailed performance breakdowns.</p>
          </div>
        ) : (
          <div className="subject-grid">
            {analytics.subjectPerformance.map((subj) => (
              <article key={subj.subject} className="subject-card">
                <div className="subject-card-top">
                  <h3>{subj.subject}</h3>
                  <span
                    className={`status-badge ${
                      subj.status === 'Excelling'
                        ? 'status-excelling'
                        : subj.status === 'Developing'
                        ? 'status-developing'
                        : subj.status === 'Needs Review'
                        ? 'status-needs-review'
                        : 'status-no-quizzes'
                    }`}
                  >
                    {subj.status}
                  </span>
                </div>

                <div className="subject-metrics-row">
                  <div>
                    <span className="kpi-label">Average Accuracy</span>
                    <div className="subject-accuracy-num">
                      {subj.averageAccuracy !== null ? `${subj.averageAccuracy}%` : '—'}
                    </div>
                  </div>
                  <div className="subject-meta-counts">
                    <div>{subj.quizzesAttempted} quizzes</div>
                    <div>{subj.studyMinutes} min studied</div>
                    <div>{subj.notesCount} notes</div>
                  </div>
                </div>

                <div className="goal-bar" style={{ marginTop: '4px' }}>
                  <span style={{ width: `${subj.averageAccuracy ?? 0}%` }} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Learning Activity History Feed */}
      <section className="panel">
        <div className="panel-heading" style={{ marginBottom: '16px' }}>
          <div>
            <p className="section-kicker">Audit Trail</p>
            <h2>Learning Activity History</h2>
          </div>
          <span className="focus-count">{filteredHistory.length} events</span>
        </div>

        <div className="activity-filter-tabs" role="tablist" aria-label="Filter activity history">
          {(['all', 'quiz', 'task', 'note', 'achievement'] as const).map((tab) => (
            <button
              key={tab}
              className={`activity-filter-tab ${activityFilter === tab ? 'active' : ''}`}
              onClick={() => setActivityFilter(tab)}
              role="tab"
              aria-selected={activityFilter === tab}
            >
              {tab === 'all'
                ? 'All Events'
                : tab === 'quiz'
                ? 'Quizzes'
                : tab === 'task'
                ? 'Study Sessions'
                : tab === 'note'
                ? 'Notes'
                : 'Achievements'}
            </button>
          ))}
        </div>

        {filteredHistory.length === 0 ? (
          <div className="chart-empty" role="status">
            <BookOpen size={24} />
            <h3>No learning activity in this filter</h3>
            <p>Activities you complete will automatically appear here with exact timestamps and performance metrics.</p>
          </div>
        ) : (
          <div className="history-list" aria-label="Chronological learning history">
            {filteredHistory.map((item) => (
              <div key={item.id} className="history-item">
                <div
                  className={`history-icon ${
                    item.type === 'quiz'
                      ? 'kpi-icon-violet'
                      : item.type === 'task'
                      ? 'kpi-icon-cyan'
                      : item.type === 'achievement'
                      ? 'kpi-icon-amber'
                      : 'kpi-icon-pink'
                  }`}
                >
                  {item.type === 'quiz' ? (
                    <BrainCircuit size={16} />
                  ) : item.type === 'task' ? (
                    <CheckCircle2 size={16} />
                  ) : item.type === 'achievement' ? (
                    <Award size={16} />
                  ) : (
                    <BookOpen size={16} />
                  )}
                </div>

                <div className="history-copy">
                  <strong>{item.title}</strong>
                  <span>
                    {item.detail} · {formatTimestamp(item.timestamp)}
                  </span>
                </div>

                {item.badge && <span className="history-badge">{item.badge}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Transparent Disclaimer */}
      <p className="analytics-disclaimer" style={{ marginTop: '20px' }}>
        <Info size={14} /> Analytics are transparently derived from your local browser records. Quiz accuracy reflects
        real recorded attempts, and study time is summed from completed planner tasks.
      </p>
    </section>
  )
}

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d)
  } catch {
    return isoString
  }
}

// Accessible SVG-based Accuracy Line Chart
function AccuracyChart({ points }: { points: QuizAccuracyPoint[] }) {
  if (points.length === 0) return null

  const width = 500
  const height = 220
  const padding = { top: 20, right: 30, bottom: 35, left: 40 }

  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const getX = (idx: number) => {
    if (points.length === 1) return padding.left + chartW / 2
    return padding.left + (idx / (points.length - 1)) * chartW
  }

  const getY = (val: number) => {
    return padding.top + chartH - (Math.min(100, Math.max(0, val)) / 100) * chartH
  }

  const scorePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.score)}`)
    .join(' ')

  const avgPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.movingAverage)}`)
    .join(' ')

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <svg
        className="svg-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Quiz accuracy over time line chart"
      >
        <title>Quiz Accuracy Over Time</title>
        {/* Y Grid Lines */}
        {[0, 25, 50, 75, 100].map((val) => {
          const y = getY(val)
          return (
            <g key={val}>
              <line className="svg-grid-line" x1={padding.left} y1={y} x2={width - padding.right} y2={y} />
              <text className="svg-axis-text" x={padding.left - 8} y={y + 3} textAnchor="end">
                {val}%
              </text>
            </g>
          )
        })}

        {/* Moving Average Line (Cyan dashed) */}
        {points.length > 1 && <path d={avgPath} className="svg-line-avg" />}

        {/* Score Line (Violet solid) */}
        {points.length > 1 && <path d={scorePath} className="svg-line-main" />}

        {/* Score Dots */}
        {points.map((p, idx) => (
          <g key={p.id}>
            <circle cx={getX(idx)} cy={getY(p.score)} r={3.5} className="svg-dot">
              <title>{`${p.quizTitle}: ${p.score}% (${p.displayDate})`}</title>
            </circle>
            <text
              className="svg-axis-text"
              x={getX(idx)}
              y={height - 10}
              textAnchor="middle"
            >
              {p.displayDate}
            </text>
          </g>
        ))}
      </svg>

      {/* Screen reader accessible summary table */}
      <table className="sr-only">
        <caption>Quiz accuracy history and moving average</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Quiz</th>
            <th scope="col">Score</th>
            <th scope="col">Moving Avg</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.id}>
              <td>{p.displayDate}</td>
              <td>{p.quizTitle}</td>
              <td>{p.score}%</td>
              <td>{p.movingAverage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Accessible SVG-based Study Time Bar Chart
function StudyTimeBarChart({ data, goalMinutes }: { data: DailyStudyPoint[]; goalMinutes: number }) {
  if (data.length === 0) return null

  const width = 500
  const height = 220
  const padding = { top: 20, right: 20, bottom: 35, left: 40 }

  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxVal = Math.max(goalMinutes * 1.25, ...data.map((d) => d.studyMinutes), 60)
  const barWidth = Math.max(8, Math.min(28, (chartW / data.length) * 0.65))

  const getY = (val: number) => padding.top + chartH - (Math.min(maxVal, val) / maxVal) * chartH
  const getX = (idx: number) => {
    return padding.left + (idx + 0.5) * (chartW / data.length)
  }

  const goalY = getY(goalMinutes)

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <svg
        className="svg-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Daily study minutes bar chart"
      >
        <title>Daily Study Time</title>
        {/* Y Axis Grid & Labels */}
        {[0, Math.round(maxVal / 2), Math.round(maxVal)].map((val) => {
          const y = getY(val)
          return (
            <g key={val}>
              <line className="svg-grid-line" x1={padding.left} y1={y} x2={width - padding.right} y2={y} />
              <text className="svg-axis-text" x={padding.left - 6} y={y + 3} textAnchor="end">
                {val}m
              </text>
            </g>
          )
        })}

        {/* Daily Goal Target Line */}
        <line
          x1={padding.left}
          y1={goalY}
          x2={width - padding.right}
          y2={goalY}
          stroke="#45c4d6"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          opacity={0.7}
        />

        {/* Bars */}
        {data.map((d, idx) => {
          const x = getX(idx) - barWidth / 2
          const y = getY(d.studyMinutes)
          const h = padding.top + chartH - y
          const isGoalMet = d.studyMinutes >= goalMinutes

          return (
            <g key={d.dateKey}>
              <rect
                className="bar-col"
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, h)}
                rx={4}
                fill={isGoalMet ? '#6748d4' : d.studyMinutes > 0 ? '#45c4d6' : 'rgba(255, 255, 255, 0.05)'}
              >
                <title>{`${d.displayDate}: ${d.studyMinutes} min (${d.tasksCompleted} tasks completed)`}</title>
              </rect>
              <text
                className="svg-axis-text"
                x={getX(idx)}
                y={height - 10}
                textAnchor="middle"
              >
                {d.displayDate}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Screen reader accessible summary table */}
      <table className="sr-only">
        <caption>Daily study minutes history</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Minutes</th>
            <th scope="col">Tasks Completed</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.dateKey}>
              <td>{d.displayDate}</td>
              <td>{d.studyMinutes} min</td>
              <td>{d.tasksCompleted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
