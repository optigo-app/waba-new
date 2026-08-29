export const getFlyerTemplate = ({
    qrDataUrl,
    brandName,
    headline,
    tagline,
    displayPhone,
    logoDataUrl,
    poweredByUrl,
}) => {
    const logoHtml = logoDataUrl
        ? `<img src="${logoDataUrl}" alt="Logo" class="flyer-logo" />`
        : `<div class="flyer-logo-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-white)" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>WhatsApp QR Flyer</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
@page { size: A4 portrait; margin: 0; }
html, body { width: 210mm; height: 296mm; overflow: hidden; }
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg-paper); }
.flyer {
  width: 210mm; height: 296mm; background: var(--bg-paper); position: relative;
  display: flex; flex-direction: column; overflow: hidden; page-break-inside: avoid; break-inside: avoid;
}
.flyer-banner {
  flex: 0 0 65mm; background: var(--primary-gradient);
  padding: 12mm 18mm 10mm; color: var(--text-white); position: relative;
}
.flyer-banner::after {
  content: ''; position: absolute; bottom: -10mm; left: 0; right: 0; height: 20mm;
  background: var(--bg-paper); border-radius: 50% 50% 0 0 / 100% 100% 0 0;
}
.flyer-header { display: flex; align-items: center; gap: 4mm; margin-bottom: 5mm; }
.flyer-logo { width: 13mm; height: 13mm; object-fit: contain; border-radius: 3mm; background: rgba(255, 255, 255, 0.15); padding: 2mm; }
.flyer-logo-placeholder { width: 13mm; height: 13mm; background: rgba(255, 255, 255, 0.2); border-radius: 3mm; display: flex; align-items: center; justify-content: center; }
.flyer-brand { font-size: 13pt; font-weight: 700; letter-spacing: 0.5px; text-transform: lowercase; }
.flyer-headline { font-size: 22pt; font-weight: 800; line-height: 1.2; text-align: center; }
.flyer-body { flex: 1 1 auto; min-height: 0; padding: 0 18mm 10mm; display: flex; flex-direction: column; align-items: center; }
.flyer-tagline { font-size: 11pt; color: var(--text-tertiary); text-align: center; margin: 4mm 0 5mm; max-width: 140mm; line-height: 1.5; }
.flyer-body-phone-label { font-size: 9pt; color: var(--text-placeholder); text-align: center; margin-bottom: 1.5mm; }
.flyer-body-phone { font-size: 16pt; font-weight: 700; color: var(--text-primary); text-align: center; margin-bottom: 8mm; letter-spacing: 0.5px; }
.flyer-qr-wrapper { position: relative; display: flex; flex-direction: column; align-items: center; margin-bottom: 8mm; }
.flyer-qr-frame {
  background: var(--bg-paper); border-radius: 5mm; padding: 4mm;
  box-shadow: var(--box-shadow);
  border: 0.5mm solid rgba(29, 170, 97, 0.1);
}
.flyer-qr { width: 76mm; height: 76mm; display: block; }
.flyer-qr-badge {
  margin-top: 4mm;
  background: var(--primary-gradient); color: var(--text-white);
  padding: 3.5mm 10mm; border-radius: 9mm; font-size: 10pt; font-weight: 700;
  white-space: nowrap; box-shadow: var(--box-shadow);
  display: flex; align-items: center; gap: 2.5mm;
}
.flyer-qr-badge svg { width: 4.5mm; height: 4.5mm; }
.flyer-benefits { display: flex; justify-content: center; gap: 4mm; margin: 0; width: 100%; }
.flyer-benefit { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2mm; padding: 6mm 4mm; background: var(--bg-light); border-radius: 4mm; border: 0.3mm solid rgba(29, 170, 97, 0.08); box-shadow: var(--box-shadow); }
.flyer-benefit-icon {
  width: 15mm; height: 15mm; border-radius: 4.5mm;
  background: var(--primary-light-bg);
  border: 0.3mm solid rgba(29, 170, 97, 0.1);
  display: flex; align-items: center; justify-content: center;
}
.flyer-benefit-icon svg { width: 7mm; height: 7mm; color: var(--primary-main); }
.flyer-benefit-label { font-size: 9pt; font-weight: 700; color: var(--text-primary); }
.flyer-benefit-sub { font-size: 7.5pt; color: var(--text-placeholder); line-height: 1.3; }
.flyer-footer {
  flex: 0 0 30mm; background: var(--bg-light); padding: 5mm 18mm;
  border-top: 0.3mm solid var(--border-color); display: flex; align-items: center; justify-content: center;
}
.flyer-powered { display: flex; align-items: center; justify-content: center; gap: 2.5mm; }
.flyer-powered-label { font-size: 8pt; color: var(--text-tertiary); font-weight: 500; }
.flyer-powered-img { height: 13mm; width: auto; object-fit: contain; }
</style>
</head>
<body>
<div class="flyer">
  <div class="flyer-banner">
    <div class="flyer-header">
      ${logoDataUrl ? logoHtml : ''}
      ${brandName ? `<span class="flyer-brand">${brandName}</span>` : ''}
    </div>
    <h1 class="flyer-headline">${headline}</h1>
  </div>
  <div class="flyer-body">
    <p class="flyer-tagline">${tagline}</p>
    <p class="flyer-body-phone-label">Or message us directly at</p>
    <p class="flyer-body-phone">${displayPhone}</p>
    <div class="flyer-qr-wrapper">
      <div class="flyer-qr-frame">
        <img src="${qrDataUrl}" alt="WhatsApp QR Code" class="flyer-qr" />
      </div>
      <div class="flyer-qr-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        Scan to Chat on WhatsApp
      </div>
    </div>
    <div class="flyer-benefits">
      <div class="flyer-benefit">
        <div class="flyer-benefit-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
        <span class="flyer-benefit-label">Quick Support</span>
        <span class="flyer-benefit-sub">Get help instantly</span>
      </div>
      <div class="flyer-benefit">
        <div class="flyer-benefit-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <span class="flyer-benefit-label">Instant Response</span>
        <span class="flyer-benefit-sub">No waiting time</span>
      </div>
      <div class="flyer-benefit">
        <div class="flyer-benefit-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        <span class="flyer-benefit-label">Easy Communication</span>
        <span class="flyer-benefit-sub">Chat anytime</span>
      </div>
    </div>
  </div>
  <div class="flyer-footer">
    <div class="flyer-powered">
      <span class="flyer-powered-label">Powered by</span>
      <img src="${poweredByUrl}" alt="Optigo" class="flyer-powered-img" />
    </div>
  </div>
</div>
<script>
window.onload = function() {
    var doPrint = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(doPrint);
    } else {
        setTimeout(doPrint, 800);
    }
};
</script>
</body>
</html>`;
};
