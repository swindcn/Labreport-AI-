type SparklineProps = {
  values: number[];
  strokeColor?: string;
  fillColor?: string;
};

function normalize(values: number[]) {
  const width = 280;
  const height = 96;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);

  return { width, height, min, range };
}

function toPoints(values: number[]) {
  const { width, height, min, range } = normalize(values);
  const divisor = Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      const x = (index / divisor) * width;
      const y = height - ((value - min) / range) * (height - 12) - 6;

      return `${x},${y}`;
    })
    .join(" ");
}

export function Sparkline({
  values,
  strokeColor = "#5964ff",
  fillColor = "#e8ebff",
}: SparklineProps) {
  const { width, height, min, range } = normalize(values);
  const divisor = Math.max(values.length - 1, 1);
  const points = toPoints(values);
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-24 w-full overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={areaPoints} fill={fillColor} opacity="0.8" />
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((value, index) => {
        const x = (index / divisor) * width;
        const y = height - ((value - min) / range) * (height - 12) - 6;

        return <circle key={`${value}-${index}`} cx={x} cy={y} r="3.5" fill={strokeColor} />;
      })}
    </svg>
  );
}
