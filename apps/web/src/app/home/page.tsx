'use client';

import { motion } from 'framer-motion';
import { Building2, ShieldCheck, LineChart } from 'lucide-react';

export default function HomePage() {
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
        ease: [0.215, 0.61, 0.355, 1] as const,
      },
    },
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center overflow-hidden transition-colors duration-300">
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
          className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white mb-6"
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
          className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          BIM 및 데이터 기반의 의사결정, WBS 공정계획, AI 전문가 에이전트를 적용,
          <br className="hidden sm:block" />
          건설산업의 디지털전환(DX) 및 BIM 데이터 통합을 위한 플랫폼입니다.
        </motion.p>

        {/* Footer Features */}
        <motion.div
          variants={itemVariants}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto"
        >
          {/* Feature 1 */}
          <div className="group p-6 rounded-2xl bg-white/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:border-cyan-300 dark:hover:border-cyan-700 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-50 dark:bg-white/5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">WBS 직영공사 관리</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  프로젝트의 모든 작업들을 체계적으로 분류하고 효율적으로 관리하여 공기를 준수합니다.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group p-6 rounded-2xl bg-white/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:border-cyan-300 dark:hover:border-cyan-700 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-50 dark:bg-white/5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">건설 데이터 구축</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  건설산업의 프로세스와 시공현장의 다양한 데이터를 디지털화하고 지속 가능한 지적자산으로 구축합니다.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group p-6 rounded-2xl bg-white/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:border-cyan-300 dark:hover:border-cyan-700 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-50 dark:bg-white/5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                <LineChart className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">EVMS 원가관리(예정)</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  비용과 일정을 통합관리하여 프로젝트의 성과를 실시간으로 측정하고 예측합니다.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
