export default function TableSkeleton({ cols = 5, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-3.5 rounded-full bg-gray-200 dark:bg-gray-700"
                style={{ width: `${60 + ((i * 3 + j * 7) % 35)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
