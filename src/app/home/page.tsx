'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    BarChart2,
    Database,
    Bot,
    Calendar,
    Layers,
    TrendingUp,
    FileSearch
} from 'lucide-react';
import { Button } from '@/components/ui';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-100/20 via-transparent to-transparent dark:from-cyan-900/20" />

                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center max-w-4xl mx-auto space-y-8"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-4">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            ConTech DX Platform
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
                            건설산업의 <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
                                DX/AX
                            </span>를 주도합니다
                        </h1>

                        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                            공정관리부터 AI 기반 문서 분석까지, 데이터 중심의 의사결정.
                        </p>

                    </motion.div>
                </div>

                {/* Background Grid Effect */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                            Core Capabilities
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            성공적인 프로젝트 수행을 위한 4가지 핵심 솔루션
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCard
                            icon={<Calendar className="w-8 h-8 text-blue-500" />}
                            title="공정관리"
                            description="체계적인 건설전문 WBS 간트앱을 통해 복잡한 공정을 직관적으로 관리하고 일정을 최적화합니다."
                            delay={0.1}
                        />
                        <FeatureCard
                            icon={<Bot className="w-8 h-8 text-cyan-500" />}
                            title="AI RAG 분석"
                            description="RAG 기술이 적용된 AI가 건설산업에 관련한 문서들을 분석하여 핵심 정보를 요약 제공합니다."
                            delay={0.2}
                        />
                        <FeatureCard
                            icon={<Database className="w-8 h-8 text-purple-500" />}
                            title="Data Hub"
                            description="현장의 모든 데이터를 디지털화하여 표준화된 건설 데이터베이스를 구축합니다."
                            delay={0.3}
                        />
                        <FeatureCard
                            icon={<TrendingUp className="w-8 h-8 text-green-500" />}
                            title="EVMS 원가관리"
                            description="비용과 일정을 통합 관리하여 프로젝트의 성과를 실시간으로 측정하고 예측합니다."
                            delay={0.4}
                        />
                    </div>
                </div>
            </section>

            {/* Detail Sections */}
            <section className="py-24">
                <div className="container mx-auto px-4 space-y-32">
                    {/* Feature 1: Project Management */}
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 space-y-6">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-3xl font-bold text-zinc-900 dark:text-white">
                                데이터 기반의 <br />
                                정밀한 공정 관리
                            </h3>
                            <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                기존의 직관에 의존하던 공정 관리를 데이터 기반으로 전환하세요.
                                WBS와 EVMS가 결합된 시스템은 프로젝트의 진행 상황을 객관적인 수치로 보여줍니다.
                            </p>
                            <ul className="space-y-3">
                                {['실시간 진도율 체크', '비용-일정 통합 분석', '리스크 조기 경보'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 relative">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 aspect-video flex items-center justify-center group">
                                <BarChart2 className="w-24 h-24 text-zinc-300 dark:text-zinc-700 group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent" />
                            </div>
                        </div>
                    </div>

                    {/* Feature 2: AI Analysis */}
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                        <div className="flex-1 space-y-6">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                                <FileSearch className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <h3 className="text-3xl font-bold text-zinc-900 dark:text-white">
                                AI로 완성하는 <br />
                                스마트한 문서 분석
                            </h3>
                            <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                수천 페이지의 시방서와 도면 정보를 AI가 학습하고 분석합니다.
                                RAG(검색 증강 생성) 기술을 통해 정확한 근거 기반의 답변을 제공합니다.
                            </p>
                            <ul className="space-y-3">
                                {['기술 문서 자동 요약', '규정 위반 사항 검토', '유사 사례 검색'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 relative">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 aspect-video flex items-center justify-center group">
                                <Bot className="w-24 h-24 text-zinc-300 dark:text-zinc-700 group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-bl from-cyan-500/10 to-transparent" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-zinc-200 dark:bg-zinc-950 text-white relative overflow-hidden">
                <div className="container mx-auto px-4 text-center relative z-10">
                    <p className="text-zinc-400 mb-10 max-w-2xl mx-auto">
                        지금 바로 ConTech DX와 함께 디지털 전환을 시작하세요.
                    </p>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
            className="p-6 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:shadow-lg hover:border-cyan-500/50 transition-all duration-300 group"
        >
            <div className="mb-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 w-fit group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">
                {title}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {description}
            </p>
        </motion.div>
    );
}
