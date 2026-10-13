import { Filter, Loader2, RefreshCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProfileDetails from "../components/profiles/ProfileDetails.jsx";
import NotesPanel from "../components/profiles/NotesPanel.jsx";
import ProfileTable from "../components/profiles/ProfileTable.jsx";
import RecommendationsPanel from "../components/profiles/RecommendationsPanel.jsx";
import StateMessage from "../components/ui/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getDashboardProfiles, getProfileDetails } from "../services/profileService.js";
import { sortOptions } from "../utils/constants.js";

const initialFilters = {
  search: "",
  gender: "",
  maritalStatus: "",
  
  sortBy: "name",
  sortOrder: "asc",
  page: 1,
  limit: 10,
};

const ProfilesPage = () => {
  const { logout } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [profiles, setProfiles] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState("");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [view, setView] = useState("list");

  const queryFilters = useMemo(() => filters, [filters]);
  const hasApiField = (field) => profiles.some((profile) => Object.prototype.hasOwnProperty.call(profile, field));
  const fieldOptions = (field) => {
    const options = [...new Set(profiles.map((profile) => profile[field]).filter(Boolean))];
    if (filters[field] && !options.includes(filters[field])) {
      options.unshift(filters[field]);
    }
    return options;
  };
  const genderOptions = fieldOptions("gender");
  const maritalStatusOptions = fieldOptions("maritalStatus");
  // const journeyStageOptions = fieldOptions("journeyStage");
  // const showJourneyFilter = hasApiField("journeyStage") || Boolean(filters.journeyStage);

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingList(true);
    setListError("");

    getDashboardProfiles(queryFilters)
      .then((data) => {
        if (isCurrent) {
          setProfiles(data.profiles);
          setPagination(data.pagination);
        }
      })
      .catch((apiError) => {
        if (isCurrent) {
          if (apiError.status === 401) {
            logout();
          }
          setListError(apiError.message || "Unable to load profiles.");
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingList(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [queryFilters, logout]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));
  };

  const handleSelectProfile = async (profile) => {
    setSelectedSummary(profile);
    setSelectedProfile(null);
    setDetailsError("");
    setView("detail");
    setIsLoadingDetails(true);

    try {
      const details = await getProfileDetails(profile.profileId);
      setSelectedProfile({
        ...profile,
        ...details,
        name: [details.firstName, details.lastName].filter(Boolean).join(" ") || profile.name,
      });
    } catch (apiError) {
      if (apiError.status === 401) {
        logout();
      }
      setDetailsError(apiError.message || "Unable to load profile details.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleRefresh = () => {
    setFilters((current) => ({ ...current }));
  };

  const showingDetails = view === "detail";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Matchmaker workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">My Profiles</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Review assigned customers, keep call notes, and evaluate backend-generated recommendations.
          </p>
        </div>
        <button type="button" className="btn-secondary self-start lg:self-auto" onClick={handleRefresh}>
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </header>

      {!showingDetails ? (
        <>
          <section className="surface px-5 py-5">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5 text-burgundy" aria-hidden="true" />
              <h2 className="text-base font-semibold text-ink">Find assigned profiles</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.7fr]">
              <div>
                <label className="label" htmlFor="search">
                  Search
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    id="search"
                    className="field pl-9"
                    value={filters.search}
                    onChange={(event) => updateFilter("search", event.target.value)}
                    placeholder="Customer name or profile ID"
                  />
                </div>
              </div>

              <SelectField label="Gender" value={filters.gender} onChange={(value) => updateFilter("gender", value)} options={genderOptions} />
              <SelectField label="Marital Status" value={filters.maritalStatus} onChange={(value) => updateFilter("maritalStatus", value)} options={maritalStatusOptions} />
              {/* {showJourneyFilter ? (
                <SelectField label="Journey Stage" value={filters.journeyStage} onChange={(value) => updateFilter("journeyStage", value)} options={journeyStageOptions} />
              ) : null} */}
              <SelectField
                label="Sort"
                value={`${filters.sortBy}:${filters.sortOrder}`}
                onChange={(value) => {
                  const [sortBy, sortOrder] = value.split(":");
                  setFilters((current) => ({ ...current, sortBy, sortOrder, page: 1 }));
                }}
                options={sortOptions}
              />
            </div>
          </section>

          {isLoadingList ? <StateMessage type="loading" title="Loading assigned profiles" /> : null}
          {!isLoadingList && listError ? <StateMessage type="error" title="Unable to load profiles" description={listError} /> : null}
          {!isLoadingList && !listError && profiles.length === 0 ? (
            <StateMessage title="No assigned profiles found" description="Try adjusting the search or filters. The backend only returns profiles assigned to the current matchmaker." />
          ) : null}
          {!isLoadingList && !listError && profiles.length ? (
            <>
              <ProfileTable
                profiles={profiles}
                selectedProfileId={selectedSummary?.profileId}
                onSelect={handleSelectProfile}
                sortBy={filters.sortBy}
                sortOrder={filters.sortOrder}
                onSortChange={(sortBy, sortOrder) => setFilters((current) => ({ ...current, sortBy, sortOrder, page: 1 }))}
              />
              <Pagination pagination={pagination} onPageChange={(page) => updateFilter("page", page)} isLoading={isLoadingList} />
            </>
          ) : null}
        </>
      ) : (
        <div className="space-y-5">
          <ProfileDetails profile={selectedProfile} isLoading={isLoadingDetails} error={detailsError} onBack={() => setView("list")} />
          {selectedProfile && !detailsError ? (
            <div className="grid gap-5 2xl:grid-cols-[0.95fr_1.05fr]">
              <NotesPanel profileId={selectedProfile.profileId} />
              <RecommendationsPanel profile={selectedProfile} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

const SelectField = ({ label, value, onChange, options }) => (
  <div>
    <label className="label">{label}</label>
    <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">All</option>
      {options.map((option) => {
        const labelValue = typeof option === "string" ? option : option.label;
        const optionValue = typeof option === "string" ? option : option.value;
        return (
          <option key={optionValue} value={optionValue}>
            {labelValue}
          </option>
        );
      })}
    </select>
  </div>
);

const Pagination = ({ pagination, onPageChange, isLoading }) => {
  if (!pagination) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#eadbd1] bg-white px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>
        Page {pagination.page} of {Math.max(pagination.totalPages, 1)} · {pagination.totalItems} profiles
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary px-3 py-2" disabled={!pagination.hasPreviousPage || isLoading} onClick={() => onPageChange(pagination.page - 1)}>
          Previous
        </button>
        <button type="button" className="btn-secondary px-3 py-2" disabled={!pagination.hasNextPage || isLoading} onClick={() => onPageChange(pagination.page + 1)}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Next
        </button>
      </div>
    </div>
  );
};

export default ProfilesPage;
