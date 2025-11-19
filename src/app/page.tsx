import Link from 'next/link';
import {
  FileText,
  FileSearch,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui';

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
      description: 'Gantt 차트 기반 공정 관리 (준비중)',
      href: '#',
      color: 'text-cyan-600 bg-cyan-50',
    },
    {
      icon: Users,
      title: '유저 관리',
      description: '권한 기반 회원 관리 시스템',
      href: '/admin/users',
      color: 'text-purple-600 bg-purple-50',
    },
  ];

  const stats = [
    { label: '실시간 협업', value: '24/7', icon: Clock },
    { label: '보안 강화', value: '100%', icon: Shield },
    { label: '빠른 처리', value: '<2s', icon: Zap },
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
            게시판, 간트차트 공정관리, 프로젝트 관리, 대시보드, 유저관리 등 건설데이터 구축
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/posts"
              className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              시작하기
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/file-search"
              className="inline-flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700 px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <FileSearch className="w-5 h-5" />
              AI 검색 체험
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6"
              >
                <stat.icon className="w-8 h-8 text-orange-400 mb-3 mx-auto" />
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">주요 기능</h2>
          <p className="text-lg text-slate-600">
            건설 현장의 디지털 전환을 위한 통합 솔루션
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href}>
              <Card hover className="h-full group">
                <CardContent className="p-6">
                  <div className={`inline-flex p-3 rounded-lg mb-4 ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-slate-700">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="max-w-4xl mx-auto">
        <Card>
          <CardHeader
            title="개발 로드맵"
            description="지속적인 개선과 새로운 기능 추가"
          />
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">Gantt 차트 기본공정 mockup앱과 통합</p>
                  <p className="text-sm text-slate-600">프로젝트 일정 관리 및 공정 추적</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">기획 반영한 UX UI 반영하기</p>
                  <p className="text-sm text-slate-600">사용자 경험 개선 및 디자인 시스템 구축</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">유저 등급관리 업데이트</p>
                  <p className="text-sm text-slate-600">역할 기반 권한 관리 시스템 고도화</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">WBS, EVMS, PMIS 개념기반 기획</p>
                  <p className="text-sm text-slate-600">체계적인 프로젝트 관리 도구 개발</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto text-center">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-slate-300 mb-8 text-lg">
              건설 프로젝트의 효율적인 관리를 경험해보세요
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700 px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                무료로 시작하기
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/posts"
                className="inline-flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/20 px-8 py-3 rounded-lg font-medium transition-all"
              >
                둘러보기
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
