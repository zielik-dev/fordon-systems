/**
 * Fordon Systems — central runtime configuration.
 *
 * Loaded BEFORE js/app.js on every page. This is the only file that should
 * need editing when switching hosting phases, changing contact details or
 * enabling marketing integrations. No build step is required.
 */
window.APP_CONFIG = {
  /**
   * "static" — Phase 1 (GitHub Pages / Cloudflare Pages, no backend):
   *            no network calls to /api/*, leads + analytics kept in the
   *            visitor's browser (localStorage) and a mailto: backup is offered.
   * "api"    — Phase 2: JSON POST requests to the external backend below (CORS).
   */
  mode: "static",

  /**
   * Phase 2 backend origin, e.g. "https://api.fordonsystems.pl" (no trailing slash).
   * IMPORTANT: when set, also add this origin to `connect-src` in the
   * Content-Security-Policy <meta> tag of every HTML page.
   */
  apiBaseUrl: "",

  endpoints: {
    leads: "/api/leads",
    visit: "/api/analytics/visit",
    summary: "/api/analytics/summary"
  },

  /* Brand texts rendered in header, logo, footer and thank-you screens. */
  brand: {
    name: "FORDON SYSTEMS",
    legalName: "Fordon Systems",
    person: "Michał Zieliński",
    role: "CEO i Konsultant",
    location: "Jarużyn / Bydgoszcz",
    serviceArea: "Obsługa zdalna: cała Polska & UK"
  },

  /* Company registry data — rendered in the footer only when filled in. */
  company: {
    nip: "",
    regon: ""
  },

  /* Absolute or relative URL of the privacy policy page (RODO art. 13). Rendered next to the consent checkbox when set. */
  privacyPolicyUrl: "",

  socialLinks: {
    linkedin: "https://www.linkedin.com/in/michal-zielinski-a67a75123/",
    // TODO: replace with the target Fordon Systems Facebook profile/page URL.
    facebook: "#facebook-url"
  },

  contact: {
    email: "kontakt@fordonsystems.pl",
    teamsLabel: "Microsoft Teams",
    // Optional: public Microsoft Bookings / Teams meeting link. When empty, the
    // Teams channel opens the qualification form with "Teams" preselected.
    teamsUrl: "",
    // Optional: shown in footer/contact page when filled in, e.g. "+48 600 000 000".
    phone: ""
  },

  /**
   * Meta Pixel (Meta Ads). Set enabled: true and a numeric pixelId to load
   * fbevents.js. The Lead event is sent with eventID = leadId so the backend
   * Conversions API (CAPI) can deduplicate it in Phase 2.
   */
  metaPixel: {
    enabled: false,
    pixelId: ""
  },

  analytics: {
    enabled: true,
    // Own/test traffic exclusion. IP-based exclusion is only possible server-side (Phase 2).
    excludeLocalhost: true,
    excludedHosts: [],
    respectDoNotTrack: true,
    // ?notrack=1 permanently excludes this browser, ?notrack=0 re-enables tracking.
    notrackParam: "notrack"
  }
};
