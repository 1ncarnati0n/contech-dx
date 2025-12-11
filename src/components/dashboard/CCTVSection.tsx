'use client';

import { useState, useEffect } from 'react';
import { Card, Badge } from '@/components/ui';
import { Camera, Maximize2 } from 'lucide-react';

export function CCTVSection() {
    const [currentTime, setCurrentTime] = useState<string>('');

    // 클라이언트에서만 시간 업데이트
    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date().toLocaleTimeString('ko-KR'));
        };
        
        // 초기 시간 설정
        updateTime();
        
        // 1초마다 업데이트
        const interval = setInterval(updateTime, 1000);
        
        return () => clearInterval(interval);
    }, []);

    // Mock CCTV Data
    const cctvFeeds = [
        { id: 1, name: 'Gate 1 (주출입구)', status: 'active', time: '18:05:22' },
        { id: 2, name: '101동 타워크레인', status: 'active', time: '18:05:22' },
        { id: 3, name: '자재 야적장', status: 'active', time: '18:05:22' },
        { id: 4, name: '103동 지하주차장', status: 'maintenance', time: '-' },
    ];

    return (
        <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-slate-900 dark:text-white" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">현장 CCTV 모니터링</h3>
                </div>
                <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 animate-pulse">
                    LIVE
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cctvFeeds.map((feed) => (
                    <div key={feed.id} className="relative group aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                        {/* Mock Video Feed Placeholder */}
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                            {feed.status === 'active' ? (
                                <div className="text-slate-600 dark:text-slate-500 flex flex-col items-center gap-2">
                                    <Camera className="w-8 h-8 opacity-50" />
                                    <span className="text-xs">Camera Feed #{feed.id}</span>
                                </div>
                            ) : (
                                <div className="text-slate-500 flex flex-col items-center gap-2">
                                    <span className="text-xs">점검중</span>
                                </div>
                            )}
                        </div>

                        {/* Overlay Info */}
                        <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-start">
                            <span className="text-xs text-white font-medium px-1.5 py-0.5 rounded bg-black/30 backdrop-blur-sm">
                                {feed.name}
                            </span>
                            <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${feed.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            </div>
                        </div>

                        {/* Timestamp */}
                        <div className="absolute bottom-2 right-2">
                            <span className="text-[10px] text-white/80 font-mono bg-black/30 px-1 rounded backdrop-blur-sm">
                                {feed.status === 'active' ? currentTime || '-' : '-'}
                            </span>
                        </div>

                        {/* Hover Action */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
                            <Maximize2 className="w-8 h-8 text-white drop-shadow-lg transform scale-90 group-hover:scale-100 transition-transform" />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
