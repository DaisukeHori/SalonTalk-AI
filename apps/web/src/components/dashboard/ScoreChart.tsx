'use client';

/**
 * ScoreChart Component
 * スコアチャートコンポーネント（7指標レーダーチャート）
 */

interface ScoreData {
  label: string;
  value: number;
  maxValue: number;
}

interface ScoreChartProps {
  data: ScoreData[];
  size?: number;
  showLabels?: boolean;
  showValues?: boolean;
  color?: string;
  backgroundColor?: string;
}

export function ScoreChart({
  data,
  size = 300,
  showLabels = true,
  showValues = true,
  color = '#6366F1',
  backgroundColor = '#E0E7FF',
}: ScoreChartProps) {
  const center = size / 2;
  const radius = (size - 80) / 2;
  const angleStep = (2 * Math.PI) / data.length;

  // Calculate points for each data value
  const getPoint = (index: number, value: number, maxValue: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const normalizedValue = value / maxValue;
    const r = radius * normalizedValue;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Generate polygon points for the data
  const dataPoints = data.map((item, i) => getPoint(i, item.value, item.maxValue));
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Generate grid lines
  const gridLevels = [0.25, 0.5, 0.75, 1];

  // Generate axis lines
  const axisLines = data.map((_, i) => {
    const angle = angleStep * i - Math.PI / 2;
    return {
      x2: center + radius * Math.cos(angle),
      y2: center + radius * Math.sin(angle),
    };
  });

  // Label positions
  const labelPositions = data.map((item, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const labelRadius = radius + 40;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
      label: item.label,
      value: item.value,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid circles */}
        {gridLevels.map((level, i) => (
          <polygon
            key={`grid-${i}`}
            points={data
              .map((_, j) => {
                const angle = angleStep * j - Math.PI / 2;
                const r = radius * level;
                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
              })
              .join(' ')}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, i) => (
          <line
            key={`axis-${i}`}
            x1={center}
            y1={center}
            x2={line.x2}
            y2={line.y2}
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}

        {/* Background polygon */}
        <polygon
          points={data
            .map((_, i) => {
              const angle = angleStep * i - Math.PI / 2;
              return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
            })
            .join(' ')}
          fill={backgroundColor}
          opacity="0.3"
        />

        {/* Data polygon */}
        <polygon
          points={dataPolygon}
          fill={color}
          fillOpacity="0.3"
          stroke={color}
          strokeWidth="2"
        />

        {/* Data points */}
        {dataPoints.map((point, i) => (
          <circle
            key={`point-${i}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={color}
          />
        ))}

        {/* Labels */}
        {showLabels &&
          labelPositions.map((pos, i) => (
            <text
              key={`label-${i}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-gray-600"
            >
              {pos.label}
            </text>
          ))}
      </svg>

      {/* Legend */}
      {showValues && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-600">{item.label}:</span>
              <span className="font-medium text-gray-900">{item.value}点</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ScoreChart;
