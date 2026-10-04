/* The Route 66 highway shield, drawn once and reused: rail logo, ticket, hero badge, admin. */
export default function Shield({ className = "", label = true }: { className?: string; label?: boolean }) {
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      <path
        d="M8 6h84c0 7-3 12-8 15l7 15c6 34-13 55-41 68C22 91 3 70 9 36l7-15C11 18 8 13 8 6z"
        fill="#f6efe6"
        stroke="#171415"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M15 12h70c-1 4-3 7-6 9H21c-3-2-5-5-6-9z" fill="#b3203a" />
      {label && (
        <>
          <text x="50" y="40" textAnchor="middle" fontFamily="var(--font-rye), Georgia, serif" fontSize="15" fill="#171415">
            ROUTE
          </text>
          <text x="50" y="84" textAnchor="middle" fontFamily="var(--font-rye), Georgia, serif" fontSize="44" fill="#171415">
            66
          </text>
        </>
      )}
    </svg>
  );
}
