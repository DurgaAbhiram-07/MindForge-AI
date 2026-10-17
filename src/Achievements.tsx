import { useMemo, useState } from 'react'
import {
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Medal,
  Sparkles,
  Trophy,
} from 'lucide-react'
import {
  ACHIEVEMENTS,
  calculateLevel,
  useGamificationStore,
  XP_POLICY,
  type AchievementCategory,
  type AchievementView,
} from './store/gamificationStore'
import { useNotesStore } from './store/notesStore'
import { usePlannerStore } from './store/plannerStore'
import { useQuizStore } from './store/quizStore'
import { getTodayDate } from './store/streakCalculations'
import './analytics.css'

type AchievementsPageProps = {
  onNavigate: (page: string) => void
}

export default function AchievementsPage({ onNavigate }: AchievementsPageProps) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [category, setCategory] = useState<AchievementCategory | 'all'>('all')
  const [showPolicy, setShowPolicy] = useState(false)

  const transactions = useGamificationStore((state) => state.transactions)
  const unlockedAchievements = useGamificationStore((state) => state.unlockedAchievements)
  const quizzes = useQuizStore((state) => state.quizzes)
  const attempts = useQuizStore((state) => state.attempts)
  const plannerTasks = usePlannerStore((state) => state.tasks)
  const dailyGoalMinutes = usePlannerStore((state) => state.preferences.dailyGoalMinutes)
  const notes = useNotesStore((state) => state.notes)

  const totalXp = useMemo(() => transactions.reduce((acc, t) => acc + t.xp, 0), [transactions])
  const levelInfo = useMemo(() => calculateLevel(totalXp), [totalXp])

  const unlockedMap = useMemo(() => {
    return new Map(unlockedAchievements.map((a) => [a.id, a.unlockedAt]))
  }, [unlockedAchievements])

  const achievementViews: AchievementView[] = useMemo(() => {
    const today = getTodayDate()
    const evalContext = {
      quizzes,
      attempts,
      plannerTasks,
      notes,
      dailyGoalMinutes,
      currentStreak: 0, // derived in calculations
      longestStreak: 0,
      totalXp,
      level: levelInfo.level,
      today,
    }

    return ACHIEVEMENTS.map((def) => {
      const unlockedAt = unlockedMap.get(def.id)
      const unlocked = unlockedAt !== undefined
      const progress = unlocked ? def.maxProgress : def.getProgress(evalContext)
      const progressPercent = Math.min(100, Math.round((progress / def.maxProgress) * 100))

      return {
        ...def,
        unlocked,
        unlockedAt,
        progress,
        progressPercent,
      }
    })
  }, [quizzes, attempts, plannerTasks, notes, dailyGoalMinutes, totalXp, levelInfo.level, unlockedMap])

  const filteredAchievements = useMemo(() => {
    return achievementViews.filter((a) => {
      if (filter === 'unlocked' && !a.unlocked) return false
      if (filter === 'locked' && a.unlocked) return false
      if (category !== 'all' && a.category !== category) return false
      return true
    })
  }, [achievementViews, filter, category])

  const unlockedCount = achievementViews.filter((a) => a.unlocked).length

  return (
    <section className="achievements-page">
      <section className="page-heading materials-heading">
        <div>
          <p className="eyebrow">
            Milestones & Mastery <span className="eyebrow-dot" /> {unlockedCount} of {ACHIEVEMENTS.length} Unlocked
          </p>
          <h1>Achievements & XP</h1>
          <p className="heading-copy">
            Earn experience points and badges by finishing deliberate practice quizzes and completing planned study sessions.
            All milestones are awarded strictly from verified local records.
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => setShowPolicy(!showPolicy)}
          aria-expanded={showPolicy}
        >
          {showPolicy ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {showPolicy ? 'Hide XP Rules' : 'How XP Works'}
        </button>
      </section>

      {/* Level Progression Hero */}
      <section className="level-hero" aria-label="Level progression">
        <div className="level-badge-wrap">
          <div className="level-orb" aria-label={`Level ${levelInfo.level}`}>
            {levelInfo.level}
          </div>
          <div className="level-details">
            <p className="section-kicker">Current Rank</p>
            <h2>{levelInfo.title}</h2>
            <p>
              {levelInfo.totalXp.toLocaleString()} Total XP earned across all verified activities
            </p>
          </div>
        </div>

        <div className="level-progress-wrap">
          <div className="level-progress-labels">
            <span>Level {levelInfo.level}</span>
            {levelInfo.nextLevelXp !== null ? (
              <span>
                <strong>{levelInfo.currentXpInLevel}</strong> / {levelInfo.nextLevelXp - levelInfo.currentLevelMinXp} XP to Level {levelInfo.level + 1}
              </span>
            ) : (
              <span>Max level reached</span>
            )}
          </div>
          <div className="level-bar" aria-label={`${levelInfo.levelProgressPercent} percent to next level`}>
            <span style={{ width: `${levelInfo.levelProgressPercent}%` }} />
          </div>
        </div>
      </section>

      {/* Expandable XP Policy Panel */}
      {showPolicy && (
        <section className="xp-policy-panel" aria-label="Transparent XP rules">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={16} color="#ad99ff" />
            <h3 style={{ margin: 0 }}>Transparent XP System</h3>
          </div>
          <p style={{ margin: '0 0 16px', color: '#888fad', fontSize: '11px', lineHeight: 1.5 }}>
            XP is only awarded for meaningful completed activities and is permanently idempotent. Refreshing a page,
            retrying an uncompleted question, or re-opening a study note will never duplicate XP.
          </p>
          <div className="policy-grid">
            <div className="policy-item">
              <strong>Quiz Completion</strong>
              <span>+{XP_POLICY.quizCompletionBase} XP base</span>
            </div>
            <div className="policy-item">
              <strong>Correct Quiz Answers</strong>
              <span>+{XP_POLICY.quizPerCorrectAnswer} XP per question</span>
            </div>
            <div className="policy-item">
              <strong>100% Perfect Quiz</strong>
              <span>+{XP_POLICY.quizPerfectScoreBonus} XP bonus</span>
            </div>
            <div className="policy-item">
              <strong>Planner Study Session</strong>
              <span>+{XP_POLICY.taskCompletionBase} XP + 1 XP / 2 min</span>
            </div>
            <div className="policy-item">
              <strong>Authoring Study Note</strong>
              <span>+{XP_POLICY.noteCreation} XP</span>
            </div>
            <div className="policy-item">
              <strong>Meeting Daily Goal</strong>
              <span>+{XP_POLICY.dailyGoalReached} XP</span>
            </div>
          </div>
        </section>
      )}

      {/* Gallery Filter Toolbar */}
      <div className="analytics-toolbar" style={{ marginBottom: '18px' }}>
        <div className="date-filters" role="tablist" aria-label="Achievement status filters">
          <button
            className={`date-filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            role="tab"
            aria-selected={filter === 'all'}
          >
            All ({achievementViews.length})
          </button>
          <button
            className={`date-filter-button ${filter === 'unlocked' ? 'active' : ''}`}
            onClick={() => setFilter('unlocked')}
            role="tab"
            aria-selected={filter === 'unlocked'}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            className={`date-filter-button ${filter === 'locked' ? 'active' : ''}`}
            onClick={() => setFilter('locked')}
            role="tab"
            aria-selected={filter === 'locked'}
          >
            In Progress ({achievementViews.length - unlockedCount})
          </button>
        </div>

        <div className="activity-filter-tabs" style={{ margin: 0 }}>
          {(['all', 'quizzes', 'study', 'streaks', 'mastery'] as const).map((cat) => (
            <button
              key={cat}
              className={`activity-filter-tab ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Achievement Cards Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="chart-empty panel" role="status">
          <Award size={28} />
          <h3>No achievements match this filter</h3>
          <p>Switch filters or complete study sessions to work towards unlocking new badges.</p>
          <button className="primary-button" onClick={() => onNavigate('Quizzes')}>
            <Sparkles size={14} /> Practice a quiz
          </button>
        </div>
      ) : (
        <section className="achievement-gallery-grid" aria-label="Achievement Badges">
          {filteredAchievements.map((item) => (
            <article
              key={item.id}
              className={`achievement-card ${item.unlocked ? 'unlocked' : 'locked'}`}
            >
              <div className="achievement-card-top">
                <div
                  className={`achievement-icon-box ${
                    item.unlocked
                      ? item.tier === 'gold'
                        ? 'achievement-icon-gold'
                        : item.tier === 'silver'
                        ? 'achievement-icon-silver'
                        : 'achievement-icon-bronze'
                      : 'achievement-icon-locked'
                  }`}
                >
                  {item.unlocked ? (
                    item.tier === 'gold' ? (
                      <Trophy size={18} />
                    ) : item.tier === 'silver' ? (
                      <Medal size={18} />
                    ) : (
                      <Award size={18} />
                    )
                  ) : (
                    <Lock size={16} />
                  )}
                </div>

                <div className="achievement-copy">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>

              {!item.unlocked && (
                <div>
                  <div className="level-progress-labels" style={{ fontSize: '9px', marginBottom: '4px' }}>
                    <span>Progress</span>
                    <span>
                      {item.progress} / {item.maxProgress} ({item.progressPercent}%)
                    </span>
                  </div>
                  <div className="level-bar" style={{ height: '5px' }}>
                    <span style={{ width: `${item.progressPercent}%` }} />
                  </div>
                </div>
              )}

              <div className="achievement-bottom">
                <span className="xp-reward-tag">+{item.xpReward} XP</span>
                {item.unlocked && item.unlockedAt ? (
                  <span className="unlock-date">
                    <Check size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    {formatShortDate(item.unlockedAt)}
                  </span>
                ) : (
                  <span>Locked</span>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {/* XP Transaction History */}
      <section className="panel">
        <div className="panel-heading" style={{ marginBottom: '16px' }}>
          <div>
            <p className="section-kicker">Transparent Ledger</p>
            <h2>XP Transactions</h2>
          </div>
          <span className="focus-count">{transactions.length} entries</span>
        </div>

        {transactions.length === 0 ? (
          <div className="chart-empty" role="status">
            <Sparkles size={24} />
            <h3>No XP transactions yet</h3>
            <p>Finish a quiz or complete a planned study task to start recording verified experience points.</p>
          </div>
        ) : (
          <div className="history-list" aria-label="XP transactions ledger">
            {transactions.slice(0, 8).map((tx) => (
              <div key={tx.id} className="history-item">
                <div className="history-icon kpi-icon-violet">
                  <Sparkles size={16} />
                </div>
                <div className="history-copy">
                  <strong>{tx.description}</strong>
                  <span>{formatTimestamp(tx.timestamp)}</span>
                </div>
                <span className="xp-reward-tag">+{tx.xp} XP</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

function formatShortDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
  } catch {
    return isoString
  }
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
