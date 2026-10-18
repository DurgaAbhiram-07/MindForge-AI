import { FormEvent, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  Info,
  Layers,
  Lightbulb,
  List,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import {
  selectNotes,
  useNotesStore,
  type Note,
  type NoteDraft,
  type NoteSortKey,
} from './store/notesStore'
import { useDashboardStore } from './store/dashboardStore'
import { useGamificationStore } from './store/gamificationStore'
import {
  calculateQuizScore,
  useQuizStore,
} from './store/quizStore'

type StudyMaterialsProps = {
  onFeedback: (message: string) => void
  onNavigate?: (page: string) => void
}

type Flashcard = {
  id: string
  concept: string
  detail: string
  category?: string
}

const emptyDraft: NoteDraft = { title: '', subject: '', topic: '', content: '' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function preview(content: string) {
  return content.replace(/[#*_`>|\-[\]!]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160)
}

function calculateReadingStats(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / 175))
  return { words, minutes }
}

function getSubjectBadgeClass(subject: string) {
  const normalized = subject.trim().toLowerCase()
  if (normalized.includes('bio')) return 'pill-emerald'
  if (normalized.includes('math')) return 'pill-violet'
  if (normalized.includes('comp') || normalized.includes('cs')) return 'pill-cyan'
  if (normalized.includes('neuro') || normalized.includes('psych')) return 'pill-pink'
  if (normalized.includes('hist')) return 'pill-amber'
  if (normalized.includes('phys')) return 'pill-blue'
  return 'pill-violet'
}

function generateFlashcardsFromNote(note: Note): Flashcard[] {
  const cards: Flashcard[] = []
  const lines = note.content.split('\n').map((l) => l.trim()).filter(Boolean)

  // 1. Definition / Core Concept card
  const firstMeaningful = lines.find((l) => !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('-') && !l.startsWith('|'))
  cards.push({
    id: `${note.id}-card-core`,
    concept: `Core Foundation: ${note.title}`,
    detail: firstMeaningful || `${note.title} represents a key conceptual pillar in ${note.subject} (${note.topic}).`,
    category: 'Core Concept',
  })

  // 2. High-Yield Takeaway / Formula card
  const takeawayLine = lines.find((l) => l.includes('Anchor') || l.includes('Takeaway') || l.includes('Vieta') || l.includes('Architecture') || l.includes('Protocol') || l.includes('Theorem'))
  if (takeawayLine) {
    cards.push({
      id: `${note.id}-card-takeaway`,
      concept: `Exam & Mastery Anchor: ${note.topic}`,
      detail: takeawayLine.replace(/^>\s*/, '').replace(/\[![A-Z]+\]/g, '').replace(/\*\*/g, '').trim(),
      category: 'Key Takeaway',
    })
  }

  // 3. Section headings & bullet points
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('## ') || line.startsWith('### ')) {
      const heading = line.replace(/^#{2,3}\s+/, '')
      const nextBullet = lines.slice(i + 1, i + 6).find((l) => l.startsWith('- ') || l.startsWith('1. ') || (!l.startsWith('#') && !l.startsWith('>')))
      if (nextBullet && cards.length < 6) {
        cards.push({
          id: `${note.id}-card-${cards.length + 1}`,
          concept: heading,
          detail: nextBullet.replace(/^[-*1-9.]+\s+/, '').replace(/\*\*/g, ''),
          category: note.subject,
        })
      }
    }
  }

  // Fallback if note has few headings
  if (cards.length < 3) {
    cards.push({
      id: `${note.id}-card-domain`,
      concept: `Academic Classification & Domain`,
      detail: `Subject: ${note.subject} · Topic: ${note.topic} · Focus on core recall and analytical reasoning.`,
      category: 'Domain Context',
    })
  }

  return cards
}

function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={index}>{part.slice(1, -1)}</em>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={index} className="inline-code">{part.slice(1, -1)}</code>
        }
        return part
      })}
    </>
  )
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="note-code-block">
      <div className="code-header">
        <span className="code-lang">{lang || 'CODE'}</span>
        <button type="button" className="code-copy-btn" onClick={handleCopy} aria-label="Copy code">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-pre">
        <code>{code}</code>
      </pre>
    </div>
  )
}

type ParsedBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'callout'; variant: 'note' | 'tip' | 'warning' | 'takeaway'; lines: string[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; items: string[]; ordered: boolean }
  | { type: 'paragraph'; text: string }

function parseMarkdownContent(content: string): ParsedBlock[] {
  const lines = content.split('\n')
  const blocks: ParsedBlock[] = []
  let index = 0

  while (index < lines.length) {
    const rawLine = lines[index]
    const trimmed = rawLine.trim()

    if (!trimmed) {
      index++
      continue
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'code'
      index++
      const codeLines: string[] = []
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index++
      }
      if (index < lines.length) index++
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') })
      continue
    }

    // Callout block: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!TAKEAWAY]
    if (trimmed.startsWith('>')) {
      let variant: 'note' | 'tip' | 'warning' | 'takeaway' = 'note'
      const firstLine = trimmed.replace(/^>\s*/, '')
      if (firstLine.includes('[!TIP]')) variant = 'tip'
      else if (firstLine.includes('[!IMPORTANT]') || firstLine.includes('[!WARNING]')) variant = 'warning'
      else if (firstLine.includes('[!TAKEAWAY]')) variant = 'takeaway'

      const calloutLines: string[] = []
      const cleanedFirst = firstLine.replace(/\[!(NOTE|INFO|TIP|IMPORTANT|WARNING|TAKEAWAY)\]/g, '').trim()
      if (cleanedFirst) calloutLines.push(cleanedFirst)

      index++
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        calloutLines.push(lines[index].trim().replace(/^>\s*/, ''))
        index++
      }

      blocks.push({ type: 'callout', variant, lines: calloutLines })
      continue
    }

    // Markdown Table: lines starting with |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        tableLines.push(lines[index].trim())
        index++
      }
      if (tableLines.length >= 2) {
        const parseRow = (row: string) => row.split('|').slice(1, -1).map((cell) => cell.trim())
        const headers = parseRow(tableLines[0])
        const rows = tableLines.slice(2).map(parseRow)
        blocks.push({ type: 'table', headers, rows })
        continue
      }
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4) })
      index++
      continue
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3) })
      index++
      continue
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2) })
      index++
      continue
    }

    // Bulleted list: - or *
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: string[] = []
      while (index < lines.length && (lines[index].trim().startsWith('- ') || lines[index].trim().startsWith('* '))) {
        items.push(lines[index].trim().slice(2))
        index++
      }
      blocks.push({ type: 'list', items, ordered: false })
      continue
    }

    // Numbered list: 1. 2.
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s/, ''))
        index++
      }
      blocks.push({ type: 'list', items, ordered: true })
      continue
    }

    // Paragraph
    blocks.push({ type: 'paragraph', text: trimmed })
    index++
  }

  return blocks
}

function NoteContent({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdownContent(content), [content])

  return (
    <div className="note-reader-content">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'h1':
            return <h2 key={index} className="reader-h1"><FormattedText text={block.text} /></h2>
          case 'h2':
            return <h3 key={index} className="reader-h2"><FormattedText text={block.text} /></h3>
          case 'h3':
            return <h4 key={index} className="reader-h3"><FormattedText text={block.text} /></h4>
          case 'code':
            return <CodeBlock key={index} lang={block.lang} code={block.code} />
          case 'callout': {
            const icon =
              block.variant === 'tip' ? <Lightbulb size={17} /> :
              block.variant === 'warning' ? <AlertTriangle size={17} /> :
              block.variant === 'takeaway' ? <Star size={17} /> :
              <Info size={17} />
            const title =
              block.variant === 'tip' ? 'PRO TIP' :
              block.variant === 'warning' ? 'CRITICAL CONCEPT' :
              block.variant === 'takeaway' ? 'KEY TAKEAWAY' :
              'FOUNDATIONAL NOTE'
            return (
              <div key={index} className={`note-callout note-callout-${block.variant}`}>
                <div className="callout-header">
                  <span className="callout-icon">{icon}</span>
                  <strong>{title}</strong>
                </div>
                <div className="callout-body">
                  {block.lines.map((line, lineIndex) => (
                    <p key={lineIndex}><FormattedText text={line} /></p>
                  ))}
                </div>
              </div>
            )
          }
          case 'table':
            return (
              <div key={index} className="reader-table-wrap">
                <table className="reader-table">
                  <thead>
                    <tr>
                      {block.headers.map((hdr, hIndex) => (
                        <th key={hIndex}><FormattedText text={hdr} /></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIndex) => (
                      <tr key={rIndex}>
                        {row.map((cell, cIndex) => (
                          <td key={cIndex}><FormattedText text={cell} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'list':
            return block.ordered ? (
              <ol key={index} className="reader-ol">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}><FormattedText text={item} /></li>
                ))}
              </ol>
            ) : (
              <ul key={index} className="reader-ul">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}><FormattedText text={item} /></li>
                ))}
              </ul>
            )
          case 'paragraph':
            return <p key={index}><FormattedText text={block.text} /></p>
        }
      })}
    </div>
  )
}

export default function StudyMaterialsPage({ onFeedback, onNavigate }: StudyMaterialsProps) {
  const notes = useNotesStore((state) => state.notes)
  const isDemoData = useNotesStore((state) => state.isDemoData)
  const addNote = useNotesStore((state) => state.addNote)
  const updateNote = useNotesStore((state) => state.updateNote)
  const deleteNote = useNotesStore((state) => state.deleteNote)
  const markNoteRead = useNotesStore((state) => state.markNoteRead)
  const toggleFavorite = useNotesStore((state) => state.toggleFavorite)
  const addActivity = useDashboardStore((state) => state.addActivity)

  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [sortKey, setSortKey] = useState<NoteSortKey>('updatedAt')
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'favorites'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<NoteDraft>(emptyDraft)
  const [formError, setFormError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Modals for Flashcards & Quick Quiz
  const [flashcardNote, setFlashcardNote] = useState<Note | null>(null)
  const [quizNote, setQuizNote] = useState<Note | null>(null)

  const subjects = useMemo(() => [...new Set(notes.map((note) => note.subject))].sort(), [notes])
  const unreadCount = useMemo(() => notes.filter((n) => !n.isRead).length, [notes])
  const favoriteCount = useMemo(() => notes.filter((n) => n.favorite).length, [notes])

  const filteredNotes = useMemo(() => {
    return selectNotes(notes, {
      query,
      subject,
      sortKey,
      sortDirection: 'desc',
      unreadOnly: filterMode === 'unread',
      favoritesOnly: filterMode === 'favorites',
    })
  }, [notes, query, subject, sortKey, filterMode])

  const selectedNote = notes.find((note) => note.id === selectedId) ?? null
  const pendingDelete = notes.find((note) => note.id === deleteId) ?? null

  const openCreate = () => {
    setEditingId(null)
    setDraft(emptyDraft)
    setFormError('')
    setEditorOpen(true)
  }

  const openEdit = (note: Note) => {
    setEditingId(note.id)
    setDraft({ title: note.title, subject: note.subject, topic: note.topic, content: note.content })
    setFormError('')
    setEditorOpen(true)
  }

  const submitNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim() || !draft.subject.trim() || !draft.topic.trim() || !draft.content.trim()) {
      setFormError('Title, subject, topic, and content are required.')
      return
    }

    if (editingId) {
      updateNote(editingId, draft)
      const note = notes.find((item) => item.id === editingId)
      if (note) addActivity({ subject: draft.subject, title: `Edited ${draft.title}`, detail: `${draft.topic} · note updated`, color: 'violet' })
      onFeedback('Note updated and saved locally.')
    } else {
      const id = addNote(draft)
      addActivity({ subject: draft.subject, title: draft.title, detail: `${draft.topic} · note added`, color: 'cyan' })
      const created = useNotesStore.getState().notes.find((n) => n.id === id)
      if (created) {
        useGamificationStore.getState().awardNoteCreated(created)
      }
      setSelectedId(id)
      onFeedback('Note added and saved locally.')
    }
    setEditorOpen(false)
    setFormError('')
  }

  const openReader = (note: Note) => {
    setSelectedId(note.id)
    if (!note.isRead) {
      markNoteRead(note.id, true)
      addActivity({ subject: note.subject, title: `Studied ${note.title}`, detail: `${note.topic} · note opened`, color: 'amber' })
      onFeedback('Study activity recorded.')
    }
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteNote(pendingDelete.id)
    if (selectedId === pendingDelete.id) setSelectedId(null)
    setDeleteId(null)
    onFeedback('Note deleted from this device.')
  }

  if (selectedNote) {
    return (
      <>
        <NoteReader
          note={selectedNote}
          onBack={() => setSelectedId(null)}
          onEdit={() => openEdit(selectedNote)}
          onDelete={() => setDeleteId(selectedNote.id)}
          onStartFlashcards={() => setFlashcardNote(selectedNote)}
          onStartQuiz={() => setQuizNote(selectedNote)}
          onToggleFavorite={() => toggleFavorite(selectedNote.id)}
          onFeedback={onFeedback}
        />
        {flashcardNote && (
          <FlashcardReviewModal
            note={flashcardNote}
            onClose={() => setFlashcardNote(null)}
            onFeedback={onFeedback}
          />
        )}
        {quizNote && (
          <QuickQuizModal
            note={quizNote}
            onClose={() => setQuizNote(null)}
            onFeedback={onFeedback}
            onNavigateQuiz={() => {
              setQuizNote(null)
              onNavigate?.('Quizzes')
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <section className="page-heading materials-heading">
        <div>
          <p className="eyebrow">Knowledge library <span className="eyebrow-dot" /> {notes.length} comprehensive materials</p>
          <h1>Study materials</h1>
          <p className="heading-copy">Capture ideas, master deep concepts, and deliberate practice with instant flashcards and quizzes.</p>
        </div>
        <button className="primary-button" onClick={openCreate}><Plus size={17} /> New note</button>
      </section>

      {isDemoData && (
        <div className="demo-notice" role="note">
          <FileText size={14} /> Master-level study materials loaded. You can edit, practice, or add your own notes anytime.
        </div>
      )}

      {/* Subject Filter Pills */}
      <nav className="subject-filter-nav" aria-label="Subject filter tabs">
        <button
          className={`subject-chip ${subject === '' ? 'subject-chip-active' : ''}`}
          onClick={() => setSubject('')}
        >
          All Subjects <span className="chip-count">{notes.length}</span>
        </button>
        {subjects.map((subj) => {
          const count = notes.filter((n) => n.subject === subj).length
          return (
            <button
              key={subj}
              className={`subject-chip ${subject === subj ? 'subject-chip-active' : ''}`}
              onClick={() => setSubject(subj)}
            >
              {subj} <span className="chip-count">{count}</span>
            </button>
          )
        })}
      </nav>

      {/* Main Filter Toolbar */}
      <section className="materials-toolbar" aria-label="Study material filters">
        <label className="materials-search">
          <Search size={16} />
          <span className="sr-only">Search study materials</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes, subjects, topics..."
          />
          {query && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </label>

        {/* Status Mode Chips */}
        <div className="filter-mode-chips" role="group" aria-label="Status filter">
          <button
            type="button"
            className={`mode-chip ${filterMode === 'all' ? 'mode-chip-active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`mode-chip ${filterMode === 'unread' ? 'mode-chip-active' : ''}`}
            onClick={() => setFilterMode('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`mode-chip ${filterMode === 'favorites' ? 'mode-chip-active' : ''}`}
            onClick={() => setFilterMode('favorites')}
          >
            <Star size={12} fill={filterMode === 'favorites' ? '#f59e0b' : 'none'} /> Starred ({favoriteCount})
          </button>
        </div>

        <label className="select-control">
          <Filter size={14} />
          <span className="sr-only">Filter by subject</span>
          <select value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="select-control">
          <CalendarDays size={14} />
          <span className="sr-only">Sort materials</span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as NoteSortKey)}>
            <option value="updatedAt">Recently updated</option>
            <option value="createdAt">Recently created</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>

        <div className="view-toggle" aria-label="Material layout">
          <button
            className={viewMode === 'grid' ? 'view-active' : ''}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <FileText size={16} />
          </button>
          <button
            className={viewMode === 'list' ? 'view-active' : ''}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
      </section>

      {filteredNotes.length === 0 ? (
        <MaterialsEmpty
          hasNotes={notes.length > 0}
          onCreate={openCreate}
          onClear={() => {
            setQuery('')
            setSubject('')
            setFilterMode('all')
          }}
        />
      ) : (
        <section
          className={`materials-grid ${viewMode === 'list' ? 'materials-list-view' : ''}`}
          aria-label="Study materials list"
        >
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onOpen={() => openReader(note)}
              onEdit={() => openEdit(note)}
              onDelete={() => setDeleteId(note.id)}
              onStartFlashcards={() => setFlashcardNote(note)}
              onStartQuiz={() => setQuizNote(note)}
              onToggleFavorite={() => toggleFavorite(note.id)}
            />
          ))}
        </section>
      )}

      {editorOpen && (
        <NoteEditor
          draft={draft}
          editing={Boolean(editingId)}
          error={formError}
          onChange={setDraft}
          onSubmit={submitNote}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {pendingDelete && (
        <DeleteDialog
          note={pendingDelete}
          onCancel={() => setDeleteId(null)}
          onConfirm={confirmDelete}
        />
      )}

      {flashcardNote && (
        <FlashcardReviewModal
          note={flashcardNote}
          onClose={() => setFlashcardNote(null)}
          onFeedback={onFeedback}
        />
      )}

      {quizNote && (
        <QuickQuizModal
          note={quizNote}
          onClose={() => setQuizNote(null)}
          onFeedback={onFeedback}
          onNavigateQuiz={() => {
            setQuizNote(null)
            onNavigate?.('Quizzes')
          }}
        />
      )}
    </>
  )
}

function NoteCard({
  note,
  onOpen,
  onEdit,
  onDelete,
  onStartFlashcards,
  onStartQuiz,
  onToggleFavorite,
}: {
  note: Note
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onStartFlashcards: () => void
  onStartQuiz: () => void
  onToggleFavorite: () => void
}) {
  const { words, minutes } = calculateReadingStats(note.content)
  const badgeClass = getSubjectBadgeClass(note.subject)

  return (
    <article className={`note-card ${note.isRead ? '' : 'note-card-unread'}`}>
      <button className="note-card-main" onClick={onOpen}>
        <div className="note-card-top">
          <div className="subject-badge-wrap">
            <span className={`subject-pill ${badgeClass}`}>{note.subject}</span>
            <span className="reading-time-pill"><Clock size={11} /> {minutes} min read</span>
          </div>
          <div className="card-top-right">
            {!note.isRead && <span className="unread-dot">New</span>}
          </div>
        </div>

        <h2>{note.title}</h2>
        <p className="note-topic">{note.topic}</p>
        <p className="note-preview">{preview(note.content)}</p>

        <div className="note-card-footer-meta">
          <span className="note-words">{words} words</span>
          <span className="note-date">Updated {formatDate(note.updatedAt)}</span>
        </div>
      </button>

      <div className="note-card-actions">
        <button
          type="button"
          className="quick-action-btn"
          onClick={onStartQuiz}
          aria-label={`Practice quiz for ${note.title}`}
          title="Instant Quiz"
        >
          <Zap size={14} /> <span>Quiz</span>
        </button>
        <button
          type="button"
          className="quick-action-btn"
          onClick={onStartFlashcards}
          aria-label={`Flashcards for ${note.title}`}
          title="Flashcards"
        >
          <Layers size={14} /> <span>Cards</span>
        </button>
        <button
          type="button"
          className={`favorite-toggle-btn ${note.favorite ? 'is-fav' : ''}`}
          onClick={onToggleFavorite}
          aria-label={note.favorite ? 'Starred' : 'Star note'}
          title="Toggle Star"
        >
          <Star size={14} fill={note.favorite ? '#f59e0b' : 'none'} color={note.favorite ? '#f59e0b' : 'currentColor'} />
        </button>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${note.title}`}
          title="Edit Note"
        >
          <Edit3 size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${note.title}`}
          title="Delete Note"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  )
}

function NoteReader({
  note,
  onBack,
  onEdit,
  onDelete,
  onStartFlashcards,
  onStartQuiz,
  onToggleFavorite,
  onFeedback,
}: {
  note: Note
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onStartFlashcards: () => void
  onStartQuiz: () => void
  onToggleFavorite: () => void
  onFeedback: (message: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const { words, minutes } = calculateReadingStats(note.content)
  const badgeClass = getSubjectBadgeClass(note.subject)

  const copyMarkdown = () => {
    navigator.clipboard?.writeText(note.content)
    setCopied(true)
    onFeedback('Note markdown copied to clipboard.')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="note-reader">
      <div className="reader-top-navigation">
        <button className="back-button" onClick={onBack}>
          <ChevronLeft size={16} /> Back to materials
        </button>
        <div className="reader-top-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={copyMarkdown}
            aria-label="Copy markdown"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            className={`secondary-button ${note.favorite ? 'reader-fav-active' : ''}`}
            onClick={onToggleFavorite}
            aria-label="Toggle star"
          >
            <Star size={14} fill={note.favorite ? '#f59e0b' : 'none'} color={note.favorite ? '#f59e0b' : 'currentColor'} />
          </button>
          <button className="secondary-button" onClick={onEdit} aria-label={`Edit ${note.title}`}>
            <Edit3 size={14} /> Edit
          </button>
          <button className="danger-button" onClick={onDelete} aria-label={`Delete ${note.title}`}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="reader-header">
        <div>
          <div className="reader-badge-row">
            <span className={`subject-pill ${badgeClass}`}>{note.subject}</span>
            <span className="reading-time-pill"><Clock size={12} /> {minutes} min read</span>
            <span className="reading-time-pill"><FileText size={12} /> {words} words</span>
            {note.isRead && <span className="read-status-badge"><Check size={12} /> Mastered</span>}
          </div>
          <p className="reader-topic">{note.topic}</p>
          <h1>{note.title}</h1>
          <p className="reader-meta">
            Created {formatDate(note.createdAt)} · Last revised {formatDate(note.updatedAt)}
          </p>
        </div>

        <div className="reader-study-hub">
          <button
            type="button"
            className="primary-button quiz-accent-button"
            onClick={onStartQuiz}
          >
            <Zap size={16} /> Practice Quiz
          </button>
          <button
            type="button"
            className="secondary-button cards-accent-button"
            onClick={onStartFlashcards}
          >
            <Layers size={16} /> Flashcards (Deck)
          </button>
        </div>
      </div>

      <div className="reader-paper">
        <NoteContent content={note.content} />
      </div>

      <div className="reader-bottom-cta">
        <div className="cta-info">
          <h3>Ready to test what you learned?</h3>
          <p>Reinforce synaptic recall with deterministic 4-question local quiz practice.</p>
        </div>
        <div className="cta-actions">
          <button className="secondary-button" onClick={onStartFlashcards}>
            <Layers size={15} /> Flashcard Mode
          </button>
          <button className="primary-button" onClick={onStartQuiz}>
            <Zap size={15} /> Launch Quiz Check
          </button>
        </div>
      </div>
    </section>
  )
}

function MaterialsEmpty({
  hasNotes,
  onCreate,
  onClear,
}: {
  hasNotes: boolean
  onCreate: () => void
  onClear: () => void
}) {
  return (
    <div className="materials-empty" role="status">
      <div className="empty-state-icon"><BookOpen size={20} /></div>
      <h2>{hasNotes ? 'No notes match your search' : 'Your library is ready for its first idea'}</h2>
      <p>
        {hasNotes
          ? 'Try adjusting your search terms, changing the subject, or clearing the filter.'
          : 'Create a note to collect class concepts, reading summaries, formulas, and your own questions.'}
      </p>
      <button className="primary-button" onClick={hasNotes ? onClear : onCreate}>
        {hasNotes ? 'Clear filters' : 'Create your first note'}
      </button>
    </div>
  )
}

function NoteEditor({
  draft,
  editing,
  error,
  onChange,
  onSubmit,
  onClose,
}: {
  draft: NoteDraft
  editing: boolean
  error: string
  onChange: (draft: NoteDraft) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop">
      <section className="note-editor" role="dialog" aria-modal="true" aria-labelledby="note-editor-title">
        <div className="modal-heading">
          <div>
            <p className="section-kicker">{editing ? 'Refine a note' : 'New study material'}</p>
            <h2 id="note-editor-title">{editing ? 'Edit note' : 'Add a note'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close note editor">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Title
              <input
                value={draft.title}
                onChange={(event) => onChange({ ...draft, title: event.target.value })}
                placeholder="e.g. Graph Algorithms & Shortest Path"
              />
            </label>
            <label>
              Subject
              <input
                value={draft.subject}
                onChange={(event) => onChange({ ...draft, subject: event.target.value })}
                placeholder="e.g. Computer Science"
              />
            </label>
            <label>
              Topic
              <input
                value={draft.topic}
                onChange={(event) => onChange({ ...draft, topic: event.target.value })}
                placeholder="e.g. Graph Theory"
              />
            </label>
          </div>
          <label>
            Content (Markdown supported)
            <textarea
              value={draft.content}
              onChange={(event) => onChange({ ...draft, content: event.target.value })}
              placeholder={
                'Write your note...\n\nUse # for Headings, > [!NOTE] for Callouts, ``` for Code, and | for Tables.'
              }
              rows={12}
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button">
              <Check size={15} /> {editing ? 'Save changes' : 'Add note'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function DeleteDialog({
  note,
  onCancel,
  onConfirm,
}: {
  note: Note
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop">
      <section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-note-title">
        <div className="delete-icon"><Trash2 size={18} /></div>
        <h2 id="delete-note-title">Delete this note?</h2>
        <p><strong>{note.title}</strong> will be removed from this device. This cannot be undone.</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onCancel}>Keep note</button>
          <button className="danger-button" onClick={onConfirm}>Delete note</button>
        </div>
      </section>
    </div>
  )
}

/* ==========================================================================
   INTERACTIVE FLASHCARDS REVIEW MODAL
   ========================================================================== */

function FlashcardReviewModal({
  note,
  onClose,
  onFeedback,
}: {
  note: Note
  onClose: () => void
  onFeedback: (message: string) => void
}) {
  const cards = useMemo(() => generateFlashcardsFromNote(note), [note])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState(false)

  const currentCard = cards[currentIndex]
  const isMastered = currentCard ? masteredIds.has(currentCard.id) : false

  const handleNext = () => {
    setFlipped(false)
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setCompleted(true)
      useGamificationStore.getState().awardXp({
        sourceId: `flashcard-deck-${note.id}-${Date.now()}`,
        eventType: 'note-read',
        xp: cards.length * 10,
        description: `Mastered flashcard deck: ${note.title}`,
        timestamp: new Date().toISOString(),
      })
      useDashboardStore.getState().addActivity({
        subject: note.subject,
        title: `Flashcard deck reviewed: ${note.title}`,
        detail: `${masteredIds.size}/${cards.length} cards mastered · active recall completed`,
        color: 'cyan',
      })
      onFeedback(`Flashcards completed! +${cards.length * 10} XP awarded.`)
    }
  }

  const handlePrev = () => {
    setFlipped(false)
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1)
  }

  const markMastered = () => {
    if (!currentCard) return
    const nextSet = new Set(masteredIds)
    nextSet.add(currentCard.id)
    setMasteredIds(nextSet)
    handleNext()
  }

  const markNeedsReview = () => {
    if (!currentCard) return
    const nextSet = new Set(masteredIds)
    nextSet.delete(currentCard.id)
    setMasteredIds(nextSet)
    handleNext()
  }

  const restartDeck = () => {
    setCurrentIndex(0)
    setFlipped(false)
    setCompleted(false)
  }

  return (
    <div className="modal-backdrop">
      <div className="flashcard-modal" role="dialog" aria-modal="true" aria-labelledby="flashcard-deck-title">
        <div className="modal-heading">
          <div>
            <p className="section-kicker">Interactive Flashcards · {note.subject}</p>
            <h2 id="flashcard-deck-title">{note.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close flashcards">
            <X size={18} />
          </button>
        </div>

        {!completed ? (
          <>
            <div className="flashcard-progress-bar-wrap">
              <div
                className="flashcard-progress-bar"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
            <div className="flashcard-meta-row">
              <span className="card-counter">Card {currentIndex + 1} of {cards.length}</span>
              <span className="card-category-tag">{currentCard?.category || 'Recall'}</span>
              <span className="card-mastered-count">
                {masteredIds.size} mastered ({Math.round((masteredIds.size / cards.length) * 100)}%)
              </span>
            </div>

            {/* Flip Card Container */}
            <div
              className={`flashcard-scene ${flipped ? 'is-flipped' : ''}`}
              onClick={() => setFlipped(!flipped)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setFlipped(!flipped)
                }
              }}
              aria-label="Click to flip card"
            >
              <div className="flashcard-inner">
                {/* Front Side */}
                <div className="flashcard-face flashcard-front">
                  <div className="face-header">
                    <span className="face-label">PROMPT / CONCEPT</span>
                    <Sparkles size={16} className="face-icon" />
                  </div>
                  <div className="face-body">
                    <h3>{currentCard?.concept}</h3>
                  </div>
                  <div className="face-footer">
                    <span>Click or press space to reveal answer ↺</span>
                  </div>
                </div>

                {/* Back Side */}
                <div className="flashcard-face flashcard-back">
                  <div className="face-header">
                    <span className="face-label">EXPLANATION / ANSWER</span>
                    <CheckCircle2 size={16} className="face-icon" />
                  </div>
                  <div className="face-body">
                    <p>{currentCard?.detail}</p>
                  </div>
                  <div className="face-footer">
                    <span>Click again to flip back</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flashcard-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label="Previous card"
              >
                <ArrowLeft size={15} /> Prev
              </button>

              <button
                type="button"
                className="secondary-button flip-btn"
                onClick={() => setFlipped(!flipped)}
              >
                <RotateCcw size={15} /> {flipped ? 'Show Front' : 'Flip Card'}
              </button>

              <button
                type="button"
                className="secondary-button needs-review-btn"
                onClick={markNeedsReview}
              >
                Needs Review
              </button>

              <button
                type="button"
                className="primary-button mastered-btn"
                onClick={markMastered}
              >
                <Check size={15} /> {isMastered ? 'Mastered ✓' : 'I Know This'}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={handleNext}
                aria-label="Next card"
              >
                Next <ArrowRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <div className="deck-summary-view">
            <div className="summary-icon"><CheckCircle2 size={40} /></div>
            <h3>Deck Review Complete!</h3>
            <p>
              You mastered <strong>{masteredIds.size} of {cards.length}</strong> concepts (
              {Math.round((masteredIds.size / cards.length) * 100)}%) in <em>{note.title}</em>.
            </p>
            <div className="summary-stats-box">
              <div className="summary-stat">
                <strong>{cards.length}</strong>
                <span>Total Cards</span>
              </div>
              <div className="summary-stat">
                <strong>{masteredIds.size}</strong>
                <span>Mastered</span>
              </div>
              <div className="summary-stat">
                <strong>+{cards.length * 10} XP</strong>
                <span>Awarded</span>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="secondary-button" onClick={restartDeck}>
                <RotateCcw size={15} /> Practice Deck Again
              </button>
              <button className="primary-button" onClick={onClose}>
                Return to Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   INSTANT LOCAL QUIZ MODAL
   ========================================================================== */

function QuickQuizModal({
  note,
  onClose,
  onFeedback,
  onNavigateQuiz,
}: {
  note: Note
  onClose: () => void
  onFeedback: (message: string) => void
  onNavigateQuiz: () => void
}) {
  const createQuizFromNote = useQuizStore((state) => state.createQuizFromNote)
  const saveAttempt = useQuizStore((state) => state.saveAttempt)
  const quizzes = useQuizStore((state) => state.quizzes)

  const quiz = useMemo(() => {
    const existing = quizzes.find((q) => q.sourceNoteId === note.id)
    if (existing) return existing
    const id = createQuizFromNote(note)
    return useQuizStore.getState().quizzes.find((q) => q.id === id) ?? null
  }, [note, quizzes, createQuizFromNote])

  const [answers, setAnswers] = useState<number[]>(() => quiz ? quiz.questions.map(() => -1) : [])
  const [submitted, setSubmitted] = useState(false)
  const [scoreResult, setScoreResult] = useState<{ score: number; correctCount: number } | null>(null)

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (submitted) return
    setAnswers((prev) => {
      const next = [...prev]
      next[questionIndex] = optionIndex
      return next
    })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!quiz || answers.some((a) => a < 0)) {
      onFeedback('Please answer all 4 recall questions before submitting.')
      return
    }

    const attempt = saveAttempt(quiz.id, answers)
    if (attempt) {
      const calculated = calculateQuizScore(quiz, answers)
      setScoreResult(calculated)
      setSubmitted(true)
      useGamificationStore.getState().awardQuizAttempt(attempt, quiz)
      useDashboardStore.getState().addActivity({
        subject: quiz.subject,
        title: `Practice Quiz: ${quiz.title}`,
        detail: `${calculated.score}% score (${calculated.correctCount}/${quiz.questions.length}) · local recall`,
        color: calculated.score >= 70 ? 'cyan' : 'amber',
      })
      onFeedback(`Quiz completed: ${calculated.score}% score recorded!`)
    }
  }

  const handleRetry = () => {
    if (!quiz) return
    setAnswers(quiz.questions.map(() => -1))
    setSubmitted(false)
    setScoreResult(null)
  }

  if (!quiz) {
    return (
      <div className="modal-backdrop">
        <div className="quick-quiz-modal">
          <p>Generating quiz for {note.title}...</p>
          <button className="primary-button" onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop">
      <div className="quick-quiz-modal" role="dialog" aria-modal="true" aria-labelledby="quick-quiz-title">
        <div className="modal-heading">
          <div>
            <p className="section-kicker">Instant Local Recall Check</p>
            <h2 id="quick-quiz-title">{quiz.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close quiz">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {submitted && scoreResult && (
            <div className={`quiz-score-banner ${scoreResult.score >= 70 ? 'score-high' : 'score-low'}`}>
              <div className="score-number">{scoreResult.score}%</div>
              <div>
                <strong>
                  {scoreResult.score >= 85 ? 'Outstanding Mastery! ✦' : scoreResult.score >= 70 ? 'Good Recall!' : 'Needs Revision'}
                </strong>
                <p>
                  You answered {scoreResult.correctCount} of {quiz.questions.length} questions correctly.
                  Your result has been saved to your learning analytics.
                </p>
              </div>
            </div>
          )}

          <div className="quick-quiz-questions">
            {quiz.questions.map((question, qIdx) => {
              const selectedChoice = answers[qIdx]
              const isCorrect = submitted && selectedChoice === question.correctIndex

              return (
                <div key={qIdx} className={`quick-question-card ${submitted ? (isCorrect ? 'q-correct' : 'q-wrong') : ''}`}>
                  <div className="q-header">
                    <span className="q-badge">Question {qIdx + 1}</span>
                    <p className="q-prompt">{question.prompt}</p>
                  </div>

                  <div className="q-options-grid">
                    {question.options.map((option, optIdx) => {
                      const isOptionSelected = selectedChoice === optIdx
                      const isOptionCorrect = submitted && optIdx === question.correctIndex
                      const isOptionWrongSelected = submitted && isOptionSelected && optIdx !== question.correctIndex

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          className={`q-option-btn ${isOptionSelected ? 'selected' : ''} ${isOptionCorrect ? 'is-correct' : ''} ${isOptionWrongSelected ? 'is-wrong' : ''}`}
                          onClick={() => handleSelect(qIdx, optIdx)}
                          disabled={submitted}
                        >
                          <span className="option-letter">{['A', 'B', 'C', 'D'][optIdx]}</span>
                          <span className="option-text">{option}</span>
                        </button>
                      )
                    })}
                  </div>

                  {submitted && (
                    <div className="q-explanation">
                      <strong>Explanation:</strong> {question.explanation}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            {submitted ? (
              <>
                <button type="button" className="secondary-button" onClick={handleRetry}>
                  <RotateCcw size={15} /> Retake Quiz
                </button>
                <button type="button" className="secondary-button" onClick={onNavigateQuiz}>
                  <ExternalLink size={15} /> Open in Quiz Studio
                </button>
                <button type="button" className="primary-button" onClick={onClose}>
                  Done
                </button>
              </>
            ) : (
              <>
                <button type="button" className="secondary-button" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={answers.some((a) => a < 0)}
                >
                  <Check size={15} /> Submit Answers
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
