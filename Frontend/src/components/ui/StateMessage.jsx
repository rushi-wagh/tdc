import { AlertCircle, Loader2, SearchX } from "lucide-react";

const iconMap = {
  empty: SearchX,
  error: AlertCircle,
  loading: Loader2,
};

const StateMessage = ({ title, description, type = "empty", action }) => {
  const Icon = iconMap[type] || SearchX;

  return (
    <div className="surface flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blush text-burgundy">
        <Icon className={`h-6 w-6 ${type === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
};

export default StateMessage;
