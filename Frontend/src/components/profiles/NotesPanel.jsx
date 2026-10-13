import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { createProfileNote, getProfileNotes } from "../../services/profileService.js";
import { formatDateTime } from "../../utils/formatters.js";
import Badge from "../ui/Badge.jsx";
import StateMessage from "../ui/StateMessage.jsx";

const maxLength = 2000;

const NotesPanel = ({ profileId }) => {
  const [notes, setNotes] = useState([]);
  const [noteType, setNoteType] = useState("CALL");
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!profileId) {
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    setError("");

    getProfileNotes(profileId)
      .then((data) => {
        if (isCurrent) {
          setNotes([...data].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)));
        }
      })
      .catch((apiError) => {
        if (isCurrent) {
          setError(apiError.message || "Unable to load notes.");
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [profileId]);

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!text.trim()) {
      setError("Add a note before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const savedNote = await createProfileNote(profileId, { text: text.trim(), noteType });
      setNotes((current) => [savedNote, ...current]);
      setText("");
      setSuccess("Note saved.");
    } catch (apiError) {
      setError(apiError.message || "Unable to save note.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="surface px-5 py-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-ink">Call & Meeting Notes</h3>
        <p className="mt-1 text-sm text-muted">Chronological conversation record only. Notes do not change preferences or scoring.</p>
      </div>

      <form className="space-y-3" onSubmit={handleSave}>
        <div className="flex flex-wrap gap-2">
          {["CALL", "MEETING"].map((type) => (
            <button
              key={type}
              type="button"
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                noteType === type ? "border-burgundy bg-blush text-burgundy" : "border-[#dcc9bf] bg-white text-muted hover:border-gold hover:text-burgundy"
              }`}
              onClick={() => setNoteType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="note-text">
            Note
          </label>
          <textarea
            id="note-text"
            className="field min-h-28 resize-y"
            value={text}
            maxLength={maxLength}
            onChange={(event) => setText(event.target.value)}
            placeholder="Capture call context, next steps, or meeting outcomes."
          />
          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted">
            <span>{text.length}/{maxLength}</span>
            {success ? <span className="text-emerald-700">{success}</span> : null}
          </div>
        </div>

        {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          Save note
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {isLoading ? <StateMessage type="loading" title="Loading notes" /> : null}
        {!isLoading && notes.length === 0 ? <StateMessage title="No notes yet" description="Saved calls and meetings will appear here newest first." /> : null}
        {!isLoading &&
          notes.map((note, index) => (
            <article key={`${note.createdAt}-${index}`} className="rounded-lg border border-[#eadbd1] bg-cream/60 px-4 py-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={note.noteType === "MEETING" ? "gold" : "burgundy"}>{note.noteType}</Badge>
                <span className="text-xs text-muted">{formatDateTime(note.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-ink">{note.text}</p>
              <p className="mt-2 text-xs text-muted">By {note.author?.name || note.author?.email || "Not available"}</p>
            </article>
          ))}
      </div>
    </section>
  );
};

export default NotesPanel;
