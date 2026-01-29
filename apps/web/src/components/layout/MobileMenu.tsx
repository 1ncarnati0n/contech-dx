'use client';

import { useState, useEffect, useCallback } from 'react';
import { Menu, X, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/lib/types';

import { filterMenuItems, groupItemsBySection, allMenuItems } from './mobile-menu/menuData';
import MenuItem from './mobile-menu/MenuItem';
import MenuSearch from './mobile-menu/MenuSearch';
import UserSection from './mobile-menu/UserSection';

interface MobileMenuProps {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  isAdmin: boolean;
}

// 애니메이션 설정
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const sidebarVariants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 40,
    },
  },
  exit: {
    x: '100%',
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 40,
    },
  },
};

export default function MobileMenu({ user, profile, isAdmin }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const supabase = createClient();

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
    setIsOpen(false);
  };

  // 메뉴 닫기
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setSearchQuery(''); // 검색어 초기화
  }, []);

  // ESC 키로 메뉴 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeMenu]);

  // 메뉴 열림 시 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 필터링된 메뉴 아이템
  const filteredItems = filterMenuItems(searchQuery, isAdmin);
  const groupedItems = groupItemsBySection(filteredItems);
  const totalItems = isAdmin ? allMenuItems.length : allMenuItems.filter(item => !item.isAdmin).length;

  return (
    <>
      {/* 햄버거 버튼 (애니메이션 적용) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
        aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
        aria-expanded={isOpen}
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* 오버레이 (배경 블러 효과) */}
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
              onClick={closeMenu}
              aria-hidden="true"
            />

            {/* 사이드바 */}
            <motion.div
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-white dark:bg-zinc-900 shadow-2xl z-50 md:hidden"
            >
              <div className="flex flex-col h-full">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">메뉴</h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={closeMenu}
                    className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                    aria-label="메뉴 닫기"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* 검색 필드 */}
                <MenuSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  resultCount={filteredItems.length}
                  totalCount={totalItems}
                />

                {/* 메뉴 아이템들 */}
                <nav className="flex-1 overflow-y-auto px-3 pb-3">
                  <AnimatePresence mode="wait">
                    {filteredItems.length > 0 ? (
                      <motion.div
                        key="menu-items"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-1"
                      >
                        {groupedItems.map((section, sectionIndex) => (
                          <div key={section.title}>
                            {/* 섹션 헤더 */}
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: sectionIndex * 0.1 }}
                              className={`py-2 ${sectionIndex > 0 ? 'pt-4' : ''}`}
                            >
                              <p className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                                section.isAdmin
                                  ? 'text-orange-500 dark:text-orange-400'
                                  : 'text-zinc-400 dark:text-zinc-500'
                              }`}>
                                {section.isAdmin && <Settings className="w-3.5 h-3.5" />}
                                {section.title}
                              </p>
                            </motion.div>

                            {/* 메뉴 아이템 */}
                            {section.items.map((item, index) => (
                              <MenuItem
                                key={item.href}
                                item={item}
                                index={sectionIndex * 10 + index}
                                onClose={closeMenu}
                              />
                            ))}
                          </div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="no-results"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                          <Menu className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          검색 결과가 없습니다
                        </p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="mt-2 text-xs text-accent-600 dark:text-accent-400 hover:underline"
                        >
                          검색어 지우기
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </nav>

                {/* 하단 사용자 정보 */}
                <div className="border-t border-zinc-200 dark:border-zinc-700 p-3">
                  <UserSection
                    user={user}
                    profile={profile}
                    onLogout={handleLogout}
                    onClose={closeMenu}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
