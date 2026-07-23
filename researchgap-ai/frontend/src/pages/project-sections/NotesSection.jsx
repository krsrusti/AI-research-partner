import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { useProjectContext } from "../ProjectWorkspace";

export default function NotesSection() {
  const { papers } = useProjectContext();
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [notes, setNotes] = useState(null); // null = not loaded / no paper selected
  const [highlightedText, setHighlightedText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const loadNotes = useCallback(async (paperId) => {
    if (!paperId) {
      setNotes(null);
      return;
    }
    try {
      const data = await api.get(`/notes/${paperId}`);
      setNotes(data);
    } catch (err) {
      setError(err.message || "Couldn't load notes.");
    }
  }, []);

  useEffect(() => {
    loadNotes(selectedPaperId);
  }, [selectedPaperId, loadNotes]);

  async function handleAddNote(e) {
    e.preventDefault();
    if (!highlightedText.trim() || !selectedPaperId) return;

    setSaving(true);
    setError(null);
    try {
      await api.post("/notes", {
        paper_id: selectedPaperId,
        highlighted_text: highlightedText.trim(),
        note_text: noteText.trim() || null,
      });
      setHighlightedText("");
      setNoteText("");
      await loadNotes(selectedPaperId);
    } catch (err) {
      setError(err.message || "Couldn't save that note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId) {
    if (!window.confirm("Delete this note?")) return;
    try {
      await api.delete(`/notes/${noteId}`);
      await loadNotes(selectedPaperId);
    } catch (err) {
      setError(err.message || "Couldn't delete that note.");
    }
  }

  function startEdit(note) {
    setEditingId(note.id);
    setEditText(note.note_text || "");
  }

  async function saveEdit(noteId) {
    try {
      await api.put(`/notes/${noteId}`, { note_text: editText });
      setEditingId(null);
      await loadNotes(selectedPaperId);
    } catch (err) {
      setError(err.message || "Couldn't update that note.");
    }
  }

  if (papers !== null && papers.length === 0) {
    return (
      <section>
        <p className="font-mono text-xs tracking-[0.2em] text-cork">NOTES</p>
        <p className="mt-4 font-body text-sm text-fog">
          Upload a paper first, then come back here to take notes on it.
        </p>
      </section>
    );
  }

  return (
    <section>
      <p className="font-mono text-xs tracking-[0.2em] text-cork">NOTES</p>

      <select
        value={selectedPaperId}
        onChange={(e) => setSelectedPaperId(e.target.value)}
        className="mt-4 w-full border border-ink/25 bg-manila px-3 py-2.5 font-body text-ink outline-none focus:border-steel"
      >
        <option value="">Select a paper...</option>
        {papers?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>

      {error && (
        <p role="alert" className="mt-4 font-mono text-xs text-evidence">
          {error}
        </p>
      )}

      {selectedPaperId && (
        <>
          <form onSubmit={handleAddNote} className="mt-6 space-y-3 border border-ink/10 p-4">
            <div>
              <label className="block font-mono text-[11px] tracking-wide text-fog">
                HIGHLIGHTED TEXT
              </label>
              <textarea
                value={highlightedText}
                onChange={(e) => setHighlightedText(e.target.value)}
                rows={2}
                placeholder="Paste or type the passage you're noting..."
                className="mt-1.5 w-full border border-ink/25 bg-manila px-3 py-2 font-body text-sm text-ink outline-none focus:border-steel"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] tracking-wide text-fog">NOTE</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
                placeholder="Your note about it..."
                className="mt-1.5 w-full border border-ink/25 bg-manila px-3 py-2 font-body text-sm text-ink outline-none focus:border-steel"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !highlightedText.trim()}
              className="bg-evidence px-4 py-2 font-mono text-xs tracking-wide text-manila transition-colors hover:bg-evidence/90 disabled:opacity-50"
            >
              {saving ? "SAVING..." : "+ ADD NOTE"}
            </button>
          </form>

          <div className="mt-6">
            {notes !== null && notes.length === 0 && (
              <p className="font-body text-sm text-fog">No notes on this paper yet.</p>
            )}

            {notes !== null && notes.length > 0 && (
              <ul className="space-y-3">
                {notes.map((note) => (
                  <li key={note.id} className="border border-cork/40 bg-cork/[0.06] p-4">
                    <p className="font-body text-sm italic text-ink/70">
                      &ldquo;{note.highlighted_text}&rdquo;
                    </p>

                    {editingId === note.id ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 border border-ink/25 bg-manila px-2 py-1 font-body text-sm text-ink outline-none focus:border-steel"
                        />
                        <button
                          onClick={() => saveEdit(note.id)}
                          className="font-mono text-xs text-steel hover:underline"
                        >
                          SAVE
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="font-mono text-xs text-fog hover:underline"
                        >
                          CANCEL
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-start justify-between gap-3">
                        <p className="font-body text-sm text-ink">{note.note_text}</p>
                        <div className="flex flex-shrink-0 gap-3">
                          <button
                            onClick={() => startEdit(note)}
                            className="font-mono text-xs text-fog hover:text-steel"
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="font-mono text-xs text-fog hover:text-evidence"
                            aria-label={`Delete note: ${note.highlighted_text}`}
                          >
                            DELETE
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}