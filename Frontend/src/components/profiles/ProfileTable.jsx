import { ArrowUpDown, Eye } from "lucide-react";
import { formatDate, formatValue } from "../../utils/formatters.js";

const ProfileTable = ({
  profiles,
  selectedProfileId,
  onSelect,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  const hasApiField = (field) =>
    profiles.some((profile) =>
      Object.prototype.hasOwnProperty.call(profile, field)
    );

  const showLastUpdated = hasApiField("lastUpdated");

  const handleSort = (field) => {
    const nextOrder =
      sortBy === field && sortOrder === "asc" ? "desc" : "asc";
    onSortChange(field, nextOrder);
  };

  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#eadbd1] text-left text-sm">
          <thead className="bg-ivory text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Profile ID</th>
              <th className="px-4 py-3 font-semibold">Age</th>
              <th className="px-4 py-3 font-semibold">Gender</th>
              <th className="px-4 py-3 font-semibold">City</th>
              <th className="px-4 py-3 font-semibold">Marital Status</th>

              {showLastUpdated ? (
                <th className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-burgundy"
                    onClick={() => handleSort("lastUpdated")}
                  >
                    Last Updated
                    <ArrowUpDown
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  </button>
                </th>
              ) : null}

              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#eadbd1] bg-white">
            {profiles.map((profile) => {
              const selected =
                selectedProfileId === profile.profileId;

              return (
                <tr
                  key={profile.profileId}
                  className={
                    selected
                      ? "bg-blush/35"
                      : "hover:bg-ivory/60"
                  }
                >
                  <td className="px-4 py-4 font-semibold text-ink">
                    {formatValue(profile.name)}
                  </td>

                  <td className="px-4 py-4 text-muted">
                    {formatValue(profile.profileId)}
                  </td>

                  <td className="px-4 py-4 text-muted">
                    {formatValue(profile.age)}
                  </td>

                  <td className="px-4 py-4 text-muted">
                    {formatValue(profile.gender)}
                  </td>

                  <td className="px-4 py-4 text-muted">
                    {formatValue(profile.city)}
                  </td>

                  <td className="px-4 py-4 text-muted">
                    {formatValue(profile.maritalStatus)}
                  </td>

                  {showLastUpdated ? (
                    <td className="px-4 py-4 text-muted">
                      {formatDate(profile.lastUpdated)}
                    </td>
                  ) : null}

                  <td className="px-4 py-4">
                    <button
                      type="button"
                      className="btn-secondary px-3 py-2"
                      onClick={() => onSelect(profile)}
                    >
                      <Eye
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfileTable;
