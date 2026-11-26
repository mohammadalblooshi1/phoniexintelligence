import { BeforeAfter } from "@/components/before-after";
import { STYLES, TIER_LABEL, catalogItem, formatRange, itemCost, totalCost, type BoardItemT, type StyleName, type Tier } from "@/lib/renovation";

type PublicBoard = { id: string; title: string; room_type: string; style: StyleName; tier: Tier; summary: string; has_after: boolean; items: BoardItemT[] };

/** Public "Renovation ideas" section on a property page. */
export function ListingRenovations({ boards }: { boards: PublicBoard[] }) {
  if (!boards.length) return null;
  return (
    <section aria-labelledby="reno-heading" className="space-y-4">
      <div>
        <h2 id="reno-heading" className="text-xl font-semibold">Renovation ideas</h2>
        <p className="text-sm text-muted">Concepts prepared by the owner to show what this property could become. Not the current condition; costs are rough estimates.</p>
      </div>
      {boards.map((b) => (
        <div key={b.id} className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">{b.title} <span className="text-sm font-normal text-muted">· {b.room_type} · {b.style}</span></h3>
            <p className="text-sm font-medium tabular-nums">{formatRange(totalCost(b.items, b.tier))} <span className="text-muted">({TIER_LABEL[b.tier]})</span></p>
          </div>
          <BeforeAfter
            before={`/renovation-media/${b.id}/before`}
            after={b.has_after ? `/renovation-media/${b.id}/after` : null}
            conceptFilter={STYLES[b.style].filter}
            palette={STYLES[b.style].palette}
            markers={b.items.map((it, i) => ({ id: it.id, n: i + 1, x: it.x, y: it.y, label: catalogItem(it.key)?.label ?? "" }))}
            alt={b.title}
          />
          {b.summary ? <p className="text-sm">{b.summary}</p> : null}
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {b.items.map((it, i) => (
              <li key={it.id} className="flex justify-between gap-3">
                <span><span className="font-bold text-accent">{i + 1}.</span> {catalogItem(it.key)?.label}{it.note ? <span className="text-muted"> — {it.note}</span> : null}</span>
                <span className="shrink-0 tabular-nums text-muted">{formatRange(itemCost(it, b.tier))}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
