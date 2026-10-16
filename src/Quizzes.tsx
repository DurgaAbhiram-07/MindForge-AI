import { useState, type FormEvent } from 'react'
import { ArrowLeft, BrainCircuit, Check, ChevronLeft, ChevronRight, FilePlus2, Lightbulb, Plus, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import { useDashboardStore } from './store/dashboardStore'
import { useNotesStore, type Note } from './store/notesStore'
import {
  calculateQuizScore,
  LOCAL_QUIZ_GENERATION_NOTICE,
  QUIZ_GENERATION_LIMITATIONS,
  useQuizStore,
  validateManualQuizInput,
  type Quiz,
  type QuizQuestionInput,
} from './store/quizStore'

type QuizPageProps = { onFeedback: (message: string) => void }
type DraftQuestion = Omit<QuizQuestionInput, 'options'> & { options: [string, string, string, string] }

const blankQuestion = (): DraftQuestion => ({ prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' })

export default function QuizzesPage({ onFeedback }: QuizPageProps) {
  const quizzes = useQuizStore((state) => state.quizzes)
  const attempts = useQuizStore((state) => state.attempts)
  const createFromNote = useQuizStore((state) => state.createQuizFromNote)
  const saveAttempt = useQuizStore((state) => state.saveAttempt)
  const retryQuiz = useQuizStore((state) => state.retryQuiz)
  const notes = useNotesStore((state) => state.notes)
  const addActivity = useDashboardStore((state) => state.addActivity)
  const recordQuizResult = useDashboardStore((state) => state.recordQuizResult)
  const [view, setView] = useState<'library' | 'create' | 'take' | 'results'>('library')
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [lastScore, setLastScore] = useState<{ score: number; correctCount: number } | null>(null)
  const [feedback, setFeedback] = useState('')

  const activeQuiz = quizzes.find((quiz) => quiz.id === activeQuizId) ?? null
  const localFeedback = feedback || undefined

  const beginQuiz = (quiz: Quiz, initialAnswers?: number[]) => {
    setActiveQuizId(quiz.id)
    setAnswers(initialAnswers ?? quiz.questions.map(() => -1))
    setQuestionIndex(0)
    setLastScore(null)
    setView('take')
  }

  const submitQuiz = () => {
    if (!activeQuiz || answers.some((answer) => answer < 0)) {
      setFeedback('Answer every question before submitting.')
      return
    }
    const attempt = saveAttempt(activeQuiz.id, answers)
    if (!attempt) return
    const score = calculateQuizScore(activeQuiz, answers)
    setLastScore(score)
    recordQuizResult(score.score)
    addActivity({ subject: activeQuiz.subject, title: `${activeQuiz.title} completed`, detail: `${score.score}% score · ${score.correctCount}/${activeQuiz.questions.length} correct`, color: 'violet' })
    setFeedback('Quiz attempt saved locally.')
    setView('results')
  }

  if (view === 'create') return <ManualQuizBuilder onCancel={() => setView('library')} onCreated={(id) => { setActiveQuizId(id); setView('library'); onFeedback('Manual quiz created and saved locally.') }} />
  if ((view === 'take' || view === 'results') && activeQuiz) {
    return <QuizRunner quiz={activeQuiz} view={view} answers={answers} setAnswers={setAnswers} questionIndex={questionIndex} setQuestionIndex={setQuestionIndex} score={lastScore} feedback={localFeedback} onBack={() => setView('library')} onSubmit={submitQuiz} onRetry={() => beginQuiz(activeQuiz, retryQuiz(activeQuiz.id))} />
  }

  const handleGenerate = (note: Note) => {
    const id = createFromNote(note)
    const generated = useQuizStore.getState().quizzes.find((quiz) => quiz.id === id)
    if (generated) {
      setFeedback('Local quiz generated from the note. No AI was used.')
      onFeedback('Local quiz generated from the note. No AI was used.')
    }
  }

  return <section className="quiz-page">
    <section className="page-heading materials-heading"><div><p className="eyebrow">Practice studio <span className="eyebrow-dot" /> {quizzes.length} quizzes</p><h1>Quizzes</h1><p className="heading-copy">Turn your notes into deliberate practice and see what sticks.</p></div><button className="primary-button" onClick={() => setView('create')}><Plus size={17} /> Create quiz</button></section>
    {feedback && <div className="feedback-banner" role="status"><Check size={15} /> {feedback}</div>}
    <div className="quiz-notice"><Sparkles size={15} /><div><strong>Local generation, clearly labeled</strong><p>{LOCAL_QUIZ_GENERATION_NOTICE} {QUIZ_GENERATION_LIMITATIONS}</p></div></div>
    {quizzes.length === 0 ? <div className="materials-empty" role="status"><div className="empty-state-icon"><BrainCircuit size={19} /></div><h2>No quizzes yet</h2><p>Create a manual quiz or generate one from a saved study note.</p><button className="primary-button" onClick={() => setView('create')}><FilePlus2 size={15} /> Create your first quiz</button></div> : <div className="quiz-layout"><section><div className="section-header"><div><p className="section-kicker">Your quiz library</p><h2>Ready when you are.</h2></div></div><div className="quiz-grid">{quizzes.map((quiz) => <QuizCard key={quiz.id} quiz={quiz} attempt={attempts.find((attempt) => attempt.quizId === quiz.id)} onStart={() => beginQuiz(quiz)} />)}</div></section><section className="notes-to-quiz panel"><p className="section-kicker">From your notes</p><h2>Make a quick recall check.</h2><p>Choose a saved note and MindForge will create four deterministic recall questions from its fields.</p><div className="note-source-list">{notes.slice(0, 4).map((note) => <div className="note-source-row" key={note.id}><div><strong>{note.title}</strong><span>{note.subject} · {note.topic}</span></div><button className="text-button" onClick={() => handleGenerate(note)}>Generate <Sparkles size={13} /></button></div>)}</div></section></div>}
  </section>
}

function QuizCard({ quiz, attempt, onStart }: { quiz: Quiz; attempt?: { score: number; correctCount: number }; onStart: () => void }) {
  return <article className="quiz-card"><div className="quiz-card-top"><span className="subject-pill">{quiz.subject}</span><span className="quiz-difficulty">{quiz.difficulty}</span></div><h2>{quiz.title}</h2><p>{quiz.questions.length} questions · {quiz.source === 'notes' ? 'Local note generation' : 'Manual quiz'}</p>{attempt ? <div className="quiz-score"><strong>{attempt.score}%</strong><span>last score · {attempt.correctCount}/{quiz.questions.length}</span></div> : <div className="quiz-score quiz-score-empty"><strong>—</strong><span>not attempted yet</span></div>}<button className="secondary-button quiz-start" onClick={onStart}><BrainCircuit size={15} /> {attempt ? 'Retry quiz' : 'Start quiz'}</button></article>
}

function ManualQuizBuilder({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const createManualQuiz = useQuizStore((state) => state.createManualQuiz)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()])
  const [errors, setErrors] = useState<string[]>([])

  const updateQuestion = (index: number, update: Partial<DraftQuestion>) => setQuestions((current) => current.map((question, questionIndex) => questionIndex === index ? { ...question, ...update } : question))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const input = { title, subject, difficulty, questions }
    const nextErrors = validateManualQuizInput(input)
    if (nextErrors.length) { setErrors(nextErrors); return }
    const id = createManualQuiz(input)
    if (id) onCreated(id)
  }

  return <section className="quiz-builder"><button className="back-button" onClick={onCancel}><ArrowLeft size={16} /> Back to quizzes</button><div className="page-heading materials-heading"><div><p className="eyebrow">Manual authoring</p><h1>Create a quiz</h1><p className="heading-copy">Write the questions you want to practice. Every quiz stays on this device.</p></div></div><form className="quiz-builder-form" onSubmit={submit}><div className="form-grid"><label>Quiz title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Biology checkpoint" /></label><label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Biology" /></label><label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>easy</option><option>medium</option><option>hard</option></select></label></div>{questions.map((question, index) => <QuestionEditor key={index} index={index} question={question} canRemove={questions.length > 1} onChange={(update) => updateQuestion(index, update)} onRemove={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}{errors.length > 0 && <div className="form-error" role="alert">{errors.map((error) => <div key={error}>{error}</div>)}</div>}<div className="builder-actions"><button type="button" className="secondary-button" onClick={() => setQuestions((current) => [...current, blankQuestion()])}><Plus size={15} /> Add question</button><span /><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" type="submit"><Check size={15} /> Save quiz</button></div></form></section>
}

function QuestionEditor({ index, question, canRemove, onChange, onRemove }: { index: number; question: DraftQuestion; canRemove: boolean; onChange: (update: Partial<DraftQuestion>) => void; onRemove: () => void }) {
  return <fieldset className="question-editor"><div className="question-editor-heading"><legend>Question {index + 1}</legend>{canRemove && <button type="button" className="icon-button" onClick={onRemove} aria-label={`Remove question ${index + 1}`}><Trash2 size={15} /></button>}</div><label>Prompt<input value={question.prompt} onChange={(event) => onChange({ prompt: event.target.value })} placeholder="What should the learner recall?" /></label><div className="option-grid">{question.options.map((option, optionIndex) => <label key={optionIndex}>Option {optionIndex + 1}<input value={option} onChange={(event) => { const options = [...question.options] as DraftQuestion['options']; options[optionIndex] = event.target.value; onChange({ options }) }} /></label>)}</div><label>Correct answer<select value={question.correctIndex} onChange={(event) => onChange({ correctIndex: Number(event.target.value) })}>{question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Option {optionIndex + 1}</option>)}</select></label><label>Explanation<textarea rows={3} value={question.explanation} onChange={(event) => onChange({ explanation: event.target.value })} placeholder="Why is this answer correct?" /></label></fieldset>
}

function QuizRunner({ quiz, view, answers, setAnswers, questionIndex, setQuestionIndex, score, feedback, onBack, onSubmit, onRetry }: { quiz: Quiz; view: 'take' | 'results'; answers: number[]; setAnswers: (answers: number[]) => void; questionIndex: number; setQuestionIndex: (index: number) => void; score: { score: number; correctCount: number } | null; feedback?: string; onBack: () => void; onSubmit: () => void; onRetry: () => void }) {
  if (view === 'results' && score) return <QuizResults quiz={quiz} answers={answers} score={score} feedback={feedback} onBack={onBack} onRetry={onRetry} />
  const question = quiz.questions[questionIndex]
  const selected = answers[questionIndex]
  return <section className="quiz-runner"><button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Exit quiz</button><div className="quiz-runner-header"><div><p className="eyebrow">{quiz.subject} · {quiz.difficulty}</p><h1>{quiz.title}</h1></div><span className="quiz-progress">Question {questionIndex + 1} of {quiz.questions.length}</span></div><div className="quiz-progress-bar"><span style={{ width: `${((questionIndex + 1) / quiz.questions.length) * 100}%` }} /></div>{feedback && <div className="feedback-banner" role="status"><Check size={15} /> {feedback}</div>}<article className="question-panel"><p className="section-kicker">Recall check</p><h2>{question.prompt}</h2><div className="answer-options">{question.options.map((option, index) => <button key={option} className={`answer-option ${selected === index ? 'answer-selected' : ''}`} onClick={() => setAnswers(answers.map((answer, itemIndex) => itemIndex === questionIndex ? index : answer))} aria-pressed={selected === index}><span className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{selected === index && <Check size={16} />}</button>)}</div></article><div className="quiz-navigation"><button className="secondary-button" onClick={() => setQuestionIndex(Math.max(0, questionIndex - 1))} disabled={questionIndex === 0}><ChevronLeft size={15} /> Previous</button>{questionIndex < quiz.questions.length - 1 ? <button className="primary-button" onClick={() => setQuestionIndex(questionIndex + 1)} disabled={selected < 0}>Next <ChevronRight size={15} /></button> : <button className="primary-button" onClick={onSubmit}><Check size={15} /> Submit quiz</button>}</div></section>
}

function QuizResults({ quiz, answers, score, feedback, onBack, onRetry }: { quiz: Quiz; answers: number[]; score: { score: number; correctCount: number }; feedback?: string; onBack: () => void; onRetry: () => void }) {
  return <section className="quiz-results"><button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Back to quizzes</button>{feedback && <div className="feedback-banner" role="status"><Check size={15} /> {feedback}</div>}<div className="result-hero"><div className="result-orb"><Lightbulb size={24} /></div><p className="section-kicker">Quiz complete</p><h1>{score.score}%</h1><p>{score.correctCount} of {quiz.questions.length} answers correct. Review the explanations below.</p><div className="result-actions"><button className="primary-button" onClick={onRetry}><RotateCcw size={15} /> Try again</button><button className="secondary-button" onClick={onBack}>Return to library</button></div></div><div className="review-list">{quiz.questions.map((question, index) => { const answer = answers[index]; const correct = answer === question.correctIndex; return <article className={`review-item ${correct ? 'review-correct' : 'review-incorrect'}`} key={`${question.prompt}-${index}`}><div className="review-status">{correct ? <Check size={15} /> : <X size={15} />}</div><div><strong>{index + 1}. {question.prompt}</strong><p>Your answer: {answer >= 0 ? question.options[answer] : 'Not answered'}</p><p className="correct-answer">Correct answer: {question.options[question.correctIndex]}</p><span>{question.explanation}</span></div></article> })}</div></section>
}
