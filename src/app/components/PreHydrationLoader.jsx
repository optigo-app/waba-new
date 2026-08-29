'use client';

import { useEffect, useState } from 'react';

export default function PreHydrationLoader({ show = true, text = 'Preparing your workspace…' }) {
  const [hidden, setHidden] = useState(!show);

  useEffect(() => {
    if (show) {
      setHidden(false);
    } else {
      const t = setTimeout(() => setHidden(true), 400);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (hidden) return null;

  return (
    <>
      <style>{`
        .pre-hydration-loader {
          position: fixed;
          inset: 0;
          background: linear-gradient(160deg, var(--bg-default) 0%, var(--bg-elevated) 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          z-index: 99999;
          transition: opacity 0.4s ease;
        }
        .pre-hydration-loader.fade-out {
          opacity: 0;
          pointer-events: none;
        }
        .pl {
          display: block;
          width: 6.25em;
          height: 6.25em;
        }
        .pl__ring, .pl__ball {
          animation: ring 2s ease-out infinite;
        }
        .pl__ball {
          animation-name: ball;
        }
        @keyframes ring {
          from {
            stroke-dasharray: 0 257 0 0 1 0 0 258;
          }
          25% {
            stroke-dasharray: 0 0 0 0 257 0 258 0;
          }
          50%, to {
            stroke-dasharray: 0 0 0 0 0 515 0 0;
          }
        }
        @keyframes ball {
          from, 50% {
            animation-timing-function: ease-in;
            stroke-dashoffset: 1;
          }
          64% {
            animation-timing-function: ease-in;
            stroke-dashoffset: -109;
          }
          78% {
            animation-timing-function: ease-in;
            stroke-dashoffset: -145;
          }
          92% {
            animation-timing-function: ease-in;
            stroke-dashoffset: -157;
          }
          57%, 71%, 85%, 99%, to {
            animation-timing-function: ease-out;
            stroke-dashoffset: -163;
          }
        }
        .pl-brand {
          font-family: 'Poppins', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
        .pl-brand span {
          background: linear-gradient(90deg, var(--primary-main), var(--wa-header));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .pl-text {
          font-family: 'Poppins', sans-serif;
          font-weight: 500;
          font-size: 0.72rem;
          color: var(--text-placeholder);
          letter-spacing: 0.04em;
          margin-top: -0.5rem;
        }
      `}</style>
      <div
        className={show ? 'pre-hydration-loader' : 'pre-hydration-loader fade-out'}
      >
        <svg className="pl" viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pl-grad1" x1="1" y1="0.5" x2="0" y2="0.5">
              <stop offset="0%" stopColor="var(--wa-header)" />
              <stop offset="100%" stopColor="var(--primary-main)" />
            </linearGradient>
            <linearGradient id="pl-grad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--wa-header)" />
              <stop offset="100%" stopColor="var(--primary-main)" />
            </linearGradient>
          </defs>
          <circle className="pl__ring" cx="100" cy="100" r="82" fill="none" stroke="url(#pl-grad1)" strokeWidth="36" strokeDasharray="0 257 1 257" strokeDashoffset="0.01" strokeLinecap="round" transform="rotate(-90,100,100)" />
          <line className="pl__ball" stroke="url(#pl-grad2)" x1="100" y1="18" x2="100.01" y2="182" strokeWidth="36" strokeDasharray="1 165" strokeLinecap="round" />
        </svg>
        <div className="pl-brand">Optigo<span> WABA</span></div>
        <div className="pl-text">{text}</div>
      </div>
    </>
  );
}
