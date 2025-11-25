import Link from 'next/link';
import {
  FileText,
  FileSearch,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';

export default function Home() {
  const features = [
    {
      icon: FileText,
      title: '게시판',
      description: '팀원들과 정보를 공유하고 소통하세요',
      href: '/posts',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      icon: FileSearch,
      title: 'AI 문서 검색',
      description: 'Gemini AI 기반 문서 검색 및 RAG',
      href: '/file-search',
      color: 'text-orange-600 bg-orange-50',
    },
    {
      icon: BarChart3,
      title: '프로젝트 관리',
      description: 'Gantt 차트, WBS기반 공정 관리',
      href: '/projects',
      color: 'text-cyan-600 bg-cyan-50',
    }
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-orange-600/20 border border-orange-600/30 rounded-full text-orange-400 text-sm font-medium">
            건축 디지털 전환 플랫폼
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
            Contech DX
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
            건축 설계 + 시공 디지털 전환 플랫폼
          </p>

          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
            WBS기반 공정관리, 프로젝트 대시보드, AX기반 효율화 등 건설데이터 구축
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              variant="outline"
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg hover:shadow-xl"
              asChild
            >
              <Link href="/posts" className="flex items-center gap-2">
                게시판
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button
              variant="accent"
              size="lg"
              className="shadow-lg hover:shadow-xl"
              asChild
            >
              <Link href="/file-search" className="flex items-center gap-2">
                <FileSearch className="w-5 h-5" />
                AI 검색
              </Link>
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="shadow-lg hover:shadow-xl"
              asChild
            >
              <Link href="/projects" className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Gantt 차트
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href}>
              <Card hover className="h-full group">
                <CardContent className="p-6">
                  <div className={`inline-flex p-3 rounded-lg mb-4 ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-slate-700 dark:group-hover:text-slate-300">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>개발 🎯ToDoList</CardTitle>
            <CardDescription>지속적인 개선과 새로운 기능 추가</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-orange-600 dark:text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">유저 등급관리 업데이트</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">역할 기반 권한 관리 시스템 고도화</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-orange-600 dark:text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Gantt 차트 기본공정 mockup앱과 통합</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">프로젝트 일정 관리 및 공정 추적 ✅ 완료</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-slate-400 dark:text-slate-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">기획 반영한 UX UI 반영하기</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">사용자 경험 개선 및 디자인 시스템 구축</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-slate-400 dark:text-slate-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">WBS, EVMS, PMIS 개념기반 기획</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">체계적인 프로젝트 관리 도구 개발</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
