import { useMemo, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  Edit3,
  FileText,
  Filter,
  List,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  selectNotes,
  useNotesStore,
  type Note,
  type NoteDraft,
  type NoteSortKey,
} from './store/notesStore'
import { useDashboardStore } from './store/dashboardStore'

type StudyMaterialsProps = { onFeedback: (message: string) => void }

const emptyDraft: NoteDraft = { title: '', subject: '', topic: '', content: '' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function preview(content: string) {
  return content.replace(/[#*_`>-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150)
}

function NoteContent({ content }: { content: string }) {
  const blocks = content.split('\n').map((line) => line.trim()).filter(Boolean)
  return <div className="note-reader-content">{blocks.map((line, index) => {
    if (line.startsWith('### ')) return <h4 key={`${line}-${index}`}>{line.slice(4)}</h4>
    if (line.startsWith('## ')) return <h3 key={`${line}-${index}`}>{line.slice(3)}</h3>
    if (line.startsWith('# ')) return <h2 key={`${line}-${index}`}>{line.slice(2)}</h2>
    if (line.startsWith('- ')) return <li key={`${line}-${index}`}>{line.slice(2)}</li>
    return <p key={`${line}-${index}`}>{line}</p>
  })}</div>
}

export default function StudyMaterialsPage({ onFeedback }: StudyMaterialsProps) {
  const notes = useNotesStore((state) => state.notes)
  const isDemoData = useNotesStore((state) => state.isDemoData)
  const addNote = useNotesStore((state) => state.addNote)
  const updateNote = useNotesStore((state) => state.updateNote)
  const deleteNote = useNotesStore((state) => state.deleteNote)
  const markNoteRead = useNotesStore((state) => state.markNoteRead)
  const addActivity = useDashboardStore((state) => state.addActivity)
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [sortKey, setSortKey] = useState<NoteSortKey>('updatedAt')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<NoteDraft>(emptyDraft)
  const [formError, setFormError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const subjects = useMemo(() => [...new Set(notes.map((note) => note.subject))].sort(), [notes])
  const filteredNotes = useMemo(() => selectNotes(notes, { query, subject, sortKey, sortDirection: 'desc' }), [notes, query, subject, sortKey])
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

  const submitNote = (event: React.FormEvent<HTMLFormElement>) => {
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
    return <NoteReader note={selectedNote} onBack={() => setSelectedId(null)} onEdit={() => openEdit(selectedNote)} onDelete={() => setDeleteId(selectedNote.id)} />
  }

  return <>
    <section className="page-heading materials-heading">
      <div><p className="eyebrow">Knowledge library <span className="eyebrow-dot" /> {notes.length} materials</p><h1>Study materials</h1><p className="heading-copy">Capture ideas, build context, and return to what matters.</p></div>
      <button className="primary-button" onClick={openCreate}><Plus size={17} /> New note</button>
    </section>
    {isDemoData && <div className="demo-notice" role="note"><FileText size={14} /> Example notes — add your own to make this library yours.</div>}
    <section className="materials-toolbar" aria-label="Study material filters">
      <label className="materials-search"><Search size={16} /><span className="sr-only">Search study materials</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes, subjects, topics..." /></label>
      <label className="select-control"><Filter size={14} /><span className="sr-only">Filter by subject</span><select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="">All subjects</option>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="select-control"><CalendarDays size={14} /><span className="sr-only">Sort materials</span><select value={sortKey} onChange={(event) => setSortKey(event.target.value as NoteSortKey)}><option value="updatedAt">Recently updated</option><option value="createdAt">Recently created</option><option value="title">Title A–Z</option></select></label>
      <div className="view-toggle" aria-label="Material layout"><button className={viewMode === 'grid' ? 'view-active' : ''} onClick={() => setViewMode('grid')} aria-label="Grid view"><FileText size={16} /></button><button className={viewMode === 'list' ? 'view-active' : ''} onClick={() => setViewMode('list')} aria-label="List view"><List size={16} /></button></div>
    </section>
    {filteredNotes.length === 0 ? <MaterialsEmpty hasNotes={notes.length > 0} onCreate={openCreate} onClear={() => { setQuery(''); setSubject('') }} /> : <section className={`materials-grid ${viewMode === 'list' ? 'materials-list-view' : ''}`} aria-label="Study materials list">{filteredNotes.map((note) => <NoteCard key={note.id} note={note} onOpen={() => openReader(note)} onEdit={() => openEdit(note)} onDelete={() => setDeleteId(note.id)} />)}</section>}
    {editorOpen && <NoteEditor draft={draft} editing={Boolean(editingId)} error={formError} onChange={setDraft} onSubmit={submitNote} onClose={() => setEditorOpen(false)} />}
    {pendingDelete && <DeleteDialog note={pendingDelete} onCancel={() => setDeleteId(null)} onConfirm={confirmDelete} />}
  </>
}

function NoteCard({ note, onOpen, onEdit, onDelete }: { note: Note; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  return <article className={`note-card ${note.isRead ? '' : 'note-card-unread'}`}><button className="note-card-main" onClick={onOpen}><div className="note-card-top"><span className="subject-pill">{note.subject}</span>{!note.isRead && <span className="unread-dot">New</span>}</div><h2>{note.title}</h2><p className="note-topic">{note.topic}</p><p className="note-preview">{preview(note.content)}</p><span className="note-date">Updated {formatDate(note.updatedAt)}</span></button><div className="note-card-actions"><button onClick={onEdit} aria-label={`Edit ${note.title}`}><Edit3 size={14} /></button><button onClick={onDelete} aria-label={`Delete ${note.title}`}><Trash2 size={14} /></button></div></article>
}

function NoteReader({ note, onBack, onEdit, onDelete }: { note: Note; onBack: () => void; onEdit: () => void; onDelete: () => void }) {
  return <section className="note-reader"><button className="back-button" onClick={onBack}><ChevronLeft size={16} /> Back to materials</button><div className="reader-header"><div><span className="subject-pill">{note.subject}</span><p className="reader-topic">{note.topic}</p><h1>{note.title}</h1><p className="reader-meta">Created {formatDate(note.createdAt)} · Updated {formatDate(note.updatedAt)}</p></div><div className="reader-actions"><button className="secondary-button" onClick={onEdit}><Edit3 size={15} /> Edit</button><button className="danger-button" onClick={onDelete}><Trash2 size={15} /> Delete</button></div></div><div className="reader-paper"><NoteContent content={note.content} /></div></section>
}

function MaterialsEmpty({ hasNotes, onCreate, onClear }: { hasNotes: boolean; onCreate: () => void; onClear: () => void }) {
  return <div className="materials-empty" role="status"><div className="empty-state-icon"><BookOpen size={19} /></div><h2>{hasNotes ? 'No notes match your search' : 'Your library is ready for its first idea'}</h2><p>{hasNotes ? 'Try another search or clear the subject filter.' : 'Create a note to collect class concepts, reading summaries, and your own questions.'}</p><button className="primary-button" onClick={hasNotes ? onClear : onCreate}>{hasNotes ? 'Clear filters' : 'Create your first note'}</button></div>
}

function NoteEditor({ draft, editing, error, onChange, onSubmit, onClose }: { draft: NoteDraft; editing: boolean; error: string; onChange: (draft: NoteDraft) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  return <div className="modal-backdrop"><section className="note-editor" role="dialog" aria-modal="true" aria-labelledby="note-editor-title"><div className="modal-heading"><div><p className="section-kicker">{editing ? 'Refine a note' : 'New study material'}</p><h2 id="note-editor-title">{editing ? 'Edit note' : 'Add a note'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close note editor"><X size={18} /></button></div><form onSubmit={onSubmit}><div className="form-grid"><label>Title<input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="e.g. Photosynthesis review" /></label><label>Subject<input value={draft.subject} onChange={(event) => onChange({ ...draft, subject: event.target.value })} placeholder="e.g. Biology" /></label><label>Topic<input value={draft.topic} onChange={(event) => onChange({ ...draft, topic: event.target.value })} placeholder="e.g. Plant energy" /></label></div><label>Content<textarea value={draft.content} onChange={(event) => onChange({ ...draft, content: event.target.value })} placeholder={'Write your note...\n\nUse #, ##, and - for lightweight formatting.'} rows={10} /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={15} /> {editing ? 'Save changes' : 'Add note'}</button></div></form></section></div>
}

function DeleteDialog({ note, onCancel, onConfirm }: { note: Note; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop"><section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-note-title"><div className="delete-icon"><Trash2 size={18} /></div><h2 id="delete-note-title">Delete this note?</h2><p><strong>{note.title}</strong> will be removed from this device. This cannot be undone.</p><div className="modal-actions"><button className="secondary-button" onClick={onCancel}>Keep note</button><button className="danger-button" onClick={onConfirm}>Delete note</button></div></section></div>
}
