'use client';

import { useRouter } from 'next/navigation';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Page Not Found</h2>
        <p className="not-found-description">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="not-found-actions">
          <button
            className="not-found-btn not-found-btn-primary"
            onClick={() => router.push('/')}
          >
            <Home size={18} />
            Go Home
          </button>
          <button
            className="not-found-btn not-found-btn-secondary"
            onClick={() => router.back()}
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
      <style jsx>{`
        .not-found-page {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          min-height: calc(100vh - 80px);
          background: var(--bg-light, #f8f9fa);
          padding: 24px;
        }
        .not-found-container {
          text-align: center;
          max-width: 480px;
        }
        .not-found-title {
          font-size: 8rem;
          font-weight: 800;
          line-height: 1;
          margin: 0;
          background: linear-gradient(270deg, rgba(37, 211, 102, 0.85) 0%, #1daa61 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .not-found-subtitle {
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--text-primary, #444050);
          margin: 12px 0 8px;
        }
        .not-found-description {
          font-size: 1rem;
          color: var(--text-secondary, #7d7f85);
          margin: 0 0 32px;
          line-height: 1.6;
        }
        .not-found-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .not-found-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          border-radius: 16px;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: all 0.3s ease;
          font-family: 'Poppins', sans-serif;
        }
        .not-found-btn-primary {
          background: #1daa61;
          color: #fff;
        }
        .not-found-btn-primary:hover {
          background: #1a9a58;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(29, 170, 97, 0.3);
        }
        .not-found-btn-secondary {
          background: var(--bg-elevated, #ebebed);
          color: var(--text-secondary, #7d7f85);
        }
        .not-found-btn-secondary:hover {
          background: #1daa61;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(29, 170, 97, 0.2);
        }
      `}</style>
    </div>
  );
}
