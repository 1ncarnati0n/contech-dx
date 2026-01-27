'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { GANTT_COLORS } from '../types';

/**
 * Error Boundary Props
 */
interface GanttErrorBoundaryProps {
    /** 렌더링할 자식 컴포넌트 */
    children: ReactNode;
    /** 에러 발생 시 표시할 대체 UI (선택적) */
    fallback?: ReactNode;
    /** 에러 발생 시 호출되는 콜백 */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    /** 컴포넌트 이름 (에러 로그용) */
    componentName?: string;
}

/**
 * Error Boundary State
 */
interface GanttErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * 간트 차트용 Error Boundary 컴포넌트
 *
 * 하위 컴포넌트에서 발생한 JavaScript 에러를 캐치하고
 * 폴백 UI를 표시합니다. 전체 앱 크래시를 방지합니다.
 *
 * @example
 * ```tsx
 * <GanttErrorBoundary
 *   onError={(error) => console.error('Gantt Error:', error)}
 *   fallback={<div>오류가 발생했습니다</div>}
 * >
 *   <GanttChart tasks={tasks} />
 * </GanttErrorBoundary>
 * ```
 */
export class GanttErrorBoundary extends Component<
    GanttErrorBoundaryProps,
    GanttErrorBoundaryState
> {
    constructor(props: GanttErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    /**
     * 에러 발생 시 state 업데이트
     */
    static getDerivedStateFromError(error: Error): Partial<GanttErrorBoundaryState> {
        return { hasError: true, error };
    }

    /**
     * 에러 정보 로깅 및 콜백 호출
     */
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // 에러 콜백 호출
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // 개발 환경에서 콘솔 로깅
        if (process.env.NODE_ENV === 'development') {
            console.error(
                `[GanttErrorBoundary${this.props.componentName ? `: ${this.props.componentName}` : ''}] Error caught:`,
                error
            );
            console.error('Component stack:', errorInfo.componentStack);
        }
    }

    /**
     * 에러 상태 초기화 (재시도)
     */
    handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // 커스텀 폴백 UI가 제공된 경우
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // 기본 폴백 UI
            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 20px',
                        backgroundColor: '#fef2f2',
                        border: `1px solid ${GANTT_COLORS.holiday}`,
                        borderRadius: '8px',
                        minHeight: '200px',
                    }}
                >
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={GANTT_COLORS.red}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>

                    <h3
                        style={{
                            marginTop: '16px',
                            marginBottom: '8px',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#991b1b',
                        }}
                    >
                        간트 차트 렌더링 오류
                    </h3>

                    <p
                        style={{
                            marginBottom: '16px',
                            fontSize: '14px',
                            color: '#7f1d1d',
                            textAlign: 'center',
                            maxWidth: '400px',
                        }}
                    >
                        {this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}
                    </p>

                    <button
                        onClick={this.handleRetry}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'white',
                            backgroundColor: GANTT_COLORS.red,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = GANTT_COLORS.red;
                        }}
                    >
                        다시 시도
                    </button>

                    {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                        <details
                            style={{
                                marginTop: '20px',
                                padding: '12px',
                                backgroundColor: '#fee2e2',
                                borderRadius: '4px',
                                fontSize: '12px',
                                maxWidth: '100%',
                                overflow: 'auto',
                            }}
                        >
                            <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
                                개발자 정보 (Development Only)
                            </summary>
                            <pre
                                style={{
                                    marginTop: '8px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {this.state.error?.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default GanttErrorBoundary;
