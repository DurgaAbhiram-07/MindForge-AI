import { ArrowRight, BookOpen, BrainCircuit, ChartNoAxesColumnIncreasing, CircleHelp, Target } from 'lucide-react'
import { useMemo } from 'react'
import { useNotesStore } from './store/notesStore'
import { useQuizStore } from './store/quizStore'
import { deriveWeaknessAnalytics, type TopicPerformance } from './store/weaknessAnalytics'

type WeakTopicsProps = { onNavigate: (page: string) => void }

export default function WeakTopicsPage({ onNavigate }: WeakTopicsProps) {
  const quizzes = useQuizStore((state) => state.quizzes)
  const attempts = useQuizStore((state) => state.attempts)
  const notes = useNotesStore((state) => state.notes)
  const analytics = useMemo(() => deriveWeaknessAnalytics(quizzes, attempts, notes), [quizzes, attempts, notes])
  const weakCount = analytics.topics.filter((topic) => topic.status === 'weak').length
  const developingCount = analytics.topics.filter((topic) => topic.status === 'developing').length

  return <section className="weak-topics-page">
    <div className="page-heading materials-heading"><div><p className="eyebrow">Evidence-based progress</p><h1>Weak Topics</h1><p className="heading-copy">See where your quiz answers show an opportunity to review. Signals are calculated locally from answered questions.</p></div><button className="primary-button" onClick={() => onNavigate('Quizzes')}><BrainCircuit size={16} /> Practice a quiz</button></div>
    <div className="demo-notice" role="note"><ChartNoAxesColumnIncreasing size={14} /> Transparent signal: at least 3 answered questions are required before a topic is classified.</div>
    <section className="progress-summary" aria-label="Weak topic summary"><SummaryCard label="Needs review" value={`${weakCount}`} detail="topics below 70%" tone="pink" /><SummaryCard label="Developing" value={`${developingCount}`} detail="topics below 85%" tone="amber" /><SummaryCard label="Tracked topics" value={`${analytics.topics.length}`} detail="with quiz answers" tone="cyan" /></section>
    {analytics.topics.length === 0 ? <div className="materials-empty" role="status"><div className="empty-state-icon"><Target size={19} /></div><h2>No topic signal yet</h2><p>Complete a quiz and answer at least three questions to see personalized progress here.</p><button className="primary-button" onClick={() => onNavigate('Quizzes')}><BrainCircuit size={15} /> Open quizzes</button></div> : <div className="weak-topic-list">{analytics.topics.map((topic) => <TopicCard key={topic.key} topic={topic} recommendations={analytics.recommendations[topic.key] ?? []} onNavigate={onNavigate} />)}</div>}
    <p className="analytics-disclaimer"><CircleHelp size={14} /> These are descriptive study signals, not a diagnosis of ability. Accuracy is calculated from answered questions only; unanswered questions are excluded.</p>
  </section>
}

function SummaryCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <article className={`progress-summary-card progress-summary-${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function TopicCard({ topic, recommendations, onNavigate }: { topic: TopicPerformance; recommendations: { type: 'note' | 'quiz'; id: string; title: string; detail: string }[]; onNavigate: (page: string) => void }) {
  const accuracy = topic.accuracy === null ? '—' : `${topic.accuracy}%`
  return <article className="weak-topic-card"><div className="weak-topic-header"><div><span className="subject-pill">{topic.subject}</span><h2>{topic.topic}</h2></div><span className={`topic-status topic-status-${topic.status}`}>{topic.status === 'not-enough-data' ? 'Not enough data' : topic.status}</span></div><div className="weak-topic-metrics"><strong>{accuracy}</strong><span>{topic.correctQuestions}/{topic.attemptedQuestions} answered correctly</span></div><div className="goal-bar"><span style={{ width: `${topic.accuracy ?? 0}%` }} /></div><p className="weak-topic-recommendation">{topic.recommendation}</p>{recommendations.length > 0 && <div className="recommendation-list"><p className="section-kicker">Recommended next</p>{recommendations.map((recommendation) => <button className="recommendation-row" key={`${recommendation.type}-${recommendation.id}`} onClick={() => onNavigate(recommendation.type === 'note' ? 'Study materials' : 'Quizzes')}><span>{recommendation.type === 'note' ? <BookOpen size={15} /> : <BrainCircuit size={15} />}<span><strong>{recommendation.title}</strong><small>{recommendation.detail}</small></span></span><ArrowRight size={15} /></button>)}</div>}</article>
}
