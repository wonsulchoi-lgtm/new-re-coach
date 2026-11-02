import React from 'react';
import { RadarScores } from '../types';

interface RadarChartProps {
  scores: RadarScores;
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ scores, size = 320 }) => {
  const center = size / 2;
  const radius = size * 0.38;

  const axes = [
    { key: 'knowledge', label: '요구 지식', score: Math.min(100, Math.max(0, scores.knowledge ?? 50)) },
    { key: 'skills', label: '직무 스킬', score: Math.min(100, Math.max(0, scores.skills ?? 50)) },
    { key: 'experience', label: '프로젝트·경험', score: Math.min(100, Math.max(0, scores.experience ?? 50)) },
    { key: 'attitude', label: '협업·인성 태도', score: Math.min(100, Math.max(0, scores.attitude ?? 50)) },
  ];

  const totalAxes = axes.length;

  // Helper to convert polar to cartesian
  const getCoordinates = (index: number, value: number) => {
    // 0 is top (-pi/2)
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Generate grid polygons (25, 50, 75, 100)
  const gridLevels = [25, 50, 75, 100];
  const gridPolygons = gridLevels.map((level) => {
    return axes
      .map((_, i) => {
        const { x, y } = getCoordinates(i, level);
        return `${x},${y}`;
      })
      .join(' ');
  });

  // Target candidate polygon points
  const candidatePolygon = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(i, axis.score);
      return `${x},${y}`;
    })
    .join(' ');

  // Benchmark polygon (75 score)
  const benchmarkPolygon = axes
    .map((_, i) => {
      const { x, y } = getCoordinates(i, 75);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            <radialGradient id="radarMintGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.15" />
            </radialGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Concentric grid */}
          {gridPolygons.map((points, idx) => (
            <polygon
              key={`grid-${idx}`}
              points={points}
              fill={idx === 3 ? '#F8FAFC' : 'none'}
              stroke="#CBD5E1"
              strokeWidth={idx === 3 ? 1.5 : 0.8}
              strokeDasharray={idx < 3 ? '3,3' : undefined}
            />
          ))}

          {/* Grid Level Labels (along top vertical axis) */}
          {gridLevels.map((lvl) => {
            const { y } = getCoordinates(0, lvl);
            return (
              <text
                key={`lvl-${lvl}`}
                x={center + 6}
                y={y + 3}
                fill="#94A3B8"
                fontSize="10"
                fontWeight="500"
                fontFamily="sans-serif"
              >
                {lvl}
              </text>
            );
          })}

          {/* Axes spokes */}
          {axes.map((_, i) => {
            const { x, y } = getCoordinates(i, 100);
            return (
              <line
                key={`axis-${i}`}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#CBD5E1"
                strokeWidth="1.2"
              />
            );
          })}

          {/* Industry standard benchmark (75점 기준치 점선) */}
          <polygon
            points={benchmarkPolygon}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.2"
            strokeDasharray="4,4"
          />

          {/* User Score Polygon */}
          <polygon
            points={candidatePolygon}
            fill="url(#radarMintGlow)"
            stroke="#0D9488"
            strokeWidth="2.5"
            className="transition-all duration-700 ease-out"
          />

          {/* Points & Labels */}
          {axes.map((axis, i) => {
            const point = getCoordinates(i, axis.score);
            const labelPos = getCoordinates(i, 118);

            // Alignment tweaks based on quadrant
            let textAnchor: 'middle' | 'start' | 'end' = 'middle';
            let dy = '0.35em';
            if (i === 0) {
              dy = '-0.6em';
            } else if (i === 1) {
              textAnchor = 'start';
            } else if (i === 2) {
              dy = '1.2em';
            } else if (i === 3) {
              textAnchor = 'end';
            }

            return (
              <g key={`point-${axis.key}`}>
                {/* Node circle */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="#0F766E"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  filter="url(#glow)"
                />

                {/* Score badge at node */}
                <rect
                  x={point.x - 14}
                  y={point.y - (i === 2 ? -8 : 22)}
                  width="28"
                  height="16"
                  rx="4"
                  fill="#0F172A"
                  className="opacity-90"
                />
                <text
                  x={point.x}
                  y={point.y - (i === 2 ? -19 : 11)}
                  fill="#5EEAD4"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {axis.score}
                </text>

                {/* Axis Label */}
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill="#1E293B"
                  fontSize="12"
                  fontWeight="600"
                  textAnchor={textAnchor}
                  dy={dy}
                >
                  {axis.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-teal-500 border border-teal-700 inline-block"></span>
          <span className="font-medium text-slate-700">내 현재 적합도</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400 inline-block"></span>
          <span className="text-slate-500">업계 합격자 권장선 (75점)</span>
        </div>
      </div>
    </div>
  );
};
