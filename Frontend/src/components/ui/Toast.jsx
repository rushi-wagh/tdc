import { CheckCircle2, X } from "lucide-react";

const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm text-ink shadow-soft" role="status">
    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" aria-hidden="true" />
    <p className="flex-1">{message}</p>
    <button type="button" className="rounded p-1 text-muted hover:bg-ivory hover:text-ink" onClick={onClose} aria-label="Dismiss notification">
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
);

export default Toast;
