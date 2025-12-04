'use client';

/**
 * TrendChart Component
 * トレンドチャートコンポーネント
 */

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface TrendChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  color?: string;
  showArea?: boolean;
  showDots?: boolean;
  valueFormatter?: (value: number) => string;
}

export function TrendChart({
  data,
  title,
  height = 200,
  color = '#6366F1',
  showArea = true,
  showDots = true,
  valueFormatter = (v) => v.toString(),
}: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-48 text-gray-500">
          データがありません
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = 600;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const xStep = innerWidth / (data.length - 1 || 1);

  const getY = (value: number) => {
    return padding.top + innerHeight - ((value - minValue) / range) * innerHeight;
  };

  const getX = (index: number) => {
    return padding.left + index * xStep;
  };

  // Generate path
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`)
    .join(' ');

  const areaPath = `${linePath} L ${getX(data.length - 1)} ${
    padding.top + innerHeight
  } L ${padding.left} ${padding.top + innerHeight} Z`;

  // Y-axis labels
  const yAxisLabels = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = minValue + range * ratio;
    return {
      value: Math.round(value),
      y: getY(value),
    };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        style={{ height: `${height}px` }}
      >
        {/* Grid lines */}
        {yAxisLabels.map((label, i) => (
          <line
            key={`grid-${i}`}
            x1={padding.left}
            y1={label.y}
            x2={chartWidth - padding.right}
            y2={label.y}
            stroke="#E5E7EB"
            strokeDasharray="4"
          />
        ))}

        {/* Y-axis labels */}
        {yAxisLabels.map((label, i) => (
          <text
            key={`y-label-${i}`}
            x={padding.left - 10}
            y={label.y}
            textAnchor="end"
            dominantBaseline="middle"
            className="text-xs fill-gray-500"
          >
            {valueFormatter(label.value)}
          </text>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => {
          // Show every nth label to avoid crowding
          const showLabel = data.length <= 7 || i % Math.ceil(data.length / 7) === 0;
          if (!showLabel) return null;
          return (
            <text
              key={`x-label-${i}`}
              x={getX(i)}
              y={chartHeight - 10}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {d.date}
            </text>
          );
        })}

        {/* Area fill */}
        {showArea && (
          <path d={areaPath} fill={color} fillOpacity="0.1" />
        )}

        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" />

        {/* Dots */}
        {showDots &&
          data.map((d, i) => (
            <g key={`dot-${i}`}>
              <circle
                cx={getX(i)}
                cy={getY(d.value)}
                r="4"
                fill="white"
                stroke={color}
                strokeWidth="2"
              />
              {/* Tooltip on hover would go here in a real implementation */}
            </g>
          ))}
      </svg>

      {/* Legend/Stats */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-gray-600">平均: {valueFormatter(Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length))}</span>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          <span>最高: {valueFormatter(maxValue)}</span>
          <span>最低: {valueFormatter(minValue)}</span>
        </div>
      </div>
    </div>
  );
}

export default TrendChart;
