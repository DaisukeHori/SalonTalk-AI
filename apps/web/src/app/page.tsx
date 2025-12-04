'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // TODO: Check authentication status
    // For now, redirect to login
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">SalonTalk AI</h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    </div>
  );
}
