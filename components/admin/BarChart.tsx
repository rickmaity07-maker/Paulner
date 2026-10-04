"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChartBar, Table } from "@phosphor-icons/react";

export interface BarDatum {
  key: string;
  label: string; // axis label, short
  detail: string; // tooltip heading, long
  value: number;
  sub?: string; // extra tooltip line
  highlight?: boolean; // e.g. today
}

/*
  One series, so one hue (Route 66 blue) and no legend: the card title names it.
  Thin bars with 4px rounded tops sitting on the baseline, a 2px gap between
  them, quiet gridlines, a tooltip on hover or focus, and a table view.
*/
export default function BarChart({ data, units, height = 220 }: { data: BarDatum[]; units: [one: string, many: string]; height?: number }) {
  const unit = (n: number) => `${n} ${n === 1 ? units[0] : units[1]}`;
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const id = useId();
  const max = Math.max(4, ...data.map((d) => d.value));
  // Round the axis up to a tidy step so gridlines land on whole numbers.
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  const current = active !== null ? data[active] : null;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setTable((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-sage ring-1 ring-bone/10 transition-colors hover:bg-night hover:text-bone"
          aria-pressed={table}
        >
          {table ? <ChartBar size={14} /> : <Table size={14} />} {table ? "Diagramm" : "Tabelle"}
        </button>
      </div>

      {table ? (
        <div className="max-h-[260px] overflow-auto rounded-2xl ring-1 ring-bone/10">
          <table className="w-full text-sm">
            <tbody>
              {data.map((d) => (
                <tr key={d.key} className="border-b border-bone/[0.06] last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-normal text-sage">
                    {d.detail}
                  </th>
                  <td className="px-4 py-2 text-right font-mono text-bone">{unit(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative flex gap-3" style={{ height }}>
          {/* Y axis */}
          <div className="relative w-6 shrink-0 text-right font-mono text-[10px] text-sage" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(tick / top) * 100}%` }}>
                {tick}
              </span>
            ))}
          </div>

          <div className="relative flex-1" onPointerLeave={() => setActive(null)}>
            {ticks.map((tick) => (
              <div
                key={tick}
                aria-hidden="true"
                className={`absolute inset-x-0 border-t ${tick === 0 ? "border-bone/25" : "border-dashed border-bone/[0.08]"}`}
                style={{ bottom: `${(tick / top) * 100}%` }}
              />
            ))}

            <ul className="absolute inset-0 flex items-end gap-[2px]" role="list" aria-describedby={`${id}-tip`}>
              {data.map((d, index) => {
                const pct = (d.value / top) * 100;
                return (
                  <li key={d.key} className="relative flex h-full flex-1 items-end justify-center">
                    {/* The hit target is the whole column, wider and taller than the bar itself. */}
                    <button
                      type="button"
                      onPointerEnter={() => setActive(index)}
                      onFocus={() => setActive(index)}
                      onBlur={() => setActive(null)}
                      aria-label={`${d.detail}: ${unit(d.value)}`}
                      className="absolute inset-0 z-10 rounded-md focus-visible:outline-2 focus-visible:outline-route"
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ type: "spring", stiffness: 140, damping: 20, delay: index * 0.025 }}
                      className={`w-full max-w-[22px] rounded-t-[4px] transition-colors ${
                        active === index ? "bg-[#16597f]" : d.highlight ? "bg-amber" : "bg-route"
                      } ${d.value === 0 ? "min-h-[2px] bg-bone/15" : ""}`}
                    />
                  </li>
                );
              })}
            </ul>

            <AnimatePresence>
              {current && active !== null && (
                <motion.div
                  id={`${id}-tip`}
                  role="status"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-xl bg-asphalt px-3 py-2 text-xs text-chrome shadow-lg"
                  style={{
                    left: `${((active + 0.5) / data.length) * 100}%`,
                    bottom: `calc(${(current.value / top) * 100}% + 10px)`,
                  }}
                >
                  <p className="font-semibold">{current.detail}</p>
                  <p className="text-chrome/75">{unit(current.value)}</p>
                  {current.sub && <p className="text-chrome/55">{current.sub}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {!table && (
        <div className="ml-9 mt-2 flex gap-[2px] font-mono text-[10px] text-sage" aria-hidden="true">
          {data.map((d, index) => (
            <span key={d.key} className={`flex-1 truncate text-center ${d.highlight ? "font-bold text-amber" : ""}`}>
              {data.length > 16 && index % 2 === 1 ? "" : d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
