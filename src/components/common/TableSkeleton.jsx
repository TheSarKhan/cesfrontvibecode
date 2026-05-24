export default function TableSkeleton({ cols = 5, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-[var(--ces-line-2)] last:border-b-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-4">
              <div
                className="h-3 rounded-full"
                style={{
                  width: `${60 + ((i * 3 + j * 7) % 35)}%`,
                  background: 'linear-gradient(90deg, var(--ces-graphite-100) 0%, var(--ces-graphite-50) 50%, var(--ces-graphite-100) 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'ces-shimmer 1.5s linear infinite',
                }}
              />
            </td>
          ))}
        </tr>
      ))}
      <style>{`
        @keyframes ces-shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </>
  )
}
