/**
 * Fordon Systems — front-end application (Vanilla JS, ES2018+, zero dependencies).
 *
 * Structure:
 *   1. Content data (pillars, logo tiles, form options) — single source of truth
 *   2. Utilities (DOM, storage, ids)
 *   3. Tracking: Meta Pixel, trackPageVisit(), trackLeadEvent()
 *   4. Lead submission: submitLeadForm()
 *   5. Shared components: header + interactive logo, footer, breadcrumbs, pillar nav,
 *      hex grid, process steps, social links
 *   6. Lead wizard (3-step qualification form)
 *   7. Visual effects: network background, reveal, counters
 *   8. Stats page
 *   9. Bootstrap + public API (window.FordonApp)
 *
 * Security notes: user-provided values are never injected with innerHTML —
 * they are written through textContent / DOM APIs. innerHTML is only used for
 * static, trusted templates defined in this file.
 */
(function () {
  "use strict";

  const CONFIG = window.APP_CONFIG || {};
  const BRAND = Object.assign(
    { name: "FORDON SYSTEMS", legalName: "Fordon Systems", person: "Michał Zieliński", role: "CEO i Konsultant" },
    CONFIG.brand || {}
  );
  const ENDPOINTS = Object.assign(
    { leads: "/api/leads", visit: "/api/analytics/visit", summary: "/api/analytics/summary" },
    CONFIG.endpoints || {}
  );

  const STORAGE_KEYS = {
    analytics: "fs_analytics_v1",
    leads: "fs_leads_v1",
    notrack: "fs_notrack",
    session: "fs_session_v1",
    attribution: "fs_attribution_v1",
    statsToken: "fs_stats_token",
    statsDemo: "fs_stats_demo"
  };
  const MAX_STORED_LEADS = 50;
  const API_TIMEOUT_MS = 10000;
  const MIN_FORM_FILL_MS = 2500; // bots submit instantly; humans never finish 3 steps this fast
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ==========================================================================
     1. CONTENT DATA
     ========================================================================== */

  const PILLARS = [
    {
      id: "software",
      name: "Software & Aplikacje",
      href: "software.html",
      icon: "code",
      short: "Dedykowane aplikacje .NET, mikroserwisy i autorskie moduły produktowe.",
      long: "Aplikacje szyte na miarę procesu: .NET / C#, Blazor, Angular i architektura mikroserwisowa — oraz rozwijane autorskie rozwiązania Fordon Systems.",
      more: "Zobacz szczegóły"
    },
    {
      id: "infra",
      name: "Infrastruktura IT",
      href: "infrastruktura.html",
      icon: "server",
      short: "Stabilne serwery, ciągłość działania i bezpieczne wdrożenia.",
      long: "Windows Server, IIS, Docker / WSL2, Change Management i Disaster Recovery — infrastruktura, która nie zatrzymuje operacji.",
      more: "Zobacz szczegóły"
    },
    {
      id: "sql",
      name: "Dane & Bazy SQL",
      href: "bazy-danych.html",
      icon: "database",
      short: "Wydajne bazy, porządek w danych i koniec ze spowolnieniami.",
      long: "MS SQL Server i Oracle: optymalizacja zapytań, uporządkowane struktury danych i bezpieczne migracje z pełną walidacją.",
      more: "Zobacz szczegóły"
    },
    {
      id: "integration",
      name: "Integracje & Automatyzacja",
      href: "integracje.html",
      icon: "flow",
      short: "Spięte systemy i koniec z ręczną, powtarzalną pracą.",
      long: "API i przepływy danych między ERP, WMS i CRM oraz automatyzacja w PowerShell — dane płyną same, a zespół odzyskuje czas.",
      more: "Zobacz szczegóły"
    },
    {
      id: "audit",
      name: "Audyty & Optymalizacja",
      href: "audyty.html",
      icon: "audit",
      short: "Diagnoza wąskich gardeł, testy i bezpieczeństwo zmian.",
      long: "Audyty techniczne i procesowe, Root Cause Analysis, Lean Six Sigma, walidacja zmian oraz SOP / Runbooks.",
      more: "Zobacz szczegóły"
    },
    {
      id: "consulting",
      name: "Konsulting & Kontakt",
      wizardLabel: "Konsulting strategiczny / Inne wyzwanie",
      href: "kontakt.html",
      icon: "chat",
      short: "Bezpośrednie doradztwo B2B i szybka ścieżka do rozmowy.",
      long: "Wyzwanie nie mieści się w jednej kategorii? Umów bezpłatną 30-minutową konsultację z Michałem Zielińskim.",
      more: "Umów konsultację"
    }
  ];

  /* Logo: flat-top honeycomb cluster. Angles point to edge-adjacent neighbours (SVG y axis points down). */
  const LOGO_TILES = [
    { key: "core", title: "CORE", sub: ".NET", label: "Core: .NET & Architektura", angle: null },
    { key: "security", title: "SECURITY", sub: "INFRA", label: "Security: Infrastruktura & Bezpieczeństwo", angle: 210 },
    { key: "data", title: "DATA", sub: "SQL", label: "Data: SQL & Oracle", angle: 330 },
    { key: "efficiency", title: "EFFICIENCY", sub: "LEAN", label: "Efficiency: Lean Six Sigma", angle: 150 },
    { key: "operations", title: "OPERATIONS", sub: "ITIL", label: "Operations: ITIL & Change Management", angle: 30 }
  ];

  const COMPANY_SIZES = [
    { value: "1-10", label: "1–10 pracowników" },
    { value: "11-50", label: "11–50 pracowników" },
    { value: "51-250", label: "51–250 pracowników" },
    { value: "250+", label: "250+ pracowników" }
  ];

  const URGENCY_OPTIONS = [
    { value: "urgent", label: "Pilne (bieżący problem / wąskie gardło)" },
    { value: "1-3-months", label: "W ciągu 1–3 miesięcy" },
    { value: "strategic", label: "Planowanie strategiczne" }
  ];

  const CONTACT_CHANNELS = [
    { value: "teams", label: (CONFIG.contact && CONFIG.contact.teamsLabel) || "Microsoft Teams", desc: "Rozmowa online / udostępnienie ekranu", icon: "video" },
    { value: "email", label: "E-mail", desc: "Konkretna odpowiedź / wstępna ocena na skrzynkę firmową", icon: "mail" },
    { value: "phone", label: "Telefon", desc: "Krótka rozmowa wprowadzająca", icon: "phone" }
  ];

  const PROCESS_STEPS = [
    { title: "Konsultacja i diagnoza", tag: "Teams / E-mail", text: "Bezpłatna 30-minutowa rozmowa: poznaję kontekst, problem i jego realny koszt dla biznesu." },
    { title: "Architektura i plan wdrożenia", tag: "Rekomendacja", text: "Rozwiązanie, zakres, harmonogram, ryzyka i ścieżka wycofania zmian — zanim cokolwiek trafi na produkcję." },
    { title: "Realizacja, testy i dokumentacja", tag: "SOP / Runbooks", text: "Wdrożenie w standardzie produkcyjnym, testy, walidacja i dokumentacja, dzięki której Twój zespół przejmuje system." }
  ];

  const CONSENT_TEXT =
    "Wyrażam zgodę na przetwarzanie moich danych osobowych przez Fordon Systems (Michał Zieliński) " +
    "w celu obsługi zgłoszenia i kontaktu w sprawie konsultacji. Zgodę mogę wycofać w dowolnym momencie.";

  const ICONS = {
    code: '<polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/><line x1="14" y1="4" x2="10" y2="20"/>',
    server: '<rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/><line x1="7" y1="6.5" x2="7.01" y2="6.5"/><line x1="7" y1="17.5" x2="7.01" y2="17.5"/><line x1="11" y1="6.5" x2="17" y2="6.5"/><line x1="11" y1="17.5" x2="17" y2="17.5"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/>',
    flow: '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.5 6h9"/><path d="M6.3 8.2l4.4 7.6"/><path d="M17.7 8.2l-4.4 7.6"/>',
    audit: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16" y2="16"/><polyline points="7.5 12.5 10 10 12 12 14.5 9"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><line x1="8.5" y1="11" x2="15.5" y2="11"/><line x1="8.5" y1="14" x2="13" y2="14"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/>',
    linkedin: '<path fill="currentColor" stroke="none" d="M4.98 3.5a2.48 2.48 0 1 1-4.96 0 2.48 2.48 0 0 1 4.96 0zM.5 8h4v13h-4V8zm7 0h3.8v1.8h.05c.53-1 1.84-2.06 3.8-2.06 4.05 0 4.8 2.67 4.8 6.15V21h-4v-6.3c0-1.5-.03-3.43-2.1-3.43-2.1 0-2.42 1.64-2.42 3.33V21h-4V8z"/>',
    facebook: '<path fill="currentColor" stroke="none" d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.43-4.92 8.43-9.94z"/>'
  };

  /* ==========================================================================
     2. UTILITIES
     ========================================================================== */

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function icon(name, extraClass = "") {
    return (
      '<svg class="icon ' + extraClass + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      (ICONS[name] || "") +
      "</svg>"
    );
  }

  /** Safe element factory: strings become text nodes, "html" is reserved for trusted static markup. */
  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((key) => {
        const value = attrs[key];
        if (value == null || value === false) return;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else if (key === "html") node.innerHTML = value;
        else node.setAttribute(key, value === true ? "" : value);
      });
    }
    children.flat().forEach((child) => {
      if (child == null || child === false) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  /* Storage access can throw (Safari private mode, disabled cookies) — never let it break the page. */
  const store = {
    get(key, fallback, area = window.localStorage) {
      try {
        const raw = area.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value, area = window.localStorage) {
      try {
        area.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove(key, area = window.localStorage) {
      try {
        area.removeItem(key);
      } catch (e) {
        /* ignore */
      }
    }
  };
  const session = window.sessionStorage;

  function uid(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return prefix + "_" + window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return prefix + "_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function isApiMode() {
    return CONFIG.mode === "api" && typeof CONFIG.apiBaseUrl === "string" && CONFIG.apiBaseUrl.trim() !== "";
  }

  function apiUrl(path) {
    return CONFIG.apiBaseUrl.trim().replace(/\/+$/, "") + path;
  }

  async function fetchWithTimeout(url, options, timeoutMs = API_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, Object.assign({ signal: controller.signal, mode: "cors", credentials: "omit" }, options));
    } finally {
      clearTimeout(timer);
    }
  }

  /** Page file name independent of hosting sub-directory (e.g. /repo/software.html -> software.html). */
  function currentPath() {
    const last = window.location.pathname.split("/").pop();
    return last && last.length ? last : "index.html";
  }

  function pageId() {
    return document.body.getAttribute("data-page") || "home";
  }

  function isHomePage() {
    return pageId() === "home";
  }

  /** In-page anchor on the home page, cross-page link elsewhere (keeps smooth scrolling without reloads). */
  function homeHref(hash) {
    return isHomePage() ? hash : "index.html" + hash;
  }

  function pillarById(id) {
    return PILLARS.find((p) => p.id === id) || null;
  }

  function labelFor(list, value) {
    const item = list.find((o) => o.value === value);
    return item ? item.label : "—";
  }

  function getByPath(obj, path) {
    return path.split(".").reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
  }

  function isPlaceholderUrl(url) {
    return !url || url.charAt(0) === "#";
  }

  function maskEmail(email) {
    const [user, domain] = String(email || "").split("@");
    if (!domain) return "—";
    return user.charAt(0) + "***@" + domain;
  }

  /* ==========================================================================
     3. TRACKING — exclusion, session, attribution, Meta Pixel, visits, leads
     ========================================================================== */

  function applyNotrackParam() {
    const param = (CONFIG.analytics && CONFIG.analytics.notrackParam) || "notrack";
    const value = new URLSearchParams(window.location.search).get(param);
    if (value === "1") store.set(STORAGE_KEYS.notrack, true);
    if (value === "0") store.remove(STORAGE_KEYS.notrack);
  }

  /** Returns a reason string when this browser must not be tracked, otherwise "". */
  function trackingExclusionReason() {
    const cfg = CONFIG.analytics || {};
    if (cfg.enabled === false) return "analityka wyłączona w config.js";
    if (store.get(STORAGE_KEYS.notrack, false)) return "wykluczono parametrem ?notrack=1";
    const host = window.location.hostname;
    if (cfg.excludeLocalhost !== false && (window.location.protocol === "file:" || ["localhost", "127.0.0.1", "::1", "[::1]", ""].includes(host))) {
      return "środowisko lokalne";
    }
    if (Array.isArray(cfg.excludedHosts) && cfg.excludedHosts.includes(host)) return "host wykluczony w config.js";
    if (cfg.respectDoNotTrack !== false && (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true)) {
      return "Do Not Track / Global Privacy Control";
    }
    return "";
  }

  function getSession() {
    let current = store.get(STORAGE_KEYS.session, null, session);
    let isNew = false;
    if (!current || !current.id) {
      current = { id: uid("sess"), startedAt: new Date().toISOString(), paths: [] };
      isNew = true;
      store.set(STORAGE_KEYS.session, current, session);
    }
    return { data: current, isNew };
  }

  function externalReferrerHost() {
    if (!document.referrer) return "";
    try {
      const ref = new URL(document.referrer);
      return ref.hostname === window.location.hostname ? "" : ref.hostname;
    } catch (e) {
      return "";
    }
  }

  /** First-touch attribution per browser session (survives navigation between subpages). */
  function getAttribution() {
    const params = new URLSearchParams(window.location.search);
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    const fromUrl = {};
    utmKeys.forEach((k) => {
      const v = params.get(k);
      if (v) fromUrl[k] = v.slice(0, 120);
    });
    const fbclid = params.get("fbclid");

    let attribution = store.get(STORAGE_KEYS.attribution, null, session);
    // A new campaign click inside the same session overrides the previous campaign.
    if (!attribution || fromUrl.utm_source) {
      attribution = {
        utm_source: fromUrl.utm_source || "",
        utm_medium: fromUrl.utm_medium || "",
        utm_campaign: fromUrl.utm_campaign || "",
        utm_term: fromUrl.utm_term || "",
        utm_content: fromUrl.utm_content || "",
        referrer: externalReferrerHost(),
        landingPage: currentPath(),
        fbclid: fbclid ? fbclid.slice(0, 255) : ""
      };
      store.set(STORAGE_KEYS.attribution, attribution, session);
    }
    return attribution;
  }

  /**
   * META PIXEL loader (configured in js/config.js -> metaPixel).
   * Loaded from JS instead of an inline <script> snippet so the CSP can stay free of 'unsafe-inline'.
   * NOTE (RODO / ePrivacy): enable only together with a cookie-consent mechanism.
   */
  function initMetaPixel() {
    const px = CONFIG.metaPixel || {};
    if (!px.enabled || !/^\d{5,20}$/.test(String(px.pixelId || ""))) return;
    if (trackingExclusionReason() || typeof window.fbq === "function") return;

    const fbq = function () {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);

    fbq("init", String(px.pixelId));
    fbq("track", "PageView");
  }

  /**
   * Meta "Lead" conversion. eventID = leadId lets the Phase 2 backend send the same
   * event through the Conversions API (CAPI) without double counting.
   * No personal data is passed to the browser pixel — hashed PII belongs server-side.
   */
  function trackLeadEvent(payload) {
    const data = payload || {};
    if (typeof window.fbq !== "function") return false;
    const areas = Array.isArray(data.areas) ? data.areas.map((a) => a.id).join(",") : "";
    window.fbq(
      "track",
      "Lead",
      {
        content_name: "B2B consultation request",
        content_category: areas,
        lead_channel: data.preferredContactChannel || "",
        company_size: data.companySize || ""
      },
      data.leadId ? { eventID: data.leadId } : undefined
    );
    return true;
  }

  function emptyAnalytics() {
    return { version: 1, visits: 0, pageviews: 0, byPath: {}, byReferrer: {}, byUtmSource: {}, byUtmCampaign: {}, firstSeen: null, lastSeen: null };
  }

  function increment(map, key) {
    const k = key || "(brak)";
    map[k] = (map[k] || 0) + 1;
  }

  function recordLocalVisit(visit) {
    const data = Object.assign(emptyAnalytics(), store.get(STORAGE_KEYS.analytics, {}));
    data.pageviews += 1;
    increment(data.byPath, visit.path);
    if (visit.isNewSession) {
      data.visits += 1;
      increment(data.byReferrer, visit.referrer || "(direct)");
      increment(data.byUtmSource, visit.utm_source || "(none)");
      increment(data.byUtmCampaign, visit.utm_campaign || "(none)");
    }
    data.firstSeen = data.firstSeen || visit.timestamp;
    data.lastSeen = visit.timestamp;
    store.set(STORAGE_KEYS.analytics, data);
  }

  function sendVisitToApi(visit) {
    const url = apiUrl(ENDPOINTS.visit);
    const body = JSON.stringify(visit);
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, mode: "cors", credentials: "omit" }).catch(() => {
      // sendBeacon cannot send a CORS preflight, so text/plain (CORS-safelisted) is used; the backend parses JSON from the body.
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "text/plain;charset=UTF-8" }));
    });
  }

  /**
   * Counts a page view (deduplicated per session + path) and a visit (once per browser session).
   * static mode -> localStorage (feeds stats.html), api mode -> POST {apiBaseUrl}/api/analytics/visit.
   */
  function trackPageVisit() {
    if (pageId() === "stats") return { tracked: false, reason: "stats page" };
    const excluded = trackingExclusionReason();
    if (excluded) return { tracked: false, reason: excluded };

    const { data: sess, isNew } = getSession();
    const path = currentPath();
    if (Array.isArray(sess.paths) && sess.paths.includes(path)) return { tracked: false, reason: "duplicate in session" };

    sess.paths = (sess.paths || []).concat(path).slice(-50);
    store.set(STORAGE_KEYS.session, sess, session);

    const attribution = getAttribution();
    const visit = {
      type: "pageview",
      path,
      title: document.title,
      timestamp: new Date().toISOString(),
      sessionId: sess.id,
      isNewSession: isNew,
      referrer: attribution.referrer,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign
    };

    if (isApiMode()) sendVisitToApi(visit);
    else recordLocalVisit(visit);
    return { tracked: true, visit };
  }

  /* ==========================================================================
     4. LEAD SUBMISSION
     ========================================================================== */

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_ALLOWED_RE = /^[+\d\s().-]+$/;

  function normalizePhone(value) {
    return String(value || "").replace(/[\s().-]/g, "");
  }

  function validateEmail(value) {
    const v = String(value || "").trim();
    if (!v) return "Podaj firmowy adres e-mail.";
    if (v.length > 254 || !EMAIL_RE.test(v)) return "Nieprawidłowy format adresu e-mail.";
    return "";
  }

  function validatePhone(value) {
    const v = String(value || "").trim();
    if (!v) return "Podaj numer telefonu.";
    if (!PHONE_ALLOWED_RE.test(v) || !/^\+?\d{9,15}$/.test(normalizePhone(v))) {
      return "Podaj poprawny numer (9–15 cyfr, opcjonalnie z prefiksem, np. +48 / +44).";
    }
    return "";
  }

  function validateFullName(value) {
    const v = String(value || "").trim();
    if (!v) return "Podaj imię i nazwisko.";
    if (v.length < 3) return "Imię i nazwisko jest zbyt krótkie.";
    if (v.length > 100) return "Imię i nazwisko może mieć maksymalnie 100 znaków.";
    return "";
  }

  /** Server-agnostic payload validation — the backend must repeat it (never trust the client). */
  function validateLeadPayload(payload) {
    const errors = [];
    const p = payload || {};
    if (!Array.isArray(p.areas) || !p.areas.length || p.areas.some((a) => !pillarById(a.id))) errors.push("areas");
    const c = p.contact || {};
    if (validateFullName(c.fullName)) errors.push("fullName");
    if (validateEmail(c.email)) errors.push("email");
    if (validatePhone(c.phone)) errors.push("phone");
    if (!p.consent || p.consent.gdpr !== true) errors.push("consent");
    if (!CONTACT_CHANNELS.some((ch) => ch.value === p.preferredContactChannel)) errors.push("preferredContactChannel");
    return errors;
  }

  /** Data minimisation: the local diagnostic copy keeps no full contact data. */
  function storeLeadLocally(payload) {
    const leads = store.get(STORAGE_KEYS.leads, []);
    leads.unshift({
      leadId: payload.leadId,
      timestamp: payload.timestamp,
      areas: payload.areas.map((a) => a.label),
      companySize: payload.companySize,
      urgency: payload.urgency,
      preferredContactChannel: payload.preferredContactChannel,
      emailMasked: maskEmail(payload.contact.email),
      utm_source: payload.utm.utm_source,
      utm_campaign: payload.utm.utm_campaign,
      pagePath: payload.pagePath
    });
    store.set(STORAGE_KEYS.leads, leads.slice(0, MAX_STORED_LEADS));
  }

  /**
   * static mode: validate -> store locally -> Meta Lead event -> caller shows mailto backup.
   * api mode:    validate -> POST JSON {apiBaseUrl}/api/leads -> Meta Lead event.
   * Resolves to { ok, mode, delivered, error? } and never throws.
   */
  async function submitLeadForm(payload) {
    const mode = isApiMode() ? "api" : "static";
    const errors = validateLeadPayload(payload);
    if (errors.length) return { ok: false, mode, delivered: false, error: "validation", errors };

    if (mode === "static") {
      storeLeadLocally(payload);
      trackLeadEvent(payload);
      return { ok: true, mode, delivered: false };
    }

    try {
      const response = await fetchWithTimeout(apiUrl(ENDPOINTS.leads), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      trackLeadEvent(payload);
      return { ok: true, mode, delivered: true };
    } catch (err) {
      console.warn("[Fordon] Lead submission failed:", err && err.message);
      return { ok: false, mode, delivered: false, error: "network" };
    }
  }

  function buildLeadSummaryLines(payload) {
    const channel = CONTACT_CHANNELS.find((c) => c.value === payload.preferredContactChannel);
    return [
      ["Obszary", payload.areas.map((a) => a.label).join(", ")],
      ["Wielkość firmy", payload.companySize ? labelFor(COMPANY_SIZES, payload.companySize) : "—"],
      ["Pilność", payload.urgency ? labelFor(URGENCY_OPTIONS, payload.urgency) : "—"],
      ["Preferowany kontakt", channel ? channel.label : "—"],
      ["Imię i nazwisko", payload.contact.fullName],
      ["E-mail", payload.contact.email],
      ["Telefon", payload.contact.phone],
      ["Firma", payload.contact.company || "—"],
      ["Opis", payload.description || "—"]
    ];
  }

  function buildMailtoHref(payload) {
    const email = (CONFIG.contact && CONFIG.contact.email) || "";
    const subject = "Konsultacja techniczna — " + (payload.contact.company || payload.contact.fullName);
    const body =
      "Zgłoszenie konsultacji — " + BRAND.legalName + "\r\n\r\n" +
      buildLeadSummaryLines(payload).map(([k, v]) => k + ": " + v).join("\r\n") +
      "\r\n\r\nID zgłoszenia: " + payload.leadId;
    return "mailto:" + email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  /* ==========================================================================
     5. SHARED COMPONENTS
     ========================================================================== */

  /* ---- Hexagon cluster (logo + hero visual) ---- */

  const HEX_R = 10;
  const HEX_SPACING_R = 11; // > HEX_R leaves the micro-gap between tiles
  const NEIGHBOR_DIST = Math.sqrt(3) * HEX_SPACING_R;

  function hexPoints(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i);
      pts.push((cx + r * Math.cos(a)).toFixed(2) + "," + (cy + r * Math.sin(a)).toFixed(2));
    }
    return pts.join(" ");
  }

  function tileCenter(tile, distance = NEIGHBOR_DIST) {
    if (tile.angle == null) return { x: 0, y: 0 };
    const a = (Math.PI / 180) * tile.angle;
    return { x: distance * Math.cos(a), y: distance * Math.sin(a) };
  }

  function buildHexCluster({ idPrefix, labels = false, ariaLabel = "Logo Fordon Systems" }) {
    const gradId = idPrefix + "-core";
    const links = LOGO_TILES.filter((t) => t.angle != null)
      .map((t) => {
        const m = tileCenter(t, NEIGHBOR_DIST / 2);
        return '<circle class="hexmark__link" cx="' + m.x.toFixed(2) + '" cy="' + m.y.toFixed(2) + '" r="' + (labels ? 1 : 1.4) + '"/>';
      })
      .join("");

    const tiles = LOGO_TILES.map((t) => {
      const c = tileCenter(t);
      const isCore = t.key === "core";
      const focusAttrs = labels ? ' tabindex="0" role="img" aria-label="' + escapeHtml(t.label) + '"' : "";
      let inner = "";
      if (labels) {
        inner =
          '<text class="hexmark__title" x="' + c.x.toFixed(2) + '" y="' + (c.y + 0.2).toFixed(2) + '" text-anchor="middle">' + t.title + "</text>" +
          '<text class="hexmark__sub" x="' + c.x.toFixed(2) + '" y="' + (c.y + 3.6).toFixed(2) + '" text-anchor="middle">' + t.sub + "</text>";
      } else if (isCore) {
        inner = '<polygon class="hexmark__inner" points="' + hexPoints(c.x, c.y, 4.6) + '"/>';
      } else {
        inner = '<circle class="hexmark__dot" cx="' + c.x.toFixed(2) + '" cy="' + c.y.toFixed(2) + '" r="1.6"/>';
      }
      return (
        '<g class="hexmark__tile' + (isCore ? " hexmark__tile--core" : "") + '" data-tile="' + t.key + '" data-label="' + escapeHtml(t.label) + '"' + focusAttrs + ">" +
        "<title>" + escapeHtml(t.label) + "</title>" +
        '<polygon class="hexmark__hex"' + (isCore ? ' fill="url(#' + gradId + ')"' : "") + ' points="' + hexPoints(c.x, c.y, HEX_R) + '"/>' +
        inner +
        "</g>"
      );
    }).join("");

    const viewBox = labels ? "-28.5 -20 57 40" : "-27.5 -19.5 55 39";
    return (
      '<svg class="hexmark' + (labels ? " hexmark--labels" : "") + '" viewBox="' + viewBox + '" role="img" aria-label="' + escapeHtml(ariaLabel) + '">' +
      '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#00E5FF" stop-opacity=".42"/><stop offset="1" stop-color="#3B82F6" stop-opacity=".16"/>' +
      "</linearGradient></defs>" +
      tiles + links +
      "</svg>"
    );
  }

  /** Hover / focus highlighting for any hex cluster. onChange receives the active tile label (or ""). */
  function bindHexCluster(svg, onChange, defaultKey = null) {
    if (!svg) return;
    const tiles = $$("[data-tile]", svg);
    const activate = (key) => {
      tiles.forEach((t) => t.classList.toggle("is-active", t.getAttribute("data-tile") === key));
      const active = tiles.find((t) => t.getAttribute("data-tile") === key);
      onChange(active ? active.getAttribute("data-label") : "");
    };
    tiles.forEach((tile) => {
      const key = tile.getAttribute("data-tile");
      tile.addEventListener("pointerenter", () => activate(key));
      tile.addEventListener("focus", () => activate(key));
      tile.addEventListener("blur", () => activate(defaultKey));
    });
    // Hovering the mark itself (gaps between tiles) highlights the CORE tile.
    svg.addEventListener("pointerenter", () => activate("core"));
    svg.addEventListener("pointerleave", () => activate(defaultKey));
    activate(defaultKey);
  }

  /* ---- Header ---- */

  function renderHeader() {
    const header = $('[data-component="header"]');
    if (!header) return;
    const page = pageId();
    const consultHref = isHomePage() ? "#kontakt" : "kontakt.html#formularz";
    const navItems = [
      { label: "Oferta", href: homeHref("#oferta") },
      { label: "O mnie", href: homeHref("#o-mnie") },
      { label: "Kontakt", href: "kontakt.html", current: page === "consulting" }
    ];

    header.innerHTML =
      '<div class="container header__inner">' +
      '<div class="brand">' +
      '<a class="brand__mark" href="index.html" aria-label="' + escapeHtml(BRAND.legalName) + ' — strona główna">' +
      buildHexCluster({ idPrefix: "hdr" }) +
      "</a>" +
      '<span class="brand__tip" aria-hidden="true"></span>' +
      '<a class="brand__text" href="index.html" tabindex="-1">' +
      '<span class="brand__name">' + escapeHtml(BRAND.name) + "</span>" +
      '<span class="brand__role">' + escapeHtml(BRAND.person + " — " + BRAND.role) + "</span>" +
      "</a></div>" +
      '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">' +
      '<span class="sr-only">Otwórz menu</span><span class="nav-toggle__bar"></span><span class="nav-toggle__bar"></span><span class="nav-toggle__bar"></span>' +
      "</button>" +
      '<nav id="site-nav" class="site-nav" aria-label="Nawigacja główna"><ul class="site-nav__list">' +
      navItems
        .map((item) => '<li><a class="site-nav__link" href="' + item.href + '"' + (item.current ? ' aria-current="page"' : "") + ">" + item.label + "</a></li>")
        .join("") +
      "</ul>" +
      '<a class="btn btn--primary btn--sm site-nav__cta" href="' + consultHref + '">Umów konsultację</a>' +
      "</nav></div>";

    const tip = $(".brand__tip", header);
    bindHexCluster($(".hexmark", header), (label) => {
      tip.textContent = label;
      tip.classList.toggle("is-visible", Boolean(label));
    });

    const toggle = $(".nav-toggle", header);
    const nav = $("#site-nav", header);
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      $(".sr-only", toggle).textContent = open ? "Zamknij menu" : "Otwórz menu";
      header.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && header.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- Social links (LinkedIn / Facebook) ---- */

  function socialLinksMarkup(variant) {
    const links = CONFIG.socialLinks || {};
    const items = [
      { key: "linkedin", label: "LinkedIn", url: links.linkedin },
      { key: "facebook", label: "Facebook", url: links.facebook }
    ];
    return items
      .map((item) => {
        const cls = "social-btn social-btn--" + item.key + (variant ? " social-btn--" + variant : "");
        if (isPlaceholderUrl(item.url)) {
          // Placeholder from config.js — rendered inert until a real URL is provided.
          return '<span class="' + cls + ' is-placeholder" aria-disabled="true" title="Profil w przygotowaniu">' + icon(item.key) + "<span>" + item.label + "</span></span>";
        }
        return (
          '<a class="' + cls + '" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer me" aria-label="' +
          escapeHtml(BRAND.legalName + " na " + item.label + " (otwiera się w nowej karcie)") + '">' +
          icon(item.key) + "<span>" + item.label + "</span></a>"
        );
      })
      .join("");
  }

  function renderSocialLinks() {
    $$('[data-component="social"]').forEach((el) => {
      el.classList.add("social");
      el.innerHTML = socialLinksMarkup(el.getAttribute("data-variant") || "");
    });
  }

  /** Binds config values into static markup: [data-bind="contact.email"], a[data-mailto], a[data-link="linkedin"]. */
  function bindConfigValues() {
    $$("[data-bind]").forEach((el) => {
      const value = getByPath(CONFIG, el.getAttribute("data-bind"));
      if (value != null && value !== "") el.textContent = value;
    });
    const email = (CONFIG.contact && CONFIG.contact.email) || "";
    $$("a[data-mailto]").forEach((a) => {
      a.href = "mailto:" + email;
      if (!a.textContent.trim()) a.textContent = email;
    });
    $$("a[data-link]").forEach((a) => {
      const url = getByPath(CONFIG, "socialLinks." + a.getAttribute("data-link"));
      if (!isPlaceholderUrl(url)) a.href = url;
    });
    $$("a[data-teams]").forEach((a) => {
      const url = CONFIG.contact && CONFIG.contact.teamsUrl;
      if (url) {
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
    });
  }

  /* ---- Footer ---- */

  function renderFooter() {
    const footer = $('[data-component="footer"]');
    if (!footer) return;
    const contact = CONFIG.contact || {};
    const company = CONFIG.company || {};
    const registry = [company.nip ? "NIP: " + company.nip : "", company.regon ? "REGON: " + company.regon : ""].filter(Boolean).join(" · ");

    footer.innerHTML =
      '<div class="container footer__grid">' +
      '<div class="footer__brand">' +
      '<a class="footer__logo" href="index.html">' + buildHexCluster({ idPrefix: "ftr" }) +
      '<span><span class="brand__name">' + escapeHtml(BRAND.name) + '</span><span class="brand__role">' + escapeHtml(BRAND.person + " — " + BRAND.role) + "</span></span></a>" +
      '<p class="footer__lead">B2B IT Partner: architektura .NET, stabilna infrastruktura, wydajne dane i automatyzacja procesów.</p>' +
      '<div data-component="social" data-variant="compact"></div>' +
      "</div>" +
      '<nav class="footer__col" aria-label="Zakres wsparcia"><h2 class="footer__title">Zakres wsparcia</h2><ul>' +
      PILLARS.map((p) => '<li><a href="' + p.href + '">' + escapeHtml(p.name) + "</a></li>").join("") +
      "</ul></nav>" +
      '<div class="footer__col"><h2 class="footer__title">Kontakt</h2><ul class="footer__contact">' +
      '<li>' + icon("mail") + '<a href="mailto:' + escapeHtml(contact.email || "") + '">' + escapeHtml(contact.email || "") + "</a></li>" +
      (contact.phone ? "<li>" + icon("phone") + '<a href="tel:' + escapeHtml(normalizePhone(contact.phone)) + '">' + escapeHtml(contact.phone) + "</a></li>" : "") +
      "<li>" + icon("pin") + "<span>" + escapeHtml(BRAND.location || "") + "</span></li>" +
      "<li>" + icon("globe") + "<span>" + escapeHtml(BRAND.serviceArea || "") + "</span></li>" +
      "</ul>" +
      '<a class="btn btn--ghost btn--sm" href="kontakt.html#formularz">Umów konsultację ' + icon("arrow") + "</a>" +
      "</div></div>" +
      '<div class="container footer__bottom">' +
      "<p>© " + new Date().getFullYear() + " " + escapeHtml(BRAND.legalName) + " — " + escapeHtml(BRAND.person + ", " + BRAND.role) + "</p>" +
      (registry ? "<p>" + escapeHtml(registry) + "</p>" : "") +
      (CONFIG.privacyPolicyUrl ? '<p><a href="' + escapeHtml(CONFIG.privacyPolicyUrl) + '">Polityka prywatności</a></p>' : "") +
      "</div>";
  }

  /* ---- Breadcrumbs + pillar switcher (subpages) ---- */

  function renderBreadcrumbs() {
    const el = $('[data-component="breadcrumbs"]');
    if (!el) return;
    const pillar = pillarById(pageId());
    const crumbs = [{ label: "Start", href: "index.html" }];
    if (pillar && pillar.id !== "consulting") crumbs.push({ label: "Oferta", href: "index.html#oferta" });
    crumbs.push({ label: pillar ? pillar.name : document.title });
    el.setAttribute("aria-label", "Ścieżka nawigacji");
    el.classList.add("breadcrumbs");
    el.innerHTML =
      "<ol>" +
      crumbs
        .map((c) => (c.href ? '<li><a href="' + c.href + '">' + escapeHtml(c.label) + "</a></li>" : '<li aria-current="page">' + escapeHtml(c.label) + "</li>"))
        .join("") +
      "</ol>";
  }

  function renderPillarNav() {
    $$('[data-component="pillar-nav"]').forEach((el) => {
      const current = pageId();
      el.classList.add("pillar-nav");
      el.setAttribute("aria-label", "Filary Fordon Systems");
      el.innerHTML =
        '<ul class="pillar-nav__list">' +
        PILLARS.map(
          (p) =>
            '<li><a class="pillar-nav__item" href="' + p.href + '"' + (p.id === current ? ' aria-current="page"' : "") + ">" +
            icon(p.icon) + "<span>" + escapeHtml(p.name) + "</span></a></li>"
        ).join("") +
        "</ul>";
    });
  }

  /* ---- Hex grid (offer, 6 pillars) ---- */

  function renderHexGrid() {
    $$('[data-component="hex-grid"]').forEach((el) => {
      el.classList.add("hex-grid");
      el.innerHTML = PILLARS.map(
        (p, i) =>
          '<a class="hex" href="' + p.href + '" data-pillar="' + p.id + '" data-reveal>' +
          '<span class="hex__body"><span class="hex__shape">' +
          '<span class="hex__content">' +
          '<span class="hex__index">0' + (i + 1) + "</span>" +
          '<span class="hex__icon">' + icon(p.icon) + "</span>" +
          '<span class="hex__title">' + escapeHtml(p.name) + "</span>" +
          '<span class="hex__texts"><span class="hex__short">' + escapeHtml(p.short) + '</span><span class="hex__long">' + escapeHtml(p.long) + "</span></span>" +
          '<span class="hex__more">' + escapeHtml(p.more) + icon("arrow") + "</span>" +
          "</span></span></span></a>"
      ).join("");
    });
  }

  /* ---- Cooperation model (3 steps) ---- */

  function renderProcess() {
    $$('[data-component="process"]').forEach((el) => {
      el.classList.add("process");
      el.innerHTML = PROCESS_STEPS.map(
        (s, i) =>
          '<li class="process__step" data-reveal>' +
          '<span class="process__num">' + (i + 1) + "</span>" +
          '<h3 class="process__title">' + escapeHtml(s.title) + "</h3>" +
          '<span class="process__tag">' + escapeHtml(s.tag) + "</span>" +
          '<p class="process__text">' + escapeHtml(s.text) + "</p></li>"
      ).join("");
    });
  }

  /* ---- Hero cluster (home) ---- */

  function renderHeroCluster() {
    const el = $('[data-component="hero-cluster"]');
    if (!el) return;
    el.innerHTML =
      '<div class="hero-cluster__orbit" aria-hidden="true"></div>' +
      buildHexCluster({ idPrefix: "hero", labels: true, ariaLabel: "Filary inżynieryjne Fordon Systems" }) +
      '<p class="hero-cluster__caption" aria-live="polite"></p>';
    const caption = $(".hero-cluster__caption", el);
    bindHexCluster($(".hexmark", el), (label) => {
      caption.textContent = label || "Najedź na filar, aby poznać kompetencje";
    }, null);
  }

  /* ---- Portrait fallback (when assets/michal-zielinski.jpg is missing) ---- */

  function initPortrait() {
    $$(".portrait img").forEach((img) => {
      const fail = () => img.closest(".portrait").classList.add("portrait--fallback");
      if (img.complete && img.naturalWidth === 0) fail();
      else img.addEventListener("error", fail, { once: true });
    });
  }

  /* ==========================================================================
     6. LEAD WIZARD
     ========================================================================== */

  function choiceRadio(name, option, idPrefix, checked) {
    const id = idPrefix + "-" + name + "-" + option.value.replace(/[^a-z0-9]/gi, "");
    return (
      '<label class="pill" for="' + id + '"><input type="radio" id="' + id + '" name="' + name + '" value="' + escapeHtml(option.value) + '"' + (checked ? " checked" : "") + ">" +
      "<span>" + escapeHtml(option.label) + "</span></label>"
    );
  }

  function wizardTemplate(p) {
    const privacy = CONFIG.privacyPolicyUrl
      ? ' <a href="' + escapeHtml(CONFIG.privacyPolicyUrl) + '" target="_blank" rel="noopener">Polityka prywatności</a>.'
      : "";
    return (
      '<div class="wizard__head">' +
      '<ol class="wizard__steps" aria-hidden="true">' +
      ["Obszar", "Skala", "Kontakt"].map((l, i) => '<li data-step-dot="' + (i + 1) + '"><span>' + (i + 1) + "</span>" + l + "</li>").join("") +
      "</ol>" +
      '<div class="wizard__bar" aria-hidden="true"><span class="wizard__bar-fill"></span></div>' +
      '<p class="wizard__count" aria-live="polite">Krok 1 z 3</p>' +
      "</div>" +
      '<form class="wizard__form" novalidate>' +
      // Step 1
      '<fieldset class="wizard__step" data-step="1" aria-describedby="' + p + '-areas-error">' +
      '<legend class="wizard__title" tabindex="-1">W jakim obszarze mogę wesprzeć Twoją firmę?</legend>' +
      '<p class="wizard__hint">Możesz zaznaczyć kilka obszarów.</p>' +
      '<p class="wizard__prefill" data-prefill-note hidden></p>' +
      '<div class="choice-grid">' +
      PILLARS.map(
        (pl) =>
          '<label class="choice"><input type="checkbox" name="areas" value="' + pl.id + '">' +
          '<span class="choice__box">' + icon(pl.icon) + '<span class="choice__label">' + escapeHtml(pl.wizardLabel || pl.name) + "</span>" +
          '<span class="choice__check">' + icon("check") + "</span></span></label>"
      ).join("") +
      "</div>" +
      '<p class="field-error" id="' + p + '-areas-error" data-error-for="areas" aria-live="polite"></p>' +
      "</fieldset>" +
      // Step 2
      '<fieldset class="wizard__step" data-step="2" hidden>' +
      '<legend class="wizard__title" tabindex="-1">Skala i priorytet</legend>' +
      '<div class="field-group" role="radiogroup" aria-labelledby="' + p + '-size-label">' +
      '<p class="field-label" id="' + p + '-size-label">Wielkość firmy</p>' +
      '<div class="pill-row">' + COMPANY_SIZES.map((o) => choiceRadio("companySize", o, p, false)).join("") + "</div></div>" +
      '<div class="field-group" role="radiogroup" aria-labelledby="' + p + '-urgency-label">' +
      '<p class="field-label" id="' + p + '-urgency-label">Pilność / horyzont</p>' +
      '<div class="pill-row">' + URGENCY_OPTIONS.map((o) => choiceRadio("urgency", o, p, false)).join("") + "</div></div>" +
      '<div class="field">' +
      '<label class="field-label" for="' + p + '-description">Krótki opis wyzwania lub celu <span class="optional">(opcjonalnie)</span></label>' +
      '<textarea id="' + p + '-description" name="description" rows="4" maxlength="1000" placeholder="Np. raporty w SQL generują się kilka minut, chcemy skrócić czas i zautomatyzować wysyłkę."></textarea>' +
      '<p class="field-meta"><span data-counter>0</span>/1000</p>' +
      "</div></fieldset>" +
      // Step 3
      '<fieldset class="wizard__step" data-step="3" hidden>' +
      '<legend class="wizard__title" tabindex="-1">Umów bezpłatną 30-minutową konsultację techniczną z Michałem Zielińskim</legend>' +
      '<div class="field-group" role="radiogroup" aria-labelledby="' + p + '-channel-label">' +
      '<p class="field-label" id="' + p + '-channel-label">Preferowana forma kontaktu</p>' +
      '<div class="choice-grid choice-grid--channels">' +
      CONTACT_CHANNELS.map(
        (ch, i) =>
          '<label class="choice choice--channel"><input type="radio" name="preferredContactChannel" value="' + ch.value + '"' + (i === 0 ? " checked" : "") + ">" +
          '<span class="choice__box">' + icon(ch.icon) + '<span class="choice__label">' + escapeHtml(ch.label) + '</span><span class="choice__desc">' + escapeHtml(ch.desc) + "</span>" +
          '<span class="choice__check">' + icon("check") + "</span></span></label>"
      ).join("") +
      "</div></div>" +
      '<div class="field-grid">' +
      wizardInput(p, "fullName", "Imię i nazwisko", "text", "name", true) +
      wizardInput(p, "email", "Firmowy adres e-mail", "email", "email", true) +
      wizardInput(p, "phone", "Numer telefonu", "tel", "tel", true) +
      wizardInput(p, "company", "Nazwa firmy", "text", "organization", false) +
      "</div>" +
      // Honeypot: invisible for humans, tempting for bots.
      '<div class="hp" aria-hidden="true"><label for="' + p + '-website">Strona www</label><input id="' + p + '-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>' +
      '<label class="consent"><input type="checkbox" name="consent" aria-describedby="' + p + '-consent-error">' +
      "<span>" + escapeHtml(CONSENT_TEXT) + privacy + ' <span class="req" aria-hidden="true">*</span></span></label>' +
      '<p class="field-error" id="' + p + '-consent-error" data-error-for="consent" aria-live="polite"></p>' +
      "</fieldset>" +
      '<p class="wizard__status" data-status role="status"></p>' +
      '<div class="wizard__nav">' +
      '<button type="button" class="btn btn--ghost" data-action="back" hidden>' + icon("back") + "Wstecz</button>" +
      '<button type="button" class="btn btn--primary" data-action="next">Dalej' + icon("arrow") + "</button>" +
      '<button type="submit" class="btn btn--primary" data-action="submit" hidden>Wyślij zgłoszenie' + icon("arrow") + "</button>" +
      "</div></form>" +
      '<div class="wizard__done" data-done hidden tabindex="-1"></div>'
    );
  }

  function wizardInput(p, name, label, type, autocomplete, required) {
    const id = p + "-" + name;
    const extra = type === "email" ? ' inputmode="email" spellcheck="false"' : type === "tel" ? ' inputmode="tel"' : "";
    return (
      '<div class="field" data-field="' + name + '">' +
      '<label class="field-label" for="' + id + '">' + label + (required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="optional">(opcjonalnie)</span>') + "</label>" +
      '<input id="' + id + '" name="' + name + '" type="' + type + '" autocomplete="' + autocomplete + '" maxlength="' + (type === "email" ? 254 : 100) + '"' +
      (required ? ' required aria-required="true"' : "") + ' aria-describedby="' + id + '-error"' + extra + ">" +
      '<p class="field-error" id="' + id + '-error" data-error-for="' + name + '" aria-live="polite"></p>' +
      "</div>"
    );
  }

  const FIELD_VALIDATORS = {
    areas: (form) => ($$('input[name="areas"]:checked', form).length ? "" : "Wybierz co najmniej jeden obszar wsparcia."),
    fullName: (form) => validateFullName(form.elements.fullName.value),
    email: (form) => validateEmail(form.elements.email.value),
    phone: (form) => validatePhone(form.elements.phone.value),
    consent: (form) => (form.elements.consent.checked ? "" : "Zgoda jest wymagana, aby obsłużyć zgłoszenie.")
  };
  const STEP_FIELDS = { 1: ["areas"], 2: [], 3: ["fullName", "email", "phone", "consent"] };

  function initWizard(root, index) {
    const p = "lw" + index;
    root.classList.add("wizard");
    root.setAttribute("data-step", "1");
    root.innerHTML = wizardTemplate(p);

    const form = $(".wizard__form", root);
    const steps = $$(".wizard__step", root);
    const btnBack = $('[data-action="back"]', root);
    const btnNext = $('[data-action="next"]', root);
    const btnSubmit = $('[data-action="submit"]', root);
    const countEl = $(".wizard__count", root);
    const statusEl = $("[data-status]", root);
    const doneEl = $("[data-done]", root);
    const startedAt = Date.now();
    const touched = new Set();
    let current = 1;
    let submitting = false;

    function setError(name, message) {
      const errorEl = $('[data-error-for="' + name + '"]', form);
      if (errorEl) errorEl.textContent = message;
      const fields = form.elements[name];
      const list = fields && typeof fields.length === "number" && !fields.tagName ? Array.from(fields) : [fields];
      list.forEach((f) => f && f.setAttribute("aria-invalid", message ? "true" : "false"));
      const wrapper = $('[data-field="' + name + '"]', form);
      if (wrapper) wrapper.classList.toggle("has-error", Boolean(message));
      return !message;
    }

    function validateField(name) {
      return setError(name, FIELD_VALIDATORS[name](form));
    }

    function validateStep(step) {
      const results = STEP_FIELDS[step].map((name) => {
        touched.add(name);
        return { name, ok: validateField(name) };
      });
      const firstInvalid = results.find((r) => !r.ok);
      if (firstInvalid) {
        const target = form.elements[firstInvalid.name];
        const focusable = target && !target.tagName ? target[0] : target;
        if (focusable) focusable.focus();
        return false;
      }
      return true;
    }

    function show(step, moveFocus) {
      current = step;
      root.setAttribute("data-step", String(step));
      steps.forEach((s) => (s.hidden = Number(s.getAttribute("data-step")) !== step));
      $$("[data-step-dot]", root).forEach((dot) => {
        const n = Number(dot.getAttribute("data-step-dot"));
        dot.classList.toggle("is-active", n === step);
        dot.classList.toggle("is-done", n < step);
      });
      countEl.textContent = "Krok " + step + " z 3";
      btnBack.hidden = step === 1;
      btnNext.hidden = step === 3;
      btnSubmit.hidden = step !== 3;
      statusEl.textContent = "";
      if (moveFocus) {
        const title = $(".wizard__title", steps[step - 1]);
        if (title) title.focus({ preventScroll: true });
        const top = root.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.6) root.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" });
      }
    }

    function prefillFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const pillar = pillarById(params.get("pillar"));
      if (pillar) {
        const box = $('input[name="areas"][value="' + pillar.id + '"]', form);
        if (box) box.checked = true;
        const note = $("[data-prefill-note]", form);
        note.textContent = "Zaznaczono obszar „" + (pillar.wizardLabel || pillar.name) + "” na podstawie odwiedzonej strony.";
        note.hidden = false;
      }
      const channel = params.get("channel");
      if (CONTACT_CHANNELS.some((c) => c.value === channel)) {
        $('input[name="preferredContactChannel"][value="' + channel + '"]', form).checked = true;
      }
    }

    function collectPayload() {
      const fd = new FormData(form);
      const attribution = getAttribution();
      const now = new Date().toISOString();
      const text = (key) => String(fd.get(key) || "").trim();
      return {
        leadId: uid("lead"),
        timestamp: now,
        source: "website",
        pagePath: currentPath(),
        areas: fd.getAll("areas").map((id) => {
          const pl = pillarById(String(id));
          return { id: String(id), label: pl ? pl.wizardLabel || pl.name : String(id) };
        }),
        companySize: text("companySize") || null,
        urgency: text("urgency") || null,
        description: text("description").slice(0, 1000),
        preferredContactChannel: text("preferredContactChannel") || "teams",
        contact: {
          fullName: text("fullName").slice(0, 100),
          email: text("email").toLowerCase(),
          phone: text("phone"),
          company: text("company").slice(0, 100)
        },
        consent: { gdpr: Boolean(form.elements.consent.checked), text: CONSENT_TEXT, timestamp: now },
        utm: {
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
          utm_term: attribution.utm_term,
          utm_content: attribution.utm_content
        },
        referrer: attribution.referrer,
        landingPage: attribution.landingPage,
        fbclid: attribution.fbclid || null,
        sessionId: getSession().data.id
      };
    }

    function renderDone(payload, result) {
      const firstName = payload.contact.fullName.split(/\s+/)[0];
      const email = (CONFIG.contact && CONFIG.contact.email) || "";
      let title;
      let message;
      if (result.delivered) {
        title = "Dziękuję, " + firstName + "! Zgłoszenie dotarło.";
        message = "Odezwę się wybranym kanałem, aby ustalić termin bezpłatnej konsultacji.";
      } else if (result.mode === "static") {
        title = "Dziękuję, " + firstName + "! Ostatni krok.";
        message = "Kliknij „Wyślij zgłoszenie e-mailem” — Twój program pocztowy otworzy gotową wiadomość z podsumowaniem. Dzięki temu zgłoszenie trafi bezpośrednio do mnie.";
      } else {
        title = "Nie udało się wysłać zgłoszenia.";
        message = "Wystąpił problem z połączeniem. Twoje dane nie zostały utracone — wyślij podsumowanie e-mailem jednym kliknięciem.";
      }

      const summary = h("dl", { class: "summary" }, buildLeadSummaryLines(payload).map(([k, v]) => h("div", { class: "summary__row" }, h("dt", { text: k }), h("dd", { text: v }))));
      const actions = h("div", { class: "done__actions" });
      if (!result.delivered) {
        actions.append(h("a", { class: "btn btn--primary", href: buildMailtoHref(payload), html: icon("mail") + "Wyślij zgłoszenie e-mailem" }));
      }
      const linkedin = CONFIG.socialLinks && CONFIG.socialLinks.linkedin;
      if (!isPlaceholderUrl(linkedin)) {
        actions.append(h("a", { class: "btn btn--ghost", href: linkedin, target: "_blank", rel: "noopener noreferrer", html: icon("linkedin") + "Profil na LinkedIn" }));
      }

      doneEl.replaceChildren(
        h("div", { class: "done__icon", html: icon(result.ok ? "check" : "mail") }),
        h("h3", { class: "done__title", text: title }),
        h("p", { class: "done__text", text: message }),
        actions,
        h("h4", { class: "done__subtitle", text: "Podsumowanie zgłoszenia" }),
        summary,
        h(
          "p",
          { class: "done__direct" },
          "Kontakt bezpośredni: " + BRAND.person + " — " + BRAND.role + " · ",
          h("a", { href: "mailto:" + email, text: email })
        )
      );
      form.hidden = true;
      $(".wizard__head", root).hidden = true;
      doneEl.hidden = false;
      doneEl.focus({ preventScroll: true });
      doneEl.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" });
    }

    async function handleSubmit() {
      if (submitting) return;
      if (!validateStep(3)) return;

      const payload = collectPayload();
      // Bot heuristics: honeypot filled or inhumanly fast completion -> silent fake success.
      if (form.elements.website.value || Date.now() - startedAt < MIN_FORM_FILL_MS) {
        renderDone(payload, { ok: true, mode: "static", delivered: true });
        return;
      }

      submitting = true;
      btnSubmit.disabled = true;
      btnSubmit.setAttribute("aria-busy", "true");
      statusEl.textContent = "Wysyłanie…";
      const result = await submitLeadForm(payload);
      submitting = false;
      btnSubmit.disabled = false;
      btnSubmit.removeAttribute("aria-busy");

      if (result.error === "validation") {
        statusEl.textContent = "Sprawdź poprawność danych w formularzu.";
        validateStep(1) && validateStep(3);
        return;
      }
      statusEl.textContent = "";
      renderDone(payload, result);
    }

    btnNext.addEventListener("click", () => {
      if (validateStep(current)) show(current + 1, true);
    });
    btnBack.addEventListener("click", () => show(Math.max(1, current - 1), true));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // Enter in a text field on steps 1–2 means "next", not "submit".
      if (current < 3) {
        if (validateStep(current)) show(current + 1, true);
        return;
      }
      handleSubmit();
    });

    // Real-time validation: re-check a field as soon as the user has interacted with it.
    const onChange = (e) => {
      const name = e.target.name;
      if (name === "description") {
        $("[data-counter]", form).textContent = String(e.target.value.length);
        return;
      }
      if (!FIELD_VALIDATORS[name]) return;
      if (name === "areas" || name === "consent" || touched.has(name)) validateField(name);
    };
    form.addEventListener("input", onChange);
    form.addEventListener("change", onChange);
    form.addEventListener("focusout", (e) => {
      const name = e.target.name;
      if (!FIELD_VALIDATORS[name] || name === "areas" || name === "consent") return;
      if (e.target.value.trim()) {
        touched.add(name);
        validateField(name);
      }
    });

    prefillFromUrl();
    show(1, false);
  }

  function initWizards() {
    $$('[data-component="lead-wizard"]').forEach((el, i) => initWizard(el, i));
  }

  /* ==========================================================================
     7. VISUAL EFFECTS
     ========================================================================== */

  /** Constellation / network background with travelling data packets. Pauses when the tab is hidden. */
  function initNetworkBackground() {
    const canvas = $("#bg-network");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const LINK_DIST = 150;
    const POINTER_DIST = 190;
    const TAU = Math.PI * 2;
    let width = 0;
    let height = 0;
    let nodes = [];
    let packets = [];
    let rafId = 0;
    const pointer = { x: -9999, y: -9999 };

    function makeNode() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: 0.6 + Math.random() * 1.3,
        indigo: Math.random() < 0.18,
        phase: Math.random() * TAU
      };
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(22, Math.min(95, Math.round((width * height) / 21000)));
      nodes = Array.from({ length: count }, makeNode);
      packets = [];
    }

    function spawnPacket() {
      const a = nodes[(Math.random() * nodes.length) | 0];
      const neighbours = nodes.filter((n) => n !== a && Math.hypot(n.x - a.x, n.y - a.y) < LINK_DIST);
      if (!neighbours.length) return;
      packets.push({ a, b: neighbours[(Math.random() * neighbours.length) | 0], t: 0, speed: 0.006 + Math.random() * 0.008 });
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      const animate = !REDUCED_MOTION;

      for (const n of nodes) {
        if (animate) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -20) n.x = width + 20;
          else if (n.x > width + 20) n.x = -20;
          if (n.y < -20) n.y = height + 20;
          else if (n.y > height + 20) n.y = -20;
        }
      }

      ctx.lineWidth = 0.6;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.2;
            ctx.strokeStyle = "rgba(56,189,248," + alpha.toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const pd = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        if (pd < POINTER_DIST) {
          ctx.strokeStyle = "rgba(0,229,255," + ((1 - pd / POINTER_DIST) * 0.28).toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = animate ? 0.55 + 0.45 * Math.sin(time * 0.0012 + n.phase) : 0.8;
        ctx.fillStyle = n.indigo ? "rgba(129,140,248," + (0.55 * twinkle).toFixed(3) + ")" : "rgba(186,230,253," + (0.7 * twinkle).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, TAU);
        ctx.fill();
      }

      if (animate) {
        if (packets.length < 7 && Math.random() < 0.04) spawnPacket();
        packets = packets.filter((pk) => pk.t < 1 && Math.hypot(pk.a.x - pk.b.x, pk.a.y - pk.b.y) < LINK_DIST * 1.1);
        for (const pk of packets) {
          pk.t += pk.speed;
          const x = pk.a.x + (pk.b.x - pk.a.x) * pk.t;
          const y = pk.a.y + (pk.b.y - pk.a.y) * pk.t;
          ctx.fillStyle = "rgba(0,229,255,0.18)";
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "rgba(0,240,255,0.95)";
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, TAU);
          ctx.fill();
        }
      }
    }

    function loop(time) {
      draw(time);
      rafId = window.requestAnimationFrame(loop);
    }

    function start() {
      if (REDUCED_MOTION) {
        draw(0);
        return;
      }
      if (!rafId) rafId = window.requestAnimationFrame(loop);
    }

    function stop() {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (REDUCED_MOTION) draw(0);
      }, 150);
    });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

    // Pointer drives both the canvas links and the CSS hex-grid spotlight (--mx / --my).
    let pointerFrame = 0;
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse") return;
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        if (pointerFrame) return;
        pointerFrame = window.requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--mx", pointer.x + "px");
          document.documentElement.style.setProperty("--my", pointer.y + "px");
          pointerFrame = 0;
        });
      },
      { passive: true }
    );
    document.addEventListener("pointerleave", () => {
      pointer.x = -9999;
      pointer.y = -9999;
    });

    resize();
    start();
  }

  /** Reveal-on-scroll only for elements below the fold, so above-the-fold content never flickers. */
  function initReveal() {
    const items = $$("[data-reveal]");
    if (!items.length || REDUCED_MOTION || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    items.forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add("reveal-pending");
        observer.observe(el);
      }
    });
  }

  /** Count-up for trust bar metrics. Final values are already in the HTML (no-JS / SEO safe). */
  function initCounters() {
    const items = $$("[data-count]");
    if (!items.length || REDUCED_MOTION || !("IntersectionObserver" in window)) return;
    const run = (el) => {
      const target = Number(el.getAttribute("data-count"));
      const suffix = el.getAttribute("data-suffix") || "";
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (progress < 1) window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    items.forEach((el) => observer.observe(el));
  }

  /* ==========================================================================
     8. STATS PAGE (stats.html)
     --------------------------------------------------------------------------
     ACCESS CONTROL: stats.html is a static file and therefore publicly reachable.
     - static mode: it only shows data from THIS browser's localStorage (no shared data leaks).
     - api mode: real protection MUST be enforced server-side on /api/analytics/summary
       (e.g. bearer token / Cloudflare Access / IP allow-list). The token field below
       only forwards a token as "Authorization: Bearer <token>"; it is not a security boundary.
     Expected summary JSON shape: { visits, pageviews, leads, byPath, byReferrer,
       byUtmSource, byUtmCampaign, recentLeads: [{ timestamp, areas[], companySize,
       urgency, preferredContactChannel, emailMasked, utm_source }], firstSeen, lastSeen }
     ========================================================================== */

  function localSummary() {
    const data = Object.assign(emptyAnalytics(), store.get(STORAGE_KEYS.analytics, {}));
    const leads = store.get(STORAGE_KEYS.leads, []);
    return Object.assign({}, data, { source: "local", leads: leads.length, recentLeads: leads });
  }

  function demoSummary() {
    const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();
    return {
      source: "demo",
      visits: 412,
      pageviews: 1286,
      leads: 9,
      byPath: { "index.html": 512, "software.html": 188, "infrastruktura.html": 142, "bazy-danych.html": 131, "integracje.html": 117, "audyty.html": 96, "kontakt.html": 100 },
      byReferrer: { "(direct)": 160, "www.google.com": 121, "l.facebook.com": 74, "www.linkedin.com": 57 },
      byUtmSource: { "(none)": 251, facebook: 98, linkedin: 41, newsletter: 22 },
      byUtmCampaign: { "(none)": 251, "b2b-infra-q4": 72, "sql-audit-lead": 51, "net-modernization": 38 },
      recentLeads: [
        { timestamp: daysAgo(0.3), areas: ["Dane & Bazy SQL"], companySize: "51-250", urgency: "urgent", preferredContactChannel: "teams", emailMasked: "a***@firma-demo.pl", utm_source: "facebook" },
        { timestamp: daysAgo(1.2), areas: ["Infrastruktura IT", "Audyty & Optymalizacja"], companySize: "250+", urgency: "1-3-months", preferredContactChannel: "email", emailMasked: "k***@logistyka-demo.pl", utm_source: "linkedin" },
        { timestamp: daysAgo(3.6), areas: ["Software & Aplikacje"], companySize: "11-50", urgency: "strategic", preferredContactChannel: "phone", emailMasked: "m***@demo.co.uk", utm_source: "" }
      ],
      firstSeen: daysAgo(30),
      lastSeen: daysAgo(0)
    };
  }

  async function apiSummary() {
    const token = store.get(STORAGE_KEYS.statsToken, "", session);
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    const response = await fetchWithTimeout(apiUrl(ENDPOINTS.summary), { method: "GET", headers });
    if (response.status === 401 || response.status === 403) throw new Error("unauthorized");
    if (!response.ok) throw new Error("HTTP " + response.status);
    return Object.assign({ source: "api" }, await response.json());
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
  }

  function renderBarList(container, map) {
    const entries = Object.entries(map || {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const max = entries.length ? entries[0][1] : 0;
    if (!entries.length) {
      container.replaceChildren(h("p", { class: "stats-empty", text: "Brak danych." }));
      return;
    }
    container.replaceChildren(
      h(
        "ul",
        { class: "bar-list" },
        entries.map(([label, value]) => {
          const fill = h("span", { class: "bar-list__fill" });
          fill.style.width = (max ? Math.max(2, (value / max) * 100) : 0) + "%";
          return h("li", { class: "bar-list__row" }, h("span", { class: "bar-list__label", text: label }), h("span", { class: "bar-list__track" }, fill), h("span", { class: "bar-list__value", text: String(value) }));
        })
      )
    );
  }

  function renderStats(summary) {
    const kpis = $("#stats-kpis");
    const perVisit = summary.visits ? (summary.pageviews / summary.visits).toFixed(2) : "0";
    const conversion = summary.visits ? ((summary.leads / summary.visits) * 100).toFixed(1) + "%" : "0%";
    kpis.replaceChildren(
      ...[
        ["Wizyty (sesje)", summary.visits],
        ["Odsłony", summary.pageviews],
        ["Zdarzenia Lead", summary.leads],
        ["Odsłony / wizytę", perVisit],
        ["Konwersja wizyta → Lead", conversion]
      ].map(([label, value]) => h("div", { class: "kpi" }, h("span", { class: "kpi__value", text: String(value) }), h("span", { class: "kpi__label", text: label })))
    );

    renderBarList($("#stats-paths"), summary.byPath);
    renderBarList($("#stats-referrers"), summary.byReferrer);
    renderBarList($("#stats-utm-source"), summary.byUtmSource);
    renderBarList($("#stats-utm-campaign"), summary.byUtmCampaign);

    const leadsBody = $("#stats-leads");
    const leads = Array.isArray(summary.recentLeads) ? summary.recentLeads.slice(0, 50) : [];
    leadsBody.replaceChildren(
      ...(leads.length
        ? leads.map((l) =>
            h(
              "tr",
              null,
              h("td", { text: formatDate(l.timestamp) }),
              h("td", { text: Array.isArray(l.areas) ? l.areas.join(", ") : "—" }),
              h("td", { text: l.companySize ? labelFor(COMPANY_SIZES, l.companySize) : "—" }),
              h("td", { text: l.urgency ? labelFor(URGENCY_OPTIONS, l.urgency) : "—" }),
              h("td", { text: labelFor(CONTACT_CHANNELS, l.preferredContactChannel) }),
              h("td", { text: l.emailMasked || "—" }),
              h("td", { text: l.utm_source || "—" })
            )
          )
        : [h("tr", null, h("td", { colspan: "7", class: "stats-empty", text: "Brak zgłoszeń." }))])
    );

    const sourceLabels = { local: "Dane lokalne (ta przeglądarka)", api: "API: " + (CONFIG.apiBaseUrl || ""), demo: "Dane demonstracyjne" };
    $("#stats-source").textContent = sourceLabels[summary.source] || summary.source;
    $("#stats-range").textContent = formatDate(summary.firstSeen) + " → " + formatDate(summary.lastSeen);
  }

  function initStatsPage() {
    if (pageId() !== "stats") return;
    const statusEl = $("#stats-status");
    const authForm = $("#stats-auth");

    $("#stats-mode").textContent = isApiMode() ? "api" : "static";
    const exclusion = trackingExclusionReason();
    $("#stats-tracking").textContent = exclusion ? "Wykluczona — " + exclusion : "Aktywne";
    $("#stats-tracking").classList.toggle("is-off", Boolean(exclusion));
    if (authForm) authForm.hidden = !isApiMode();

    async function load() {
      statusEl.textContent = "";
      if (store.get(STORAGE_KEYS.statsDemo, false, session)) {
        renderStats(demoSummary());
        return;
      }
      if (!isApiMode()) {
        renderStats(localSummary());
        return;
      }
      try {
        renderStats(await apiSummary());
      } catch (err) {
        statusEl.textContent =
          err.message === "unauthorized"
            ? "Brak autoryzacji — podaj poprawny token dostępu."
            : "Nie udało się pobrać statystyk z API. Wyświetlam dane lokalne tej przeglądarki.";
        renderStats(localSummary());
      }
    }

    $$("[data-stats-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-stats-action");
        if (action === "refresh") load();
        if (action === "demo") {
          const on = !store.get(STORAGE_KEYS.statsDemo, false, session);
          store.set(STORAGE_KEYS.statsDemo, on, session);
          btn.setAttribute("aria-pressed", String(on));
          load();
        }
        if (action === "export") {
          const blob = new Blob([JSON.stringify(localSummary(), null, 2)], { type: "application/json" });
          const a = h("a", { href: URL.createObjectURL(blob), download: "fordon-stats-" + new Date().toISOString().slice(0, 10) + ".json" });
          document.body.append(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }
        if (action === "clear" && window.confirm("Usunąć lokalne statystyki i zapisane zgłoszenia z tej przeglądarki?")) {
          store.remove(STORAGE_KEYS.analytics);
          store.remove(STORAGE_KEYS.leads);
          load();
        }
        if (action === "notrack") {
          if (store.get(STORAGE_KEYS.notrack, false)) store.remove(STORAGE_KEYS.notrack);
          else store.set(STORAGE_KEYS.notrack, true);
          const reason = trackingExclusionReason();
          $("#stats-tracking").textContent = reason ? "Wykluczona — " + reason : "Aktywne";
          $("#stats-tracking").classList.toggle("is-off", Boolean(reason));
        }
      });
    });
    const demoBtn = $('[data-stats-action="demo"]');
    if (demoBtn) demoBtn.setAttribute("aria-pressed", String(Boolean(store.get(STORAGE_KEYS.statsDemo, false, session))));

    if (authForm) {
      authForm.addEventListener("submit", (e) => {
        e.preventDefault();
        store.set(STORAGE_KEYS.statsToken, authForm.elements.token.value.trim(), session);
        authForm.elements.token.value = "";
        load();
      });
    }

    load();
  }

  /* ==========================================================================
     9. BOOTSTRAP + PUBLIC API
     ========================================================================== */

  function safely(name, fn) {
    try {
      fn();
    } catch (err) {
      // One failing module must never take down the rest of the page.
      console.error("[Fordon] " + name + " failed:", err);
    }
  }

  function init() {
    document.documentElement.classList.add("js");
    safely("notrack", applyNotrackParam);
    safely("metaPixel", initMetaPixel);
    safely("header", renderHeader);
    safely("footer", renderFooter);
    safely("breadcrumbs", renderBreadcrumbs);
    safely("pillarNav", renderPillarNav);
    safely("hexGrid", renderHexGrid);
    safely("process", renderProcess);
    safely("heroCluster", renderHeroCluster);
    safely("social", renderSocialLinks);
    safely("bindConfig", bindConfigValues);
    safely("portrait", initPortrait);
    safely("wizards", initWizards);
    safely("background", initNetworkBackground);
    safely("reveal", initReveal);
    safely("counters", initCounters);
    safely("stats", initStatsPage);
    safely("trackPageVisit", trackPageVisit);
  }

  // Public API for future modules (calculators, product modules, backend integrations).
  window.FordonApp = Object.freeze({
    config: CONFIG,
    pillars: PILLARS,
    trackPageVisit,
    trackLeadEvent,
    submitLeadForm,
    isApiMode
  });
  window.trackPageVisit = trackPageVisit;
  window.trackLeadEvent = trackLeadEvent;
  window.submitLeadForm = submitLeadForm;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
