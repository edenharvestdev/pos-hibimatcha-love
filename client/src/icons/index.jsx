// ============================================
// hibi MATCHA — Custom Icon Library
// 24×24 grid, 1.5px stroke, round caps, outline style
// ============================================

import React from "react";


export const Icon = ({ children, size = 20, stroke = 1.5, className = "", style = {}, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

// Brand mark — minimal whisk + bowl
export const IconBrand = (p) => (
  <Icon {...p}>
    <path d="M4 14c0 3.5 3.5 6 8 6s8-2.5 8-6" />
    <path d="M3 14h18" />
    <path d="M9 4v8M12 3v9M15 4v8" />
    <path d="M9 4q1.5-1 3 0t3 0" opacity=".6"/>
  </Icon>
);

// Navigation
export const IconHome = (p) => <Icon {...p}><path d="M3 11l9-8 9 8" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></Icon>;
export const IconPOS = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M7 21h10M9 17v4M15 17v4" /><path d="M7 8h10M7 12h6" /></Icon>;
export const IconKitchen = (p) => <Icon {...p}><path d="M6 3v6a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3" /><path d="M8 11v10" /><path d="M16 3c-2 1-3 3-3 6s1 5 3 5v7" /></Icon>;
export const IconOrders = (p) => <Icon {...p}><path d="M5 4h14l-1.5 14a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 4z" /><path d="M9 8v3M15 8v3" /></Icon>;
export const IconMenu = (p) => <Icon {...p}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></Icon>;
export const IconCategories = (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></Icon>;
export const IconOptions = (p) => <Icon {...p}><circle cx="6" cy="6" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="18" r="2"/><path d="M8 6h12M4 12h12M8 18h12"/></Icon>;
export const IconDiscount = (p) => <Icon {...p}><path d="M9 4h6l5 5v6l-5 5H9l-5-5V9l5-5z"/><path d="M9 15l6-6"/><circle cx="9.5" cy="9.5" r=".8" fill="currentColor"/><circle cx="14.5" cy="14.5" r=".8" fill="currentColor"/></Icon>;
export const IconPayment = (p) => <Icon {...p}><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/><path d="M6 15h3"/></Icon>;
export const IconStaff = (p) => <Icon {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2.5 0 4.5 1.4 5 4"/></Icon>;
export const IconReports = (p) => <Icon {...p}><path d="M4 20V10M10 20V4M16 20v-6M22 20H2"/></Icon>;
export const IconSOP = (p) => <Icon {...p}><path d="M7 3h8l4 4v12.5A2.5 2.5 0 0 1 16.5 22h-9A2.5 2.5 0 0 1 5 19.5v-14A2.5 2.5 0 0 1 7.5 3z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/></Icon>;
export const IconInventory = (p) => <Icon {...p}><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></Icon>;
export const IconSupplier = (p) => <Icon {...p}><path d="M3 16V8h11v8"/><path d="M14 11h5l2 3v2h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></Icon>;
export const IconFranchise = (p) => <Icon {...p}><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-7h6v7"/><path d="M3 21h18"/></Icon>;
export const IconSettings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></Icon>;
export const IconBook = (p) => <Icon {...p}><path d="M4 5a2 2 0 0 1 2-2h13v17H6a2 2 0 0 1-2-2z"/><path d="M19 18H6a2 2 0 0 0-2 2"/></Icon>;

// Actions
export const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
export const IconPlay = (p) => <Icon {...p}><polygon points="5 3 19 12 5 21 5 3"/></Icon>;
export const IconEdit = (p) => <Icon {...p}><path d="M14 4l6 6L10 20H4v-6z"/><path d="M13 5l6 6"/></Icon>;
export const IconTrash = (p) => <Icon {...p}><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-13"/><path d="M10 11v6M14 11v6"/></Icon>;
export const IconSave = (p) => <Icon {...p}><path d="M5 3h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v6h9V3"/><path d="M7 21v-6h10v6"/></Icon>;
export const IconShare = (p) => <Icon {...p}><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 11l7.6-4.5M8.2 13l7.6 4.5"/></Icon>;
export const IconCopy = (p) => <Icon {...p}><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M3 16V5a2 2 0 0 1 2-2h11"/></Icon>;
export const IconPrint = (p) => <Icon {...p}><path d="M6 8V3h12v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M6 14h12v7H6z"/></Icon>;
export const IconExport = (p) => <Icon {...p}><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></Icon>;
export const IconImport = (p) => <Icon {...p}><path d="M12 15V3"/><path d="M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></Icon>;
export const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></Icon>;
export const IconFilter = (p) => <Icon {...p}><path d="M3 5h18M6 12h12M10 19h4"/></Icon>;
export const IconSort = (p) => <Icon {...p}><path d="M7 4v16M3 8l4-4 4 4"/><path d="M17 20V4M21 16l-4 4-4-4"/></Icon>;
export const IconRefresh = (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></Icon>;
export const IconMore = (p) => <Icon {...p}><circle cx="6" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/></Icon>;
export const IconMoreV = (p) => <Icon {...p}><circle cx="12" cy="6" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="18" r="1.4" fill="currentColor"/></Icon>;
export const IconChevDown = (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>;
export const IconChevRight = (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>;
export const IconChevLeft = (p) => <Icon {...p}><path d="M15 6l-6 6 6 6"/></Icon>;
export const IconChevUp = (p) => <Icon {...p}><path d="M6 15l6-6 6 6"/></Icon>;
export const IconX = (p) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18"/></Icon>;
export const IconCheck = (p) => <Icon {...p}><path d="M5 12l5 5L20 7"/></Icon>;
export const IconCheckCircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></Icon>;
export const IconWarning = (p) => <Icon {...p}><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18.2v.2" strokeLinecap="round"/></Icon>;
export const IconError = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></Icon>;
export const IconInfo = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 8.1v.1" strokeLinecap="round"/></Icon>;
export const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
export const IconCalendar = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></Icon>;
export const IconBell = (p) => <Icon {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/></Icon>;
export const IconSun = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5"/></Icon>;
export const IconMoon = (p) => <Icon {...p}><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></Icon>;
export const IconUser = (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></Icon>;
export const IconUsers = (p) => <Icon {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2 20c.5-3.5 3-5.5 7-5.5s6.5 2 7 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5 1.5 5.5 4.5"/></Icon>;
export const IconBuilding = (p) => <Icon {...p}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/><path d="M10 21v-3h4v3"/></Icon>;
export const IconGlobe = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/></Icon>;
export const IconHeart = (p) => <Icon {...p}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></Icon>;
export const IconStar = (p) => <Icon {...p}><path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></Icon>;
export const IconBookmark = (p) => <Icon {...p}><path d="M6 3h12v18l-6-4-6 4z"/></Icon>;
export const IconEye = (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></Icon>;
export const IconEyeOff = (p) => <Icon {...p}><path d="M3 3l18 18"/><path d="M10.5 6.3A10 10 0 0 1 22 12s-1.5 3-4 5"/><path d="M6 6.3C3.5 8 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.9-.8"/><path d="M9 9.5a3 3 0 0 0 4 4"/></Icon>;
export const IconLock = (p) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></Icon>;
export const IconLogout = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>;
export const IconTag = (p) => <Icon {...p}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/></Icon>;
export const IconCart = (p) => <Icon {...p}><path d="M3 4h2l2 12h12l2-8H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></Icon>;
export const IconReceipt = (p) => <Icon {...p}><path d="M5 3h14v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L5 21z"/><path d="M9 8h6M9 12h6M9 16h4"/></Icon>;
export const IconQR = (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v1"/></Icon>;
export const IconWallet = (p) => <Icon {...p}><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="15" r="1.2" fill="currentColor"/></Icon>;
export const IconCoin = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9h4.5a2 2 0 0 1 0 4H10a2 2 0 0 0 0 4h5"/></Icon>;

// Food/cafe
export const IconCupHot = (p) => <Icon {...p}><path d="M5 9h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M17 11h2a2 2 0 0 1 0 6h-2"/><path d="M9 4c0 1.5 1 2 1 3.5M13 4c0 1.5 1 2 1 3.5" opacity=".7"/></Icon>;
export const IconCupIced = (p) => <Icon {...p}><path d="M6 7h12l-1.3 13a2 2 0 0 1-2 1.8h-5.4a2 2 0 0 1-2-1.8z"/><path d="M6 12h12"/><path d="M10 4l-1 3M14 4l1 3" opacity=".6"/></Icon>;
export const IconCake = (p) => <Icon {...p}><path d="M3 21V12a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9"/><path d="M3 21h18M3 15h18"/><path d="M8 7v3M12 6v4M16 7v3"/><circle cx="8" cy="5" r="1"/><circle cx="12" cy="4" r="1"/><circle cx="16" cy="5" r="1"/></Icon>;
export const IconWhisk = (p) => <Icon {...p}><path d="M12 3v8" /><path d="M8 12c0 2 2 3 4 3s4-1 4-3"/><path d="M9 4v8M12 3v9M15 4v8" opacity=".9"/><path d="M9 14l-1 7M15 14l1 7M12 15v6"/></Icon>;
export const IconLeaf = (p) => <Icon {...p}><path d="M4 20c0-8 5-15 16-16-1 11-8 16-16 16z"/><path d="M4 20c4-4 8-8 16-16"/></Icon>;
export const IconBowl = (p) => <Icon {...p}><path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M2 20h20"/><path d="M9 8c0-2 1-3 3-3s3 1 3 3" opacity=".6"/></Icon>;

// Inventory
export const IconBox = (p) => <Icon {...p}><path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/></Icon>;
export const IconTruck = (p) => <Icon {...p}><rect x="2" y="7" width="13" height="10" rx="1"/><path d="M15 10h4l2 3v4h-6"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></Icon>;
export const IconScale = (p) => <Icon {...p}><path d="M12 4v17M5 21h14"/><path d="M6 11l3-7h6l3 7"/><path d="M3 11h6l-3 6zM15 11h6l-3 6z"/></Icon>;

// Hardware
export const IconScanner = (p) => <Icon {...p}><path d="M4 7V5a2 2 0 0 1 2-2h2M20 7V5a2 2 0 0 0-2-2h-2M4 17v2a2 2 0 0 0 2 2h2M20 17v2a2 2 0 0 1-2 2h-2"/><path d="M3 12h18"/></Icon>;
export const IconPhone = (p) => <Icon {...p}><rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="18" r="1" fill="currentColor"/></Icon>;
export const IconCommand = (p) => <Icon {...p}><path d="M9 6a3 3 0 1 0 0 6h6a3 3 0 1 0 0-6"/><path d="M9 18a3 3 0 1 1 0-6h6a3 3 0 1 1 0 6"/></Icon>;
export const IconMenuLines = (p) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h10"/></Icon>;
export const IconGrid = (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Icon>;
export const IconList = (p) => <Icon {...p}><circle cx="5" cy="6" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="18" r="1.2" fill="currentColor"/><path d="M10 6h11M10 12h11M10 18h11"/></Icon>;
export const IconCards = (p) => <Icon {...p}><rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/></Icon>;
export const IconUndo = (p) => <Icon {...p}><path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/></Icon>;
export const IconRedo = (p) => <Icon {...p}><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h4"/></Icon>;
export const IconFlag = (p) => <Icon {...p}><path d="M5 21V4l12 2-2 5 2 5-12-2"/></Icon>;
export const IconCheckList = (p) => <Icon {...p}><path d="M4 6l2 2 3-3M4 13l2 2 3-3M4 20l2 2 3-3"/><path d="M13 6h8M13 13h8M13 20h8"/></Icon>;
export const IconHelp = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .7-1 1.5v.7M12 16.2v.1" strokeLinecap="round"/></Icon>;
export const IconLightning = (p) => <Icon {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></Icon>;

// Whisk loading animation
export const WhiskLoader = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--matcha-600)' }}>
    <g style={{ transformOrigin: '12px 14px', animation: 'whisk 900ms var(--ease-in-out) infinite' }}>
      <path d="M12 3v9"/>
      <path d="M9 4v8M15 4v8" opacity=".8"/>
      <path d="M9 12c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5"/>
      <path d="M9 14l-1 6M15 14l1 6M12 15v5"/>
    </g>
  </svg>
);

// Empty state illustrations
export const EmptyCart = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--stone-400)' }}>
    <path d="M40 55h44l-4 36c-.5 4-3.6 7-7.5 7H51.5c-3.9 0-7-3-7.5-7z"/>
    <path d="M82 55c4 0 7 3 7 7s-3 7-7 7"/>
    <path d="M50 38c0 4 3 6 3 12M60 35c0 4 3 6 3 12M70 38c0 4 3 6 3 12" opacity=".6"/>
    <path d="M30 100h60" strokeDasharray="2 4" opacity=".4"/>
  </svg>
);

export const EmptyOrders = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--stone-400)' }}>
    <ellipse cx="60" cy="62" rx="38" ry="8"/>
    <path d="M22 62v6c0 4.4 17 8 38 8s38-3.6 38-8v-6"/>
    <path d="M50 50c0-3 2-5 4-5h12c2 0 4 2 4 5" opacity=".5"/>
  </svg>
);

export const EmptyShelf = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--stone-400)' }}>
    <path d="M20 30h80M20 60h80M20 90h80"/>
    <path d="M20 30v60M100 30v60"/>
    <rect x="30" y="65" width="14" height="20" opacity=".4"/>
    <rect x="76" y="35" width="14" height="22" opacity=".4"/>
  </svg>
);

export const EmptyScroll = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--stone-400)' }}>
    <path d="M35 30h45c4 0 8 4 8 8v44c0 4-4 8-8 8H35a8 8 0 0 1 0-16h36V46c0-4-4-8-8-8H35"/>
    <path d="M35 30a8 8 0 0 0 0 16h36"/>
    <path d="M50 56h26M50 64h22M50 72h18" opacity=".5"/>
  </svg>
);

export const EmptyZen = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--stone-400)' }}>
    <ellipse cx="60" cy="90" rx="50" ry="6"/>
    <path d="M25 90c4-12 8-18 14-18s8 6 14 18M55 90c5-22 11-30 18-30s12 8 17 30" opacity=".7"/>
    <circle cx="42" cy="78" r="1" fill="currentColor"/>
    <circle cx="72" cy="72" r="1" fill="currentColor"/>
    <circle cx="58" cy="84" r="1" fill="currentColor"/>
  </svg>
);

