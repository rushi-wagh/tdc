import { ArrowLeft, BriefcaseBusiness, Heart, Home, UserRound } from "lucide-react";
import StatusBadge from "../ui/StatusBadge.jsx";
import StateMessage from "../ui/StateMessage.jsx";
import { formatCurrency, formatDate, formatValue } from "../../utils/formatters.js";

const sections = [
  {
    title: "Personal Details",
    icon: UserRound,
    fields: [
      ["First Name", "firstName"],
      ["Last Name", "lastName"],
      ["Gender", "gender"],
      ["Date of Birth", "dateOfBirth", formatDate],
      ["Age", "age"],
      ["Height", "height", (value) => (value ? `${value} cm` : formatValue(value))],
      ["Email", "email"],
      ["Phone Number", "phoneNumber"],
    ],
  },
  {
    title: "Location",
    icon: Home,
    fields: [
      ["Country", "country"],
      ["City", "city"],
      ["Open to Relocate", "openToRelocate"],
    ],
  },
  {
    title: "Education & Career",
    icon: BriefcaseBusiness,
    fields: [
      ["Undergraduate College", "undergraduateCollege"],
      ["Degree", "degree"],
      ["Income", "income", formatCurrency],
      ["Current Company", "currentCompany"],
      ["Designation", "designation"],
    ],
  },
  {
    title: "Family & Background",
    icon: Heart,
    fields: [
      ["Marital Status", "maritalStatus"],
      ["Languages Known", "languagesKnown"],
      ["Siblings", "siblings"],
      ["Caste", "caste"],
      ["Religion", "religion"],
    ],
  },
  {
    title: "Lifestyle & Preferences",
    icon: Heart,
    fields: [
      ["Want Kids", "wantKids"],
      ["Open to Pets", "openToPets"],
      ["Food Habits", "foodHabits"],
      ["Smoking Habits", "smokingHabits"],
      ["Alcohol Habits", "alcoholHabits"],
      ["Interests", "interests"],
      ["Hobbies", "hobbies"],
    ],
  },
];

const ProfileDetails = ({ profile, isLoading, error, onBack }) => {
  if (isLoading) {
    return <StateMessage type="loading" title="Loading profile" description="Fetching the latest biodata for this assigned customer." />;
  }

  if (error) {
    return <StateMessage type="error" title="Unable to load profile" description={error} action={<button className="btn-secondary" onClick={onBack}>Back to profiles</button>} />;
  }

  if (!profile) {
    return <StateMessage title="Select a profile" description="Choose a customer from My Profiles to review biodata, notes, and recommendations." />;
  }

  const hasJourneyStage = Object.prototype.hasOwnProperty.call(profile, "journeyStage");

  return (
    <section className="space-y-5">
      <div className="surface px-5 py-5">
        <button type="button" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-burgundy hover:text-wine" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to profiles
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gold">{formatValue(profile.profileId)}</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">
              {[profile.firstName, profile.lastName].filter(Boolean).join(" ") || formatValue(profile.name)}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {formatValue(profile.age)} years · {formatValue(profile.city)} · {formatValue(profile.maritalStatus)}
            </p>
          </div>
          {hasJourneyStage ? <StatusBadge value={profile.journeyStage} /> : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <article key={section.title} className="surface px-5 py-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blush text-burgundy">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-ink">{section.title}</h3>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {section.fields.map(([label, key, formatter]) => (
                  <div key={key} className="rounded-md border border-[#eadbd1] bg-cream/60 px-3 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-ink">{formatter ? formatter(profile[key]) : formatValue(profile[key])}</dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ProfileDetails;
