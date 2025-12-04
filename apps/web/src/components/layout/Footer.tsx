/**
 * Footer Component
 * フッターコンポーネント
 */
import Link from 'next/link';

interface FooterProps {
  showLinks?: boolean;
}

export function Footer({ showLinks = true }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-500">
          &copy; {currentYear} SalonTalk AI. All rights reserved.
        </div>

        {showLinks && (
          <nav className="flex items-center gap-6">
            <Link
              href="/help"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ヘルプ
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              プライバシーポリシー
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              利用規約
            </Link>
            <a
              href="mailto:support@salontalk.ai"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              お問い合わせ
            </a>
          </nav>
        )}

        <div className="text-xs text-gray-400">
          Version 1.0.0
        </div>
      </div>
    </footer>
  );
}

export default Footer;
