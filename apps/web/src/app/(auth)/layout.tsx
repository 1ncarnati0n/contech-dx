/**
 * Auth Route Group Layout
 *
 * 인증 관련 페이지(로그인, 회원가입, 비밀번호 재설정)용 레이아웃입니다.
 * NavBar 없이 전체 화면을 사용합니다.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      {children}
    </main>
  );
}
