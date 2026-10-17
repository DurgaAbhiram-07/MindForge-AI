import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Edit3, ExternalLink, Plus, Sparkles, Trash2, X } from 'lucide-react'
import './planner.css'
import { useDashboardStore } from './store/dashboardStore'
import { useNotesStore } from './store/notesStore'
import { useQuizStore } from './store/quizStore'
import { deriveWeaknessAnalytics } from './store/weaknessAnalytics'
import { findTaskConflicts, getDailyAssistantPlan, getTodayDate, getTasksForView, usePlannerStore, type PlannerPriority, type PlannerTask, type PlannerTaskInput, type PlannerDateView } from './store/plannerStore'

type StudyPlannerProps = {
  onFeedback: (message: string) => void
  onOpenResource?: (type: 'note' | 'quiz', id: string) => void
}
type Draft = Omit<PlannerTaskInput, 'completed'>
type ScheduleMode = 'day' | 'list'

const emptyDraft = (date = getTodayDate()): Draft => ({ title: '', subject: '', topic: '', date, startTime: '', durationMinutes: 25, priority: 'medium', linkedNoteId: '', linkedQuizId: '' })
const formatDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
const formatDay = (date: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(`${date}T12:00:00`))
const dateFromKey = (date: string) => { const [year, month, day] = date.split('-').map(Number); return new Date(year, month - 1, day, 12) }
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const shiftDate = (date: string, days: number) => { const next = dateFromKey(date); next.setDate(next.getDate() + days); return dateKey(next) }
const weekStart = (date: string) => { const result = dateFromKey(date); const day = result.getDay(); result.setDate(result.getDate() - (day === 0 ? 6 : day - 1)); return dateKey(result) }
const weekDates = (date: string) => Array.from({ length: 7 }, (_, index) => shiftDate(weekStart(date), index))
const timeToMinutes = (value: string) => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes }

export default function StudyPlannerPage({ onFeedback, onOpenResource }: StudyPlannerProps) {
  const tasks = usePlannerStore((state) => state.tasks)
  const preferences = usePlannerStore((state) => state.preferences)
  const createTask = usePlannerStore((state) => state.createTask)
  const updateTask = usePlannerStore((state) => state.updateTask)
  const completeTask = usePlannerStore((state) => state.completeTask)
  const deleteTask = usePlannerStore((state) => state.deleteTask)
  const setDailyGoalMinutes = usePlannerStore((state) => state.setDailyGoalMinutes)
  const notes = useNotesStore((state) => state.notes)
  const quizzes = useQuizStore((state) => state.quizzes)
  const addActivity = useDashboardStore((state) => state.addActivity)
  const [view, setView] = useState<PlannerDateView>('today')
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('day')
  const [selectedDate, setSelectedDate] = useState(getTodayDate)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const editorRef = useRef<HTMLElement>(null)
  const deleteRef = useRef<HTMLElement>(null)
  const today = getTodayDate()
  const attempts = useQuizStore((state) => state.attempts)
  const weakness = useMemo(() => deriveWeaknessAnalytics(quizzes, attempts, notes), [quizzes, attempts, notes])
  const weakTopics = weakness.topics.filter((topic) => topic.status === 'weak' || topic.status === 'developing')
  const weakKeys = weakTopics.map((topic) => topic.key)
  const selectedWeek = weekDates(selectedDate)
  const plannedToday = tasks.filter((task) => task.date === today)
  const completedToday = plannedToday.filter((task) => task.completed)
  const completedMinutes = completedToday.reduce((total, task) => total + task.durationMinutes, 0)
  const remainingTasks = plannedToday.filter((task) => !task.completed)
  const remainingMinutes = remainingTasks.reduce((total, task) => total + task.durationMinutes, 0)
  const goalProgress = Math.min(100, Math.round((completedMinutes / preferences.dailyGoalMinutes) * 100))
  const visibleTasks = view === 'today' ? tasks.filter((task) => task.date === selectedDate).sort(taskSort) : getTasksForView(tasks, view, today)
  const hasWeekTasks = selectedWeek.some((date) => tasks.some((task) => task.date === date))
  const plan = getDailyAssistantPlan(tasks, { today, weakTopicKeys: weakKeys })
  const noteById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes])
  const quizById = useMemo(() => new Map(quizzes.map((quiz) => [quiz.id, quiz])), [quizzes])

  useEffect(() => {
    const active = showEditor ? editorRef : deleteId ? deleteRef : null
    if (!active) return
    const element = active.current
    if (!element) return
    const focusable = () => [...element.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((item) => !item.hasAttribute('disabled'))
    focusable()[0]?.focus()
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeModals(); return }
      if (event.key !== 'Tab') return
      const items = focusable(); if (!items.length) return
      const first = items[0]; const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  // closeModals is intentionally stable for this local modal stack.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditor, deleteId])

  const closeModals = () => { setEditingId(null); setDeleteId(null); setShowEditor(false); setDraft(emptyDraft(selectedDate)); setFormError('') }
  const openNewTask = (date = selectedDate) => { setEditingId(null); setDraft(emptyDraft(date)); setFormError(''); setShowEditor(true) }
  const reportFeedback = (message: string) => { setFeedback(message); onFeedback(message) }
  const saveTask = (event: FormEvent) => {
    event.preventDefault()
    const duration = Number(draft.durationMinutes)
    if (!draft.title.trim() || !draft.subject.trim() || !draft.topic.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) { setFormError('Title, subject, topic, and a valid date are required.'); return }
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) { setFormError('Duration must be a whole number from 1 to 1440 minutes.'); return }
    if (draft.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime)) { setFormError('Enter a valid start time.'); return }
    if (draft.startTime && timeToMinutes(draft.startTime) + duration > 1440) { setFormError('This session ends after midnight. Choose an earlier start time or a shorter duration.'); return }
    const existing = editingId ? tasks.find((task) => task.id === editingId) : undefined
    const normalized: PlannerTaskInput = { ...draft, startTime: draft.startTime || undefined, linkedNoteId: draft.linkedNoteId || undefined, linkedQuizId: draft.linkedQuizId || undefined, durationMinutes: duration, completed: existing?.completed ?? false }
    const candidate: PlannerTask = { ...normalized, id: editingId ?? 'candidate' }
    const conflicts = findTaskConflicts([...tasks.filter((task) => task.id !== editingId), candidate], candidate.date).filter((conflict) => conflict.taskAId === candidate.id || conflict.taskBId === candidate.id)
    if (conflicts.length > 0) { setFormError(`This session overlaps another session from ${conflicts[0].overlapStart} to ${conflicts[0].overlapEnd}. Change the start time or duration.`); return }
    if (editingId) {
      updateTask(editingId, normalized)
      const saved = usePlannerStore.getState().tasks.find((task) => task.id === editingId)
      if (!saved || !taskMatchesInput(saved, normalized)) { setFormError('The planner rejected this update. Check the task fields and try again.'); return }
      reportFeedback('Study task updated locally.')
    } else {
      const id = createTask(normalized)
      if (!id || !usePlannerStore.getState().tasks.some((task) => task.id === id)) { setFormError('The planner rejected this task. Check the fields and try again.'); return }
      reportFeedback('Study task added to your plan.')
    }
    setDraft(emptyDraft(selectedDate)); setEditingId(null); setShowEditor(false); setFormError('')
  }

  const toggleCompletion = (task: PlannerTask) => {
    const current = usePlannerStore.getState().tasks.find((item) => item.id === task.id)
    if (!current) return
    const nextCompleted = !current.completed
    completeTask(task.id, nextCompleted)
    if (nextCompleted && !current.completed) addActivity({ subject: task.subject, title: `${task.title} completed`, detail: `${task.durationMinutes} min · planner task`, color: 'cyan' })
    reportFeedback(nextCompleted ? `${task.title} marked complete.` : `${task.title} reopened.`)
  }

  const edit = (task: PlannerTask) => { setEditingId(task.id); setShowEditor(true); setDraft({ title: task.title, subject: task.subject, topic: task.topic, date: task.date, startTime: task.startTime ?? '', durationMinutes: task.durationMinutes, priority: task.priority, linkedNoteId: task.linkedNoteId ?? '', linkedQuizId: task.linkedQuizId ?? '' }); setSelectedDate(task.date); setFormError('') }
  const scheduleWeakTopic = (subject: string, topic: string, noteId?: string, quizId?: string) => { setSelectedDate(today); setEditingId(null); setDraft({ ...emptyDraft(today), title: `Review ${topic}`, subject, topic, priority: 'high', linkedNoteId: noteId ?? '', linkedQuizId: quizId ?? '' }); setFormError(''); setShowEditor(true) }
  const confirmDelete = () => { if (deleteId) { deleteTask(deleteId); setDeleteId(null); reportFeedback('Study task deleted.') } }
  const openResource = (type: 'note' | 'quiz', id: string) => onOpenResource ? onOpenResource(type, id) : reportFeedback(`${type === 'note' ? 'Note' : 'Quiz'} is linked to this task.`)

  return <section className="planner-page">
    <div className="page-heading materials-heading"><div><p className="eyebrow">Local planning assistant <span className="eyebrow-dot" /> {tasks.length} tasks</p><h1>Study planner</h1><p className="heading-copy">Plan deliberate sessions with simple, visible rules. Nothing here claims a connected AI planner.</p></div><button className="primary-button" onClick={() => openNewTask()}><Plus size={16} /> New task</button></div>
    {feedback && <div className="feedback-banner" role="status"><Check size={15} /> {feedback}</div>}
    <section className="planner-summary"><Summary label="Study time today" value={`${completedMinutes} min`} detail={`${remainingMinutes} min remaining`} tone="cyan" /><Summary label="Completed tasks" value={`${completedToday.length}`} detail={`${plannedToday.length} planned today`} tone="violet" /><Summary label="Remaining tasks" value={`${remainingTasks.length}`} detail="Still on the plan" tone="pink" /><Summary label="Goal progress" value={`${goalProgress}%`} detail={`Goal ${preferences.dailyGoalMinutes} min`} tone="amber" /></section>
    <section className="planner-toolbar"><div className="planner-tabs" role="tablist" aria-label="Planner views">{(['today', 'upcoming', 'completed'] as PlannerDateView[]).map((item) => <button key={item} className={view === item ? 'planner-tab-active' : ''} onClick={() => setView(item)} role="tab" aria-selected={view === item}>{item === 'today' ? 'Today' : item === 'upcoming' ? 'Upcoming' : 'Completed'}</button>)}</div><label className="goal-input">Daily goal <input type="number" min="1" max="1440" value={preferences.dailyGoalMinutes} onChange={(event) => setDailyGoalMinutes(Number(event.target.value))} aria-label="Daily goal minutes" /> min</label></section>
    {view === 'today' && <section className="planner-week panel" aria-label="Weekly schedule"><div className="week-heading"><button className="icon-button" onClick={() => { const next = shiftDate(selectedDate, -7); setSelectedDate(next) }} aria-label="Previous week"><ArrowLeft size={16} /></button><div><p className="section-kicker">Weekly schedule</p><h2>{formatDate(selectedWeek[0])} – {formatDate(selectedWeek[6])}</h2></div><button className="icon-button" onClick={() => setSelectedDate(shiftDate(selectedDate, 7))} aria-label="Next week"><ArrowRight size={16} /></button><button className="secondary-button week-today" onClick={() => setSelectedDate(today)}>Today</button></div><div className="week-days">{selectedWeek.map((date) => { const count = tasks.filter((task) => task.date === date).length; return <button key={date} className={`week-day ${selectedDate === date ? 'week-day-active' : ''}`} onClick={() => setSelectedDate(date)} aria-pressed={selectedDate === date}><span>{formatDay(date)}</span><strong>{dateFromKey(date).getDate()}</strong><small>{count} {count === 1 ? 'task' : 'tasks'}</small></button> })}</div><div className="schedule-mode" role="group" aria-label="Schedule display"><button className={scheduleMode === 'day' ? 'planner-tab-active' : ''} onClick={() => setScheduleMode('day')}>Selected day</button><button className={scheduleMode === 'list' ? 'planner-tab-active' : ''} onClick={() => setScheduleMode('list')}>Week list</button></div></section>}
    <div className="planner-grid"><section className="planner-main panel"><div className="panel-heading"><div><p className="section-kicker">{view === 'today' ? `${formatDay(selectedDate)} · ${formatDate(selectedDate)}` : view === 'upcoming' ? 'Next sessions' : 'Completed history'}</p><h2>{(view === 'today' && scheduleMode === 'list' ? hasWeekTasks : visibleTasks.length) ? 'Your study sessions' : 'A clear slate'}</h2></div><CalendarDays size={18} className="muted-icon" /></div>{(view === 'today' && scheduleMode === 'list' ? hasWeekTasks : visibleTasks.length) ? (view === 'today' && scheduleMode === 'list' ? <div className="planner-task-list week-list">{selectedWeek.map((date) => <div key={date} className="week-list-day"><h3>{formatDay(date)} · {formatDate(date)}</h3>{tasks.filter((task) => task.date === date).sort(taskSort).map((task) => <TaskCard key={task.id} task={task} noteTitle={task.linkedNoteId ? noteById.get(task.linkedNoteId)?.title : undefined} quizTitle={task.linkedQuizId ? quizById.get(task.linkedQuizId)?.title : undefined} onOpenResource={openResource} onToggle={() => toggleCompletion(task)} onEdit={() => edit(task)} onDelete={() => setDeleteId(task.id)} />)}</div>)}</div> : <div className="planner-task-list">{visibleTasks.map((task) => <TaskCard key={task.id} task={task} noteTitle={task.linkedNoteId ? noteById.get(task.linkedNoteId)?.title : undefined} quizTitle={task.linkedQuizId ? quizById.get(task.linkedQuizId)?.title : undefined} onOpenResource={openResource} onToggle={() => toggleCompletion(task)} onEdit={() => edit(task)} onDelete={() => setDeleteId(task.id)} />)}</div>) : <div className="planner-empty"><CalendarDays size={20} /><h3>{view === 'completed' ? 'No completed sessions yet' : 'No sessions in this view'}</h3><p>{view === 'today' ? 'Add a focused session to make this day concrete.' : 'Create a task or switch to another view.'}</p><button className="text-button" onClick={() => openNewTask(view === 'today' ? selectedDate : today)}>Plan a session <ArrowRight size={14} /></button></div>}</section><aside className="planner-side"><section className="panel assistant-panel"><div className="insight-orb"><Sparkles size={18} /></div><p className="section-kicker">Daily planning assistant</p><h2>Start with what matters.</h2><p className="insight-copy">Rules: overdue first, then high priority, then topics marked weak or developing from real quiz attempts.</p>{plan.length ? <div className="assistant-list">{plan.slice(0, 5).map(({ task, reasons }) => <div className="assistant-row" key={task.id}><div><strong>{task.title}</strong><span>{reasons.join(' · ')} · {formatDate(task.date)}</span></div><button className="text-button" onClick={() => edit(task)} aria-label={`Edit ${task.title}`}>Open</button></div>)}</div> : <p className="muted-copy">Add tasks to get a transparent priority order.</p>}</section><section className="panel weak-schedule-panel"><p className="section-kicker">Weak topics to schedule</p><h2>Turn review into a session.</h2>{weakTopics.length ? <div className="weak-schedule-list">{weakTopics.slice(0, 4).map((topic) => { const links = weakness.recommendations[topic.key] ?? []; const note = links.find((link) => link.type === 'note'); const quiz = links.find((link) => link.type === 'quiz'); return <div className="weak-topic-row" key={topic.key}><div><strong>{topic.topic}</strong><span>{topic.subject} · {topic.accuracy ?? 0}% accuracy</span></div><button className="text-button" onClick={() => scheduleWeakTopic(topic.subject, topic.topic, note?.id, quiz?.id)}>Schedule</button></div> })}</div> : <p className="muted-copy">Complete quizzes to surface review topics.</p>}</section></aside></div>
    {(showEditor || editingId !== null) && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModals() }}><section ref={editorRef} className="planner-editor" role="dialog" aria-modal="true" aria-labelledby="planner-editor-title"><div className="modal-heading"><div><p className="section-kicker">{editingId ? 'Refine a session' : 'New study session'}</p><h2 id="planner-editor-title">{editingId ? 'Edit task' : 'Add task'}</h2></div><button type="button" className="icon-button" onClick={closeModals} aria-label="Close task editor"><X size={18} /></button></div><form onSubmit={saveTask}><div className="form-grid"><label>Title<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Review cell energy" /></label><label>Subject<input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="e.g. Biology" /></label><label>Topic<input value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} placeholder="e.g. Cell energy" /></label><label>Date<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>Start time <span className="field-hint">optional</span><input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label><label>Duration (minutes)<input type="number" min="1" max="1440" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: Number(event.target.value) })} /></label><label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as PlannerPriority })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Linked note <span className="field-hint">optional</span><select value={draft.linkedNoteId} onChange={(event) => setDraft({ ...draft, linkedNoteId: event.target.value })}><option value="">No note</option>{notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}</select></label><label>Linked quiz <span className="field-hint">optional</span><select value={draft.linkedQuizId} onChange={(event) => setDraft({ ...draft, linkedQuizId: event.target.value })}><option value="">No quiz</option>{quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}</select></label></div>{formError && <p className="form-error" role="alert"><AlertTriangle size={14} /> {formError}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModals}>Cancel</button><button type="submit" className="primary-button">{editingId ? 'Save changes' : 'Add task'}</button></div></form></section></div>}
    {deleteId && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModals() }}><section ref={deleteRef} className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="planner-delete-title"><div className="delete-icon"><Trash2 size={18} /></div><h2 id="planner-delete-title">Delete this study task?</h2><p>This removes the task from your local planner. This action cannot be undone.</p><div className="modal-actions"><button className="secondary-button" onClick={closeModals}>Cancel</button><button className="danger-button" onClick={confirmDelete}>Delete task</button></div></section></div>}
  </section>
}

const taskSort = (left: PlannerTask, right: PlannerTask) => left.date.localeCompare(right.date) || (left.startTime ?? '99:99').localeCompare(right.startTime ?? '99:99') || left.id.localeCompare(right.id)
const taskMatchesInput = (task: PlannerTask, input: PlannerTaskInput) => task.title === input.title.trim() && task.subject === input.subject.trim() && task.topic === input.topic.trim() && task.date === input.date && task.startTime === input.startTime && task.durationMinutes === input.durationMinutes && task.priority === input.priority && task.completed === input.completed && task.linkedNoteId === input.linkedNoteId && task.linkedQuizId === input.linkedQuizId
function Summary({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) { return <article className={`progress-summary-card progress-summary-${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article> }
function TaskCard({ task, noteTitle, quizTitle, onOpenResource, onToggle, onEdit, onDelete }: { task: PlannerTask; noteTitle?: string; quizTitle?: string; onOpenResource: (type: 'note' | 'quiz', id: string) => void; onToggle: () => void; onEdit: () => void; onDelete: () => void }) { return <article className={`planner-task-card ${task.completed ? 'planner-task-complete' : ''}`}><button className="task-check" onClick={onToggle} aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`} aria-pressed={task.completed}>{task.completed && <Check size={13} />}</button><div className="planner-task-copy"><div className="planner-task-heading"><strong>{task.title}</strong><span className={`priority-${task.priority}`}>{task.priority}</span></div><span>{task.subject} · {task.topic}</span><small><Clock3 size={12} /> {task.startTime ?? 'Flexible time'} · {task.durationMinutes} min · {formatDay(task.date)} {formatDate(task.date)}</small><div className="task-resource-links">{task.linkedNoteId && <button className="resource-button" onClick={() => onOpenResource('note', task.linkedNoteId!)} title={noteTitle ?? 'Open linked note'}><ExternalLink size={12} /> Note{noteTitle ? ` · ${noteTitle}` : ''}</button>}{task.linkedQuizId && <button className="resource-button" onClick={() => onOpenResource('quiz', task.linkedQuizId!)} title={quizTitle ?? 'Open linked quiz'}><ExternalLink size={12} /> Quiz{quizTitle ? ` · ${quizTitle}` : ''}</button>}</div></div><div className="planner-task-actions"><button className="icon-button" onClick={onEdit} aria-label={`Edit ${task.title}`}><Edit3 size={15} /></button><button className="icon-button" onClick={onDelete} aria-label={`Delete ${task.title}`}><Trash2 size={15} /></button></div></article> }
