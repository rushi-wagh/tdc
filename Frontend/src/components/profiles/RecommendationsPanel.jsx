import { Brain, Loader2, MailCheck, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCandidateExplanation, getSuggestions } from "../../services/matchService.js";
import { formatValue, sentenceCase } from "../../utils/formatters.js";
import Badge from "../ui/Badge.jsx";
import Modal from "../ui/Modal.jsx";
import StateMessage from "../ui/StateMessage.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import Toast from "../ui/Toast.jsx";

const RecommendationCard = ({ recommendation, profile, onExplain, onSend, explaining }) => (
  <article className="rounded-lg border border-[#eadbd1] bg-white px-4 py-4 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-lg font-semibold text-ink">{formatValue(recommendation.name)}</h4>
          <StatusBadge value={recommendation.matchQuality} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {formatValue(recommendation.profileId)} · {formatValue(recommendation.age)} years · {formatValue(recommendation.city)} · {formatValue(recommendation.maritalStatus)}
        </p>
      </div>
      <div className="rounded-lg border border-gold/20 bg-gold/10 px-4 py-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7a5521]">Compatibility</p>
        <p className="text-2xl font-semibold text-burgundy">{formatValue(recommendation.score)}%</p>
      </div>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Object.entries(recommendation.scoreBreakdown || {}).map(([factor, detail]) => (
        <div key={factor} className="rounded-md border border-[#eadbd1] bg-cream/60 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{sentenceCase(factor)}</p>
          <p className="mt-1 text-sm font-semibold text-ink">{detail.score}% · Weight {detail.weight}%</p>
          <div className="mt-2 h-2 rounded-full bg-ivory">
            <div className="h-full rounded-full bg-burgundy" style={{ width: `${Math.max(0, Math.min(detail.score || 0, 100))}%` }} />
          </div>
        </div>
      ))}
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <ListBlock title="Compatibility factors" items={recommendation.explanations} empty="No explicit compatibility notes returned." />
      <ListBlock title="Confirmed trade-offs" items={recommendation.negativeExplanations} empty="No confirmed trade-offs returned." />
      <ListBlock title="Missing information" items={recommendation.missingInformation} empty="No missing information reported." neutral />
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" className="btn-secondary" onClick={() => onExplain(recommendation)} disabled={explaining}>
        {explaining ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Brain className="h-4 w-4" aria-hidden="true" />}
        Explain This Match
      </button>
      <button type="button" className="btn-primary" onClick={() => onSend(profile, recommendation)}>
        <Send className="h-4 w-4" aria-hidden="true" />
        Send Match
      </button>
    </div>
  </article>
);

const ListBlock = ({ title, items = [], empty, neutral = false }) => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
    {items.length ? (
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-md border border-[#eadbd1] bg-cream/70 px-3 py-2 text-sm leading-5 text-ink">
            {neutral ? <span className="font-semibold text-muted">Unknown: </span> : null}
            {item}
          </li>
        ))}
      </ul>
    ) : (
      <p className="rounded-md border border-[#eadbd1] bg-cream/70 px-3 py-2 text-sm text-muted">{empty}</p>
    )}
  </div>
);

const ExplanationModal = ({ result, recommendation, onClose }) => {
  const explanation = result?.explanation;
  const unavailable = result && result.available === false;

  return (
    <Modal title={`AI-generated explanation: ${recommendation.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-md border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-[#6c4d22]">
          This explanation supports human review of an existing recommendation. It does not determine eligibility, ranking, or score.
        </div>

        {unavailable ? (
          <StateMessage
            type="error"
            title="Explanation unavailable"
            description={`The recommendation and score are still available. AI returned: ${result.reason || "unavailable"}.`}
          />
        ) : null}

        {explanation ? (
          <>
            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink">Summary</h4>
              <p className="rounded-md border border-[#eadbd1] bg-white px-4 py-3 text-sm leading-6 text-ink">{explanation.summary}</p>
            </section>
            <ListBlock title="Compatibility points" items={explanation.compatibilityPoints} empty="No compatibility points returned." />
            <ListBlock title="Discussion points" items={explanation.discussionPoints} empty="No discussion points returned." />
            <ListBlock title="Missing information" items={explanation.missingInformation} empty="No missing information returned." neutral />
          </>
        ) : null}
      </div>
    </Modal>
  );
};

const SendMatchModal = ({ payload, onClose, onConfirm, isSending }) => (
  <Modal
    title="Send match preview"
    onClose={onClose}
    footer={
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSending}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={onConfirm} disabled={isSending}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MailCheck className="h-4 w-4" aria-hidden="true" />}
          Confirm mock send
        </button>
      </div>
    }
  >
    <div className="space-y-4">
      <p className="rounded-md border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-[#6c4d22]">
        This is a demo interaction only. No real email or message will be delivered.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <PreviewPerson title="Customer" person={payload.profile} />
        <PreviewPerson title="Candidate" person={payload.recommendation} />
      </div>
    </div>
  </Modal>
);

const PreviewPerson = ({ title, person }) => (
  <div className="rounded-lg border border-[#eadbd1] bg-white px-4 py-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
    <h4 className="mt-1 text-base font-semibold text-ink">{formatValue(person.name || [person.firstName, person.lastName].filter(Boolean).join(" "))}</h4>
    <p className="mt-1 text-sm text-muted">
      {formatValue(person.profileId)} · {formatValue(person.age)} years · {formatValue(person.city)}
    </p>
  </div>
);

const RecommendationsPanel = ({ profile }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [explanations, setExplanations] = useState({});
  const [activeExplanation, setActiveExplanation] = useState(null);
  const [explainingProfileId, setExplainingProfileId] = useState("");
  const [sendPayload, setSendPayload] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!profile?.profileId) {
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    setError("");
    setRecommendations([]);

    getSuggestions(profile.profileId, { limit: 10 })
      .then((data) => {
        if (isCurrent) {
          setRecommendations(data.recommendations);
          setMeta(data.meta);
        }
      })
      .catch((apiError) => {
        if (isCurrent) {
          setError(apiError.message || "Unable to load recommendations.");
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
  }, [profile?.profileId]);

  const explanationCacheKey = useMemo(() => (activeExplanation ? `${profile.profileId}:${activeExplanation.profileId}` : ""), [activeExplanation, profile?.profileId]);

  const handleExplain = async (recommendation) => {
    const key = `${profile.profileId}:${recommendation.profileId}`;

    if (explanations[key]) {
      setActiveExplanation(recommendation);
      return;
    }

    setExplainingProfileId(recommendation.profileId);
    try {
      const result = await getCandidateExplanation(profile.profileId, recommendation.profileId);
      setExplanations((current) => ({ ...current, [key]: result }));
      setActiveExplanation(recommendation);
    } catch (apiError) {
      setExplanations((current) => ({
        ...current,
        [key]: { available: false, reason: apiError.message || "REQUEST_FAILED" },
      }));
      setActiveExplanation(recommendation);
    } finally {
      setExplainingProfileId("");
    }
  };

  const handleConfirmSend = () => {
    setIsSending(true);
    window.setTimeout(() => {
      setIsSending(false);
      setToast(`Mock send prepared for ${sendPayload.recommendation.name}. No real email was delivered.`);
      setSendPayload(null);
    }, 650);
  };

  return (
    <section className="surface px-5 py-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">Match Recommendations</h3>
          <p className="mt-1 text-sm text-muted">Scores and ranking come directly from the backend recommendation engine.</p>
        </div>
        {meta ? <Badge variant="gold">{meta.qualifyingRecommendationCount} qualifying</Badge> : null}
      </div>

      {isLoading ? <StateMessage type="loading" title="Loading recommendations" /> : null}
      {!isLoading && error ? <StateMessage type="error" title="Unable to load recommendations" description={error} /> : null}
      {!isLoading && !error && recommendations.length === 0 ? (
        <StateMessage title="No recommendations yet" description="No eligible candidate met the backend thresholds for this profile." />
      ) : null}

      {!isLoading && !error && recommendations.length ? (
        <div className="space-y-4">
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.profileId}
              recommendation={recommendation}
              profile={profile}
              onExplain={handleExplain}
              onSend={(selectedProfile, selectedRecommendation) => setSendPayload({ profile: selectedProfile, recommendation: selectedRecommendation })}
              explaining={explainingProfileId === recommendation.profileId}
            />
          ))}
        </div>
      ) : null}

      {activeExplanation ? (
        <ExplanationModal
          recommendation={activeExplanation}
          result={explanations[explanationCacheKey]}
          onClose={() => setActiveExplanation(null)}
        />
      ) : null}

      {sendPayload ? <SendMatchModal payload={sendPayload} onClose={() => setSendPayload(null)} onConfirm={handleConfirmSend} isSending={isSending} /> : null}
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </section>
  );
};

export default RecommendationsPanel;
