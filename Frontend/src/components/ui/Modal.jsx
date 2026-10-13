import { X } from "lucide-react";
import { useEffect } from "react";

const Modal = ({ title, children, footer, onClose, maxWidth = "max-w-2xl" }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-wine/55 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`max-h-[90vh] w-full ${maxWidth} overflow-hidden rounded-lg bg-cream shadow-2xl`}>
        <div className="flex items-center justify-between gap-4 border-b border-[#e7d8cf] bg-white px-5 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <button type="button" className="rounded-md p-2 text-muted transition hover:bg-ivory hover:text-burgundy" onClick={onClose} aria-label="Close modal">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-132px)] overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-[#e7d8cf] bg-white px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
};

export default Modal;
