import { NEARBY_CATEGORIES, describeDistance, type NearbyPlace } from "@/lib/places";

/** Nearby places grouped by type, nearest first. */
export function NearbyList({ places }: { places: NearbyPlace[] }) {
  const groups = NEARBY_CATEGORIES.map((c) => ({ ...c, items: places.filter((p) => p.category === c.key) })).filter((g) => g.items.length);
  if (!groups.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} aria-hidden /> {g.label}
          </h3>
          <ul className="space-y-0.5 text-sm">
            {g.items.map((p, i) => (
              <li key={`${p.name}-${i}`} className="flex justify-between gap-3">
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 tabular-nums text-muted">{describeDistance(p.distance)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
