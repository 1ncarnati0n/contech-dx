'use client';

import React from 'react';
import { GANTT_COLORS, GANTT_MARKER_COMPACT } from '../../types';

/**
 * SVG 정의 (마커, 패턴 등)
 * CSS 변수를 사용하여 테마에 따라 자동 전환
 */
export const SvgDefs: React.FC = () => (
    <defs>
        <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
        >
            <polygon points="0 0, 10 3.5, 0 7" fill={GANTT_COLORS.dependency} />
        </marker>

        {/* 휴일 빗금 패턴 (반투명 배경 + 빗금선) */}
        <pattern
            id="holidayHatchPattern"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
        >
            <rect width="6" height="6" fill={GANTT_COLORS.bgPrimary} fillOpacity={0.7} />
            <line x1="0" y1="0" x2="0" y2="6" stroke={GANTT_COLORS.blue} strokeWidth="2" />
        </pattern>

        {/* 종속성 화살표 마커 - 기본 */}
        <marker
            id="dependency-arrow"
            markerWidth="5"
            markerHeight="5"
            refX="4"
            refY="2.5"
            orient="auto"
        >
            <path
                d="M0.5,0.5 L4,2.5 L0.5,4.5"
                fill="none"
                stroke={GANTT_COLORS.textPrimary}
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </marker>

        {/* 종속성 화살표 마커 - 선택됨 */}
        <marker
            id="dependency-arrow-selected"
            markerWidth="5"
            markerHeight="5"
            refX="4"
            refY="2.5"
            orient="auto"
        >
            <path
                d="M0.5,0.5 L4,2.5 L0.5,4.5"
                fill="none"
                stroke={GANTT_COLORS.focus}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </marker>

        {/* 종속성 화살표 마커 - 연결 중 (프리뷰) */}
        <marker
            id="dependency-arrow-connecting"
            markerWidth="5"
            markerHeight="5"
            refX="4"
            refY="2.5"
            orient="auto"
        >
            <path
                d="M0.5,0.5 L4,2.5 L0.5,4.5"
                fill="none"
                stroke={GANTT_COLORS.success}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </marker>

        {/* 종속성 화살표 마커 - 호버 */}
        <marker
            id="dependency-arrow-hover"
            markerWidth="5"
            markerHeight="5"
            refX="4"
            refY="2.5"
            orient="auto"
        >
            <path
                d="M0.5,0.5 L4,2.5 L0.5,4.5"
                fill="none"
                stroke={GANTT_COLORS.textPrimary}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </marker>

        {/* ===== Compact 모드 마커 (작은 크기) ===== */}

        {/* Compact 종속성 화살표 마커 - 기본 */}
        <marker
            id="dependency-arrow-compact"
            markerWidth={GANTT_MARKER_COMPACT.WIDTH}
            markerHeight={GANTT_MARKER_COMPACT.HEIGHT}
            refX={GANTT_MARKER_COMPACT.REF_X}
            refY={GANTT_MARKER_COMPACT.REF_Y}
            orient="auto"
        >
            <path
                d="M0.25,0.25 L2.5,1.5 L0.25,2.75"
                fill="none"
                stroke={GANTT_COLORS.textPrimary}
                strokeWidth={GANTT_MARKER_COMPACT.STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </marker>

        {/* Compact 종속성 화살표 마커 - 선택됨 */}
        <marker
            id="dependency-arrow-selected-compact"
            markerWidth={GANTT_MARKER_COMPACT.WIDTH}
            markerHeight={GANTT_MARKER_COMPACT.HEIGHT}
            refX={GANTT_MARKER_COMPACT.REF_X}
            refY={GANTT_MARKER_COMPACT.REF_Y}
            orient="auto"
        >
            <path
                d="M0.25,0.25 L2.5,1.5 L0.25,2.75"
                fill="none"
                stroke={GANTT_COLORS.focus}
                strokeWidth={GANTT_MARKER_COMPACT.STROKE_WIDTH * 1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </marker>

        {/* Compact 종속성 화살표 마커 - 연결 중 (프리뷰) */}
        <marker
            id="dependency-arrow-connecting-compact"
            markerWidth={GANTT_MARKER_COMPACT.WIDTH}
            markerHeight={GANTT_MARKER_COMPACT.HEIGHT}
            refX={GANTT_MARKER_COMPACT.REF_X}
            refY={GANTT_MARKER_COMPACT.REF_Y}
            orient="auto"
        >
            <path
                d="M0.25,0.25 L2.5,1.5 L0.25,2.75"
                fill="none"
                stroke={GANTT_COLORS.success}
                strokeWidth={GANTT_MARKER_COMPACT.STROKE_WIDTH * 1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </marker>

        {/* Compact 종속성 화살표 마커 - 호버 */}
        <marker
            id="dependency-arrow-hover-compact"
            markerWidth={GANTT_MARKER_COMPACT.WIDTH}
            markerHeight={GANTT_MARKER_COMPACT.HEIGHT}
            refX={GANTT_MARKER_COMPACT.REF_X}
            refY={GANTT_MARKER_COMPACT.REF_Y}
            orient="auto"
        >
            <path
                d="M0.25,0.25 L2.5,1.5 L0.25,2.75"
                fill="none"
                stroke={GANTT_COLORS.textPrimary}
                strokeWidth={GANTT_MARKER_COMPACT.STROKE_WIDTH * 1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </marker>
    </defs>
);
