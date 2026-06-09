import { useState, useEffect } from 'react';

// Detect if running in standalone mode (already installed as PWA)
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

// Detect device type
function getDeviceType() {
  const ua = navigator.userAgent;
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMac = /Macintosh/.test(ua) && navigator.maxTouchPoints === 0;
  const isWindows = /Windows/.test(ua);
  
  if (isIPad) return 'ipad';
  if (isIPhone) return 'iphone';
  if (isAndroid) return 'android';
  if (isMac) return 'mac';
  if (isWindows) return 'windows';
  return 'desktop';
}

// Detect browser
function getBrowser() {
  const ua = navigator.userAgent;
  if (/CriOS/.test(ua)) return 'chrome-ios';
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'safari';
  if (/Chrome/.test(ua)) return 'chrome';
  if (/Firefox/.test(ua)) return 'firefox';
  return 'other';
}

const ShareIcon = () => (
  <svg className="w-5 h-5 inline-block mx-1 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
    <polyline points="16,6 12,2 8,6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5 inline-block mx-1 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

const ThreeDotsIcon = () => (
  <svg className="w-5 h-5 inline-block mx-1 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2"/>
    <circle cx="12" cy="12" r="2"/>
    <circle cx="12" cy="19" r="2"/>
  </svg>
);

function getInstructions(device, browser) {
  if (device === 'ipad' || device === 'iphone') {
    if (browser === 'safari') {
      return {
        title: device === 'ipad' ? 'ติดตั้งบน iPad' : 'ติดตั้งบน iPhone',
        steps: [
          { text: 'กดปุ่ม Share', icon: <ShareIcon />, desc: 'ที่แถบด้านล่าง (หรือด้านบน)' },
          { text: 'เลื่อนหา "เพิ่มไปยังหน้าจอโฮม"', icon: <PlusIcon />, desc: 'Add to Home Screen' },
          { text: 'กด "เพิ่ม" ที่มุมขวาบน', icon: null, desc: 'แอพจะปรากฏบนหน้าจอโฮม' },
        ]
      };
    }
    return {
      title: device === 'ipad' ? 'ติดตั้งบน iPad' : 'ติดตั้งบน iPhone',
      steps: [
        { text: 'เปิดเว็บนี้ใน Safari', icon: null, desc: 'คัดลอก URL แล้วเปิดใน Safari' },
        { text: 'กดปุ่ม Share', icon: <ShareIcon />, desc: 'ที่แถบด้านล่าง' },
        { text: 'เลือก "เพิ่มไปยังหน้าจอโฮม"', icon: <PlusIcon />, desc: 'Add to Home Screen' },
      ]
    };
  }

  if (device === 'android') {
    return {
      title: 'ติดตั้งบน Android',
      steps: [
        { text: 'กดเมนู', icon: <ThreeDotsIcon />, desc: 'ที่มุมขวาบนของ Chrome' },
        { text: 'เลือก "ติดตั้งแอป"', icon: null, desc: 'หรือ "เพิ่มไปยังหน้าจอหลัก"' },
        { text: 'กด "ติดตั้ง"', icon: null, desc: 'แอพจะปรากฏบนหน้าจอหลัก' },
      ]
    };
  }

  // Desktop (Mac/Windows)
  return {
    title: 'ติดตั้งบนคอมพิวเตอร์',
    steps: [
      { text: 'กดไอคอน Install', icon: null, desc: 'ที่แถบ URL ด้านขวา (รูปจอ+ลูกศร)' },
      { text: 'กด "Install" หรือ "ติดตั้ง"', icon: null, desc: 'ในป๊อปอัพที่ปรากฏ' },
      { text: 'แอพจะเปิดในหน้าต่างแยก', icon: null, desc: 'เหมือนแอพเดสก์ท็อปทั่วไป' },
    ]
  };
}

export function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [deviceType, setDeviceType] = useState('desktop');
  const [browser, setBrowser] = useState('other');

  useEffect(() => {
    // Don't show if already installed
    if (isStandalone()) return;

    // Check if dismissed recently (don't show for 3 days)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 3 * 24 * 60 * 60 * 1000) return;

    setDeviceType(getDeviceType());
    setBrowser(getBrowser());

    // Show after 2 seconds
    const timer = setTimeout(() => setShow(true), 2000);

    // Android/Chrome: listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
        localStorage.setItem('pwa-install-dismissed', String(Date.now()));
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
  };

  if (!show) return null;

  const instructions = getInstructions(deviceType, browser);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] animate-in fade-in duration-200"
        onClick={handleDismiss}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          {/* Header with icon */}
          <div className="relative bg-gradient-to-br from-[#1e3a2b] to-[#2d5a40] rounded-t-3xl p-6 text-center overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <img 
              src="/manus-storage/icon-192_5e551bf9.png" 
              alt="Hibi Matcha" 
              className="w-20 h-20 rounded-2xl mx-auto shadow-lg border-2 border-white/20 relative z-10"
            />
            <h2 className="text-white font-bold text-lg mt-3 relative z-10">Hibi 日々 Matcha</h2>
            <p className="text-white/70 text-sm mt-1 relative z-10">Store Operation System</p>
          </div>

          {/* Body */}
          <div className="p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-1">
              {instructions.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              ติดตั้งเพื่อใช้งานแบบเต็มจอ เร็วขึ้น และเข้าถึงได้ง่าย
            </p>

            {/* Steps */}
            <div className="space-y-3">
              {instructions.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1e3a2b] text-white flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center flex-wrap">
                      {step.text}
                      {step.icon}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Native install button for Android/Chrome */}
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                className="w-full mt-4 py-3 bg-[#1e3a2b] hover:bg-[#2d5a40] text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.97] shadow-lg shadow-[#1e3a2b]/20"
              >
                ติดตั้งเลย
              </button>
            )}

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="w-full mt-3 py-2.5 text-gray-500 dark:text-gray-400 text-sm font-medium hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              ไว้ทีหลัง
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
