import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

const dict = {
  en: {
    // Navbar
    "nav.home": "Home",
    "nav.browse": "Browse",
    "nav.genres": "Genres",
    "nav.search_placeholder": "Search anime...",
    "nav.menu": "Menu",
    // Hero
    "hero.featured": "Featured Anime",
    "hero.episodes": "episodes",
    "hero.watch_now": "Watch Now",
    "hero.more_info": "More Info",
    // Card / Row
    "row.view_all": "View all",
    "card.ep": "ep",
    // Browse
    "browse.title": "Browse Anime",
    "browse.subtitle": "Explore top-rated and most popular series.",
    "browse.top": "Top Rated",
    "browse.popular": "Most Popular",
    // Home rows
    "row.trending": "Trending Now",
    "row.season": "This Season",
    "row.top": "Top Rated",
    "row.upcoming": "Upcoming",
    // Genres
    "genres.title": "Genres",
    "genres.subtitle": "Pick a genre to explore.",
    "genre.suffix": "Anime",
    // Search
    "search.title": "Search anime",
    "search.results_for": "Results for",
    "search.count_suffix": "results",
    "search.hint": "Use the search bar above to find your favorite anime.",
    "search.none": "No results found.",
    // Anime detail
    "anime.watch_ep1": "Watch Episode 1",
    "anime.synopsis": "Synopsis",
    "anime.no_synopsis": "No synopsis available.",
    "anime.studio": "Studio:",
    "anime.trailer": "Trailer",
    "anime.related": "You may also like",
    "anime.eps_short": "eps",
    // Watch
    "watch.back_to": "Back to",
    "watch.anime": "anime",
    "watch.episode": "Episode",
    "watch.episodes_title": "Episodes",
    "watch.extracting": "Extracting from",
    "watch.server": "server",
    "watch.trying_server": "Trying server",
    "watch.no_direct": "No direct stream found",
    "watch.all_tried": "All {n} servers were tried. Switch to",
    "watch.embed_mode": "Embed mode",
    "watch.to_try_iframe": "to try iframe playback.",
    "watch.loading": "Loading",
    "watch.no_server": "No server selected",
    "watch.direct": "⚡ Direct Stream (VPA)",
    "watch.embed": "Embed iframe",
    "watch.reload": "Reload",
    "watch.servers": "Servers",
    "watch.streaming_via_proxy": "● streaming via proxy",
    "watch.vpa_hint": "VPA extracts the direct .m3u8 server-side and streams it through our proxy — no iframe blocks. Auto-switches if a server can't be extracted.",
    "watch.embed_hint": "If a server doesn't load within ~12s it auto-switches to the next one.",
    // Footer
    "footer.tagline": "Stream your favorite anime. Powered by MyAnimeList (Jikan API).",
    "footer.copy": "Demo project.",
    // 404 / error
    "err.404_title": "Page not found",
    "err.404_desc": "The page you're looking for doesn't exist or has been moved.",
    "err.go_home": "Go home",
    "err.title": "This page didn't load",
    "err.desc": "Something went wrong on our end. You can try refreshing or head back home.",
    "err.try_again": "Try again",
    // Language
    "lang.label": "Language",
  },
  ar: {
    "nav.home": "الرئيسية",
    "nav.browse": "تصفح",
    "nav.genres": "التصنيفات",
    "nav.search_placeholder": "ابحث عن أنمي...",
    "nav.menu": "القائمة",
    "hero.featured": "أنمي مميز",
    "hero.episodes": "حلقة",
    "hero.watch_now": "شاهد الآن",
    "hero.more_info": "مزيد من المعلومات",
    "row.view_all": "عرض الكل",
    "card.ep": "حلقة",
    "browse.title": "تصفح الأنمي",
    "browse.subtitle": "استكشف الأعلى تقييماً والأكثر شعبية.",
    "browse.top": "الأعلى تقييماً",
    "browse.popular": "الأكثر شعبية",
    "row.trending": "الرائج الآن",
    "row.season": "هذا الموسم",
    "row.top": "الأعلى تقييماً",
    "row.upcoming": "قادم قريباً",
    "genres.title": "التصنيفات",
    "genres.subtitle": "اختر تصنيفاً لاستكشافه.",
    "genre.suffix": "أنمي",
    "search.title": "البحث عن أنمي",
    "search.results_for": "نتائج البحث عن",
    "search.count_suffix": "نتيجة",
    "search.hint": "استخدم شريط البحث في الأعلى للعثور على الأنمي المفضل لديك.",
    "search.none": "لم يتم العثور على نتائج.",
    "anime.watch_ep1": "شاهد الحلقة 1",
    "anime.synopsis": "القصة",
    "anime.no_synopsis": "لا يوجد ملخص متاح.",
    "anime.studio": "الاستوديو:",
    "anime.trailer": "المقدمة الترويجية",
    "anime.related": "قد يعجبك أيضاً",
    "anime.eps_short": "حلقة",
    "watch.back_to": "العودة إلى",
    "watch.anime": "الأنمي",
    "watch.episode": "الحلقة",
    "watch.episodes_title": "الحلقات",
    "watch.extracting": "جاري الاستخراج من",
    "watch.server": "السيرفر",
    "watch.trying_server": "جاري تجربة السيرفر",
    "watch.no_direct": "لم يتم العثور على بث مباشر",
    "watch.all_tried": "تمت تجربة جميع السيرفرات ({n}). انتقل إلى",
    "watch.embed_mode": "وضع iframe",
    "watch.to_try_iframe": "لتجربة التشغيل عبر iframe.",
    "watch.loading": "جاري التحميل",
    "watch.no_server": "لم يتم اختيار سيرفر",
    "watch.direct": "⚡ بث مباشر (VPA)",
    "watch.embed": "تشغيل iframe",
    "watch.reload": "إعادة تحميل",
    "watch.servers": "السيرفرات",
    "watch.streaming_via_proxy": "● البث عبر الوكيل",
    "watch.vpa_hint": "ميزة VPA تستخرج رابط .m3u8 المباشر من الخادم وتشغّله عبر الوكيل دون أي حجب من iframe. يتم التبديل تلقائياً عند فشل أحد السيرفرات.",
    "watch.embed_hint": "إذا لم يحمّل السيرفر خلال 12 ثانية يتم الانتقال تلقائياً إلى التالي.",
    "footer.tagline": "شاهد أنميك المفضل. مدعوم بواسطة MyAnimeList (Jikan API).",
    "footer.copy": "مشروع تجريبي.",
    "err.404_title": "الصفحة غير موجودة",
    "err.404_desc": "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
    "err.go_home": "العودة إلى الرئيسية",
    "err.title": "تعذر تحميل هذه الصفحة",
    "err.desc": "حدث خطأ ما. يمكنك إعادة التحميل أو العودة إلى الرئيسية.",
    "err.try_again": "حاول مرة أخرى",
    "lang.label": "اللغة",
  },
} as const;

type Key = keyof typeof dict["en"];

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (saved === "ar" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (k: Key, vars?: Record<string, string | number>) => {
    let s: string = (dict[lang] as Record<string, string>)[k] ?? (dict.en as Record<string, string>)[k] ?? k;
    if (vars) for (const [key, val] of Object.entries(vars)) s = s.replace(`{${key}}`, String(val));
    return s;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  // Fallback when used outside the provider (e.g. router boundaries)
  const lang: Lang =
    (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang)) || "en";
  const t = (k: Key, vars?: Record<string, string | number>) => {
    let s: string = (dict[lang] as Record<string, string>)[k] ?? (dict.en as Record<string, string>)[k] ?? k;
    if (vars) for (const [key, val] of Object.entries(vars)) s = s.replace(`{${key}}`, String(val));
    return s;
  };
  return { lang, setLang: () => {}, t, dir: lang === "ar" ? "rtl" : "ltr" } as Ctx;
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`flex gap-1 rounded-full bg-surface p-1 ${className}`}>
      <button
        onClick={() => setLang("en")}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        onClick={() => setLang("ar")}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          lang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-pressed={lang === "ar"}
      >
        AR
      </button>
    </div>
  );
}
