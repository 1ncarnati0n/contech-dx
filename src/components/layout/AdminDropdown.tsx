'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Shield, TestTube, ChevronDown, Settings } from 'lucide-react';

export default function AdminDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${isOpen
          ? 'bg-admin-100 text-admin-900 dark:bg-admin-900/40 dark:text-admin-100'
          : 'text-admin-600 hover:text-admin-900 hover:bg-admin-50 dark:text-admin-400 dark:hover:text-admin-100 dark:hover:bg-admin-900/20'
          }`}
      >
        <Settings className="w-4 h-4" />
        관리자 페이지
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-1 space-y-0.5">
            <Link
              href="/admin/users"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-admin-700 dark:text-admin-300 hover:bg-admin-50 dark:hover:bg-admin-900/20 rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4" />
              User Manage
            </Link>
            <Link
              href="/test-connection"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-admin-700 dark:text-admin-300 hover:bg-admin-50 dark:hover:bg-admin-900/20 rounded-lg transition-colors"
            >
              <TestTube className="w-4 h-4" />
              DB Checker
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

