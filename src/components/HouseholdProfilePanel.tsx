import type {
  CommuteMode,
  CookingFuel,
  HeatingFuel,
  HomeType,
  HouseholdProfile,
  PurifierAccess,
  SensitiveGroup,
} from '../domain/types';

interface HouseholdProfilePanelProps {
  profile: HouseholdProfile;
  onChange: (next: HouseholdProfile) => void;
  compact?: boolean;
}

const SENSITIVE_OPTIONS: Array<{ id: SensitiveGroup; label: string }> = [
  { id: 'seniors', label: 'Senior citizens (60+ years)' },
  { id: 'children', label: 'Children & school kids' },
  { id: 'asthma', label: 'Asthma, cough or breathing sensitivity' },
  { id: 'pregnancy', label: 'Expecting mother' },
];

export function HouseholdProfilePanel({
  profile,
  onChange,
  compact = false,
}: HouseholdProfilePanelProps) {
  const toggleSensitive = (group: SensitiveGroup) => {
    const exists = profile.sensitiveGroups.includes(group);
    const nextGroups = exists
      ? profile.sensitiveGroups.filter((g) => g !== group)
      : [...profile.sensitiveGroups, group];
    onChange({ ...profile, sensitiveGroups: nextGroups });
  };

  return (
    <section
      aria-labelledby="household-profile-heading"
      className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6"
    >
      <div className="pb-4 border-b border-slate-200">
        <h2
          id="household-profile-heading"
          className="text-lg font-semibold text-slate-900"
        >
          Your Family &amp; Home Details
        </h2>
        <p className="text-sm text-slate-700 mt-1">
          Pick what matches your home so our daily tips and ₹ savings fit your family.
        </p>
      </div>

      <div
        className={`mt-5 grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-5`}
      >
        <div>
          <label
            htmlFor="profile-home-type"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Type of home
          </label>
          <select
            id="profile-home-type"
            value={profile.homeType}
            onChange={(e) =>
              onChange({ ...profile, homeType: e.target.value as HomeType })
            }
            className="w-full h-11 px-3.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:border-teal-700"
          >
            <option value="apartment">Flat / RWA Society Apartment</option>
            <option value="detached_house">Independent House / Kothi</option>
            <option value="shared_building">Joint Family / Builder Floor</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="profile-commute-mode"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Daily travel mode
          </label>
          <select
            id="profile-commute-mode"
            value={profile.commuteMode}
            onChange={(e) =>
              onChange({
                ...profile,
                commuteMode: e.target.value as CommuteMode,
              })
            }
            className="w-full h-11 px-3.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:border-teal-700"
          >
            <option value="petrol_car">Petrol / CNG Car</option>
            <option value="diesel_suv">Diesel Car / SUV</option>
            <option value="two_wheeler">Scooter / Motorbike</option>
            <option value="public_transit">Metro / City Bus / Auto</option>
            <option value="walk_cycle">Walking / Cycle</option>
            <option value="remote_work">Mostly Stay / Work at Home</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="profile-commute-km"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Daily travel distance (km)
          </label>
          <input
            id="profile-commute-km"
            type="number"
            min={0}
            max={250}
            value={profile.dailyCommuteKm}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              onChange({
                ...profile,
                dailyCommuteKm: Number.isFinite(parsed)
                  ? Math.max(0, Math.min(250, parsed))
                  : 0,
              });
            }}
            className="w-full h-11 px-3.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:border-teal-700"
          />
        </div>

        <div>
          <label
            htmlFor="profile-heating-fuel"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Winter room warming
          </label>
          <select
            id="profile-heating-fuel"
            value={profile.heatingFuel}
            onChange={(e) =>
              onChange({
                ...profile,
                heatingFuel: e.target.value as HeatingFuel,
              })
            }
            className="w-full h-11 px-3.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:border-teal-700"
          >
            <option value="minimal_heating">Sweaters, Razai &amp; Curtains Only</option>
            <option value="electric_heat_pump">Oil-Filled / Electric Room Heater</option>
            <option value="gas_furnace">Room Blower / Heat Convector</option>
            <option value="wood_coal">Angithi / Coal / Wood Fire</option>
            <option value="kerosene_lpg">Gas / Kerosene Heater</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="profile-cooking-fuel"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Kitchen cooking setup
          </label>
          <select
            id="profile-cooking-fuel"
            value={profile.cookingFuel}
            onChange={(e) =>
              onChange({
                ...profile,
                cookingFuel: e.target.value as CookingFuel,
              })
            }
            className="w-full h-11 px-3.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:border-teal-700"
          >
            <option value="gas_stove">LPG Cylinder / PNG Piped Gas</option>
            <option value="induction_electric">Induction / Electric Cooktop</option>
            <option value="solid_biomass">Chulha / Wood / Coal</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="profile-purifier"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Air purifier at home
          </label>
          <select
            id="profile-purifier"
            value={profile.purifierAccess}
            onChange={(e) =>
              onChange({
                ...profile,
                purifierAccess: e.target.value as PurifierAccess,
              })
            }
            className="w-full h-11 px-3.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:border-teal-700"
          >
            <option value="none">No Air Purifier Yet</option>
            <option value="diy_corsi_rosenthal">DIY Fan + HEPA/MERV-13 Box</option>
            <option value="hepa_unit">Branded HEPA Air Purifier</option>
          </select>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-5">
        <fieldset>
          <legend className="text-sm font-medium text-slate-800 mb-2.5">
            Who needs extra care at home?
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SENSITIVE_OPTIONS.map((opt) => {
              const checked = profile.sensitiveGroups.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className="flex items-center gap-3 text-sm text-slate-800 cursor-pointer min-h-[44px] px-2.5 rounded-md hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSensitive(opt.id)}
                    className="h-5 w-5 rounded border-slate-400 text-teal-700 accent-teal-700 cursor-pointer shrink-0"
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="profile-size"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Family members
            </label>
            <input
              id="profile-size"
              type="number"
              min={1}
              max={15}
              value={profile.householdSize}
              onChange={(e) => {
                const v = Math.max(1, Math.min(15, Number(e.target.value) || 1));
                onChange({ ...profile, householdSize: v });
              }}
              className="w-full h-11 px-3.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="profile-community-size"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Society / RWA flats
            </label>
            <input
              id="profile-community-size"
              type="number"
              min={1}
              max={500}
              value={profile.communityHouseholds}
              onChange={(e) => {
                const v = Math.max(
                  1,
                  Math.min(500, Number(e.target.value) || 1),
                );
                onChange({ ...profile, communityHouseholds: v });
              }}
              className="w-full h-11 px-3.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
