'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui';

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.215, 0.61, 0.355, 1] as const, // Cubic bezier for smooth motion
      },
    },
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-primary-200/40 via-transparent to-transparent dark:from-primary-900/20 dark:via-transparent dark:to-transparent blur-3xl" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto px-4 text-center"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-white/5 border border-primary-200 dark:border-white/10 backdrop-blur-md text-sm text-primary-600 dark:text-primary-200 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Enterprise Grade Platform
          </div>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6"
        >
          Contech DX
          <br />
          <span className="text-4xl md:text-6xl font-medium text-primary-500 dark:text-primary-400 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 dark:from-white dark:via-white dark:to-white/50">
            Intelligent Construction
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-lg md:text-xl text-slate-600 dark:text-primary-400 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          데이터 기반의 의사결정, 실시간 공정 관리, 그리고 AI 문서 검색.
          <br className="hidden sm:block" />
          건설 현장의 디지털 혁신을 위한 통합 플랫폼입니다.
        </motion.p>

        {/* Action Card */}
        <motion.div
          variants={itemVariants}
          className="p-1 rounded-2xl bg-gradient-to-b from-white/50 to-white/20 dark:from-white/10 dark:to-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl dark:shadow-2xl max-w-sm mx-auto"
        >
          <div className="bg-white/60 dark:bg-slate-950/80 rounded-xl p-6 space-y-4 backdrop-blur-sm">
            <div className="space-y-2">
              <h3 className="text-slate-900 dark:text-white font-medium">Member Access</h3>
              <p className="text-sm text-slate-500 dark:text-primary-500">
                승인된 임직원 및 관계자 전용
              </p>
            </div>

            <div className="grid gap-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-primary-100 border-none shadow-lg"
                asChild
              >
                <Link href="/home" className="flex items-center justify-center gap-2">
                  플랫폼 입장하기
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-primary-400 dark:hover:text-white dark:hover:bg-white/5"
                asChild
              >
                <Link href="/login">
                  관리자 로그인
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Footer Features */}
        <motion.div
          variants={itemVariants}
          className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-primary-100 dark:border-white/10 text-primary-600 dark:text-primary-300 shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-primary-300">WBS 공정 관리</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-primary-100 dark:border-white/10 text-primary-600 dark:text-primary-300 shadow-sm">
              <Zap className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-primary-300">실시간 대시보드</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-primary-100 dark:border-white/10 text-primary-600 dark:text-primary-300 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-primary-300">엔터프라이즈 보안</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
