export const getStandeeTemplate = ({
    qrDataUrl,
    brandName,
    headline,
    tagline,
    displayPhone,
    logoDataUrl,
    poweredByUrl,
}) => {
    const logoHtml = logoDataUrl
        ? `<img class="company-logo-img" src="${logoDataUrl}" alt="Logo" />`
        : brandName
            ? `<div class="company-logo-text"><span style="color: var(--wa-solid-green);">✦</span> ${brandName}</div>`
            : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>WhatsApp Connect QR Standee</title>
<link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet" />
<style>
:root {
    --wa-gradient: linear-gradient(270deg, rgba(37, 211, 102, 0.85) 0%, #1daa61 100%);
    --wa-solid-green: #1daa61;
    --bg-cream: #fbf9f4;
    --text-dark: #1c2e24;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body { font-family: 'Poppins', sans-serif; background-color: var(--bg-cream); display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 10px; }
.connect-card { width: 480px; height: 830px; background-color: var(--bg-cream); position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 10px 40px rgba(0,0,0,0.08); print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.top-left-accent, .top-right-accent { position: absolute; top: 0; width: 100px; height: 100px; z-index: 1; }
.top-left-accent { left: 0; }
.top-right-accent { right: 0; transform: scaleX(-1); }
.logo-area { margin-top: 20px; z-index: 2; height: 45px; display: flex; align-items: center; justify-content: center; }
.company-logo-img { max-height: 100%; max-width: 170px; object-fit: contain; display: block; }
.company-logo-text { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.35rem; color: var(--text-dark); letter-spacing: 0.5px; }
.header { text-align: center; margin-top: 15px; z-index: 2; }
.header h1 { color: var(--wa-solid-green); font-size: 2.6rem; font-weight: 800; letter-spacing: 2px; line-height: 1.1; }
.qr-container { margin-top: 8px; background: #ffffff; padding: 14px; border-radius: 12px; box-shadow: 0 8px 24px rgba(29, 170, 97, 0.1); z-index: 2; }
.qr-code { width: 260px; height: 260px; display: block; }
.info-msg { color: var(--text-dark); font-size: 0.95rem; font-weight: 600; text-align: center; max-width: 85%; margin-top: 0; padding-top: 30px; line-height: 1.4; z-index: 2; }
.phone-display { display: flex; align-items: center; gap: 8px; margin: 10px 0; color: var(--wa-solid-green); font-weight: 700; font-size: 1.2rem; z-index: 2; }
.phone-icon { width: 18px; height: 18px; fill: var(--wa-solid-green); }
.deco-icon { position: absolute; color: var(--wa-solid-green); opacity: 0.4; font-size: 15px; line-height: 1.3; letter-spacing: 2px; z-index: 1; }
.dots-left { top: 150px; left: 22px; writing-mode: vertical-rl; font-weight: bold; }
.arrows-right { top: 150px; right: 28px; font-weight: bold; }
.arrows-left { bottom: 200px; left: 28px; font-weight: bold; }
.crosses-right { bottom: 200px; right: 28px; writing-mode: vertical-rl; font-weight: bold; }
.footer-panel { position: absolute; bottom: 0; width: 100%; height: 180px; background: var(--wa-gradient); border-top-left-radius: 50% 40px; border-top-right-radius: 50% 40px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; z-index: 2; padding: 18px 20px 12px 20px; }
.thank-you-text { font-family: 'Great Vibes', cursive !important; color: #ffffff !important; font-size: 4rem !important; letter-spacing: 1px !important; line-height: 1 !important; margin-top: -8px !important; }
.powered-by-wrapper { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.powered-by-label { color: rgba(255, 255, 255, 0.85); font-size: 0.6rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
.powered-by-image { height: 45px; max-width: 150px; object-fit: contain; display: block; filter: drop-shadow(0px 1px 3px rgba(0,0,0,0.15)); }
@media print {
    body { background: none; padding: 0; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .connect-card { box-shadow: none; border: none; page-break-inside: avoid; margin: 0 auto; color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4 portrait; margin: 0mm; }
}
</style>
</head>
<body>
<div class="connect-card">
    <svg width="0" height="0" style="position: absolute;">
        <defs>
            <linearGradient id="waGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stop-color="rgba(37, 211, 102, 0.85)" />
                <stop offset="100%" stop-color="#1daa61" />
            </linearGradient>
        </defs>
    </svg>
    <svg class="top-left-accent" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0H40L0 40V0Z" fill="url(#waGrad)"/>
        <path d="M45 0H65L0 65V45L45 0Z" fill="url(#waGrad)" opacity="0.8"/>
        <path d="M70 0H85L0 85V70L70 0Z" fill="url(#waGrad)" opacity="0.5"/>
        <rect x="5" y="75" width="12" height="12" fill="url(#waGrad)" transform="rotate(45 5 75)"/>
        <rect x="75" y="5" width="10" height="10" fill="url(#waGrad)" transform="rotate(45 75 5)"/>
    </svg>
    <svg class="top-right-accent" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0H40L0 40V0Z" fill="url(#waGrad)"/>
        <path d="M45 0H65L0 65V45L45 0Z" fill="url(#waGrad)" opacity="0.8"/>
        <path d="M70 0H85L0 85V70L70 0Z" fill="url(#waGrad)" opacity="0.5"/>
        <rect x="5" y="75" width="12" height="12" fill="url(#waGrad)" transform="rotate(45 5 75)"/>
    </svg>
    <div class="logo-area">${logoHtml}</div>
    <div class="deco-icon dots-left">••••••••</div>
    <div class="deco-icon arrows-right">&raquo;<br>&raquo;<br>&raquo;</div>
    <div class="deco-icon arrows-left">&laquo;<br>&laquo;<br>&laquo;</div>
    <div class="deco-icon crosses-right">× × × ×</div>
    <div class="header">
        <h1>${headline || 'CONNECT'}</h1>
    </div>
    <div class="phone-display">
        <svg class="phone-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
        </svg>
        <span>${displayPhone}</span>
    </div>
    <div class="qr-container">
        <img class="qr-code" src="${qrDataUrl}" alt="WhatsApp Connect QR Code" />
    </div>
    <p class="info-msg">${tagline || 'Scan to Chat'}</p>
    <div class="footer-panel">
        <div class="thank-you-text">Thank You</div>
        <div class="powered-by-wrapper">
            <div class="powered-by-label">Powered by</div>
            <img class="powered-by-image" src="${poweredByUrl}" alt="Optigo Logo" />
        </div>
    </div>
</div>
<script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };</script>
</body>
</html>`;
};
