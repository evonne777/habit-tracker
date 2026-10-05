interface ProgressRingProps {
  completed: number
  total: number
}

export function ProgressRing({ completed, total }: ProgressRingProps) {
  const ratio = total === 0 ? 0 : completed / total
  const size = 112
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - ratio)

  return (
    <div
      aria-label={`今日完成 ${completed} 项，共 ${total} 项`}
      className="progress-ring"
      role="img"
      style={{ width: size, height: size }}
    >
      <svg aria-hidden="true" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        <circle className="progress-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <circle
          className="progress-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
      <div className="progress-label">
        <strong>{completed}</strong>
        <span>/ {total}</span>
      </div>
    </div>
  )
}
