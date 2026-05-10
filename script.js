import { translations } from './translations.js';
import {
    getLocaleFromPath,
    normalizePathname,
    parseRoute,
    stripLocalePrefix,
    switchLocalePath,
    withLocalePath
} from './src/router/path.js';

let currentLang = 'en';

function updateLangFromUrl() {
    const normalizedPath = normalizePathname(window.location.pathname);
    if (normalizedPath !== window.location.pathname) {
        window.history.replaceState(
            window.history.state || {},
            '',
            `${normalizedPath}${window.location.search}${window.location.hash}`
        );
    }
    currentLang = getLocaleFromPath(normalizedPath);
}
updateLangFromUrl();

const API_BASE_URL = 'https://afterglowr.onrender.com';
const SITE_URL = 'https://afterglowr-wallpapers.vercel.app';

function getApiBaseUrl() {
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isLocalHost ? 'http://localhost:3000' : API_BASE_URL;
}

function apiUrl(path) {
    const baseUrl = getApiBaseUrl();
    if (!path) return baseUrl;
    return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
}

function getAbsoluteUrl(pathValue = '/', locale = currentLang) {
    return `${SITE_URL}${withLocalePath(pathValue || '/', locale)}`;
}

function setUrlMetaTags(routePath = '/') {
    const canonical = getAbsoluteUrl(routePath, currentLang);
    const enUrl = getAbsoluteUrl(routePath, 'en');
    const zhUrl = getAbsoluteUrl(routePath, 'zh');

    const ogUrl = document.getElementById('ogUrl');
    const canonicalUrl = document.getElementById('canonicalUrl');
    const hrefLangEn = document.getElementById('hrefLangEn') || document.querySelector('link[rel="alternate"][hreflang="en"]');
    const hrefLangZh = document.getElementById('hrefLangZh') || document.querySelector('link[rel="alternate"][hreflang="zh"]');
    const hrefLangDefault = document.getElementById('hrefLangDefault') || document.querySelector('link[rel="alternate"][hreflang="x-default"]');

    document.documentElement.lang = currentLang === 'zh' ? 'zh' : 'en';
    if (ogUrl) ogUrl.setAttribute('content', canonical);
    if (canonicalUrl) canonicalUrl.setAttribute('href', canonical);
    if (hrefLangEn) hrefLangEn.setAttribute('href', enUrl);
    if (hrefLangZh) hrefLangZh.setAttribute('href', zhUrl);
    if (hrefLangDefault) hrefLangDefault.setAttribute('href', enUrl);

    return canonical;
}


function normalizeTextForSearch(value) {
    return String(value || '').toLowerCase().trim();
}

function makeKeywordString(wp) {
    return normalizeTextForSearch([
        wp?.title,
        wp?.category,
        wp?.resolution,
        ...(wp?.tags || [])
    ].join(' '));
}

function isRecentlyAddedWallpaper(wp) {
    const rawDate = wp?.createdAt || wp?.updatedAt || wp?.dateAdded;
    if (!rawDate) return false;
    const time = new Date(rawDate).getTime();
    if (!Number.isFinite(time)) return false;
    return (Date.now() - time) <= 7 * 24 * 60 * 60 * 1000;
}

function buildSeoTitle(wp, typeLabel = '') {
    const title = wp?.title || 'Cinematic Wallpaper';
    const category = wp?.category ? `${wp.category} ` : '';
    const typePart = typeLabel ? `${typeLabel} ` : '';
    return `${title} ${category}${typePart}4K Wallpaper Download | Afterglowr`.replace(/\s+/g,' ').trim();
}

function buildSeoDescription(wp, typeLabel = '') {
    const title = wp?.title || 'this cinematic wallpaper';
    const tags = (wp?.tags || []).slice(0, 6).join(', ');
    const resolution = wp?.resolution || 'high resolution';
    const typePart = typeLabel ? `${typeLabel.toLowerCase()} ` : '';
    return `Download ${title} as a ${typePart}wallpaper in ${resolution}. Explore cinematic, realistic, atmospheric wallpapers${tags ? ` featuring ${tags}` : ''}.`;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (translations[currentLang][key]) {
            el.innerHTML = translations[currentLang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) {
            el.placeholder = translations[currentLang][key];
        }
    });

    // Update SEO Meta Tags
    const pageTitle = document.getElementById('pageTitle');
    const metaDesc = document.getElementById('metaDescription');
    const hrefLangEn = document.getElementById('hrefLangEn');
    const hrefLangZh = document.getElementById('hrefLangZh');
    const canonicalLink = document.getElementById('canonicalLink');

    if (pageTitle && translations[currentLang]['title']) {
        pageTitle.textContent = translations[currentLang]['title'];
    }

    const langToggleBtn = document.getElementById('langToggleBtn');
    if (langToggleBtn) {
        langToggleBtn.textContent = currentLang === 'en' ? '🌐 中文' : '🌐 English';
    }

}

const SEO_TRAFFIC_PAGES = {
    'cyberpunk-wallpapers': {
        category: 'Gaming',
        enTitle: 'Cyberpunk 4K Wallpapers',
        zhTitle: '賽博龐克 4K 桌布',
        enDesc: 'Download cyberpunk 4K wallpapers with neon lights, rainy streets, futuristic cities, and cinematic atmosphere.',
        zhDesc: '下載賽博龐克 4K 桌布，包含霓虹燈、雨夜街道、未來城市與電影感氛圍。'
    },
    'dark-wallpapers': {
        category: 'Vibe',
        enTitle: 'Dark Aesthetic Wallpapers',
        zhTitle: '暗色美學桌布',
        enDesc: 'Explore dark aesthetic wallpapers with cinematic lighting, moody shadows, quiet rooms, and realistic atmosphere.',
        zhDesc: '探索暗色美學桌布，結合電影感光影、深色陰影、安靜空間與擬真氛圍。'
    },
    'rainy-city-wallpapers': {
        category: 'Landscape',
        enTitle: 'Rainy City Wallpapers',
        zhTitle: '雨夜城市桌布',
        enDesc: 'Browse rainy city wallpapers with wet streets, neon reflections, atmospheric bokeh, and cinematic urban mood.',
        zhDesc: '瀏覽雨夜城市桌布，包含濕潤街道、霓虹反射、氛圍散景與電影感都市情緒。'
    },
    'minimal-wallpapers': {
        category: 'Vibe',
        enTitle: 'Minimal 4K Wallpapers',
        zhTitle: '極簡風 4K 桌布',
        enDesc: 'Discover minimal wallpapers with clean composition, quiet lighting, modern objects, and refined cinematic style.',
        zhDesc: '探索極簡風桌布，包含乾淨構圖、安靜光影、現代物件與精緻電影感。'
    },
    'anime-wallpapers': {
        category: 'Portrait',
        enTitle: 'Anime Style Wallpapers',
        zhTitle: '動漫風格桌布',
        enDesc: 'Discover anime-style wallpapers with elegant characters, fantasy mood, cinematic lighting, and detailed compositions.',
        zhDesc: '探索動漫風格桌布，包含精緻角色、奇幻氛圍、電影感光影與細膩構圖。'
    }
};

function getSeoTrafficPage(path = window.location.pathname) {
    const key = stripLocalePrefix(path).replace(/^\/+|\/+$/g, '');
    return SEO_TRAFFIC_PAGES[key] || null;
}

function updateTrafficSeoMeta(seoPage) {
    if (!seoPage) return;

    const baseUrl = SITE_URL;
    const key = stripLocalePrefix(window.location.pathname).replace(/^\/+|\/+$/g, '');
    const routePath = key ? `/${key}` : '/';
    const url = setUrlMetaTags(routePath);
    const title = currentLang === 'zh' ? `${seoPage.zhTitle} | Afterglowr` : `${seoPage.enTitle} | Afterglowr`;
    const desc = currentLang === 'zh' ? seoPage.zhDesc : seoPage.enDesc;

    const pageTitle = document.getElementById('pageTitle');
    const metaDesc = document.getElementById('metaDescription');
    const ogTitle = document.getElementById('ogTitle');
    const ogDesc = document.getElementById('ogDescription');
    const structuredData = document.getElementById('structuredData');

    if (pageTitle) pageTitle.textContent = title;
    if (metaDesc) metaDesc.setAttribute('content', desc);
    if (ogTitle) ogTitle.setAttribute('content', title);
    if (ogDesc) ogDesc.setAttribute('content', desc);
    if (structuredData) {
        structuredData.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": title,
            "url": url,
            "description": desc,
            "isPartOf": {
                "@type": "WebSite",
                "name": "Afterglowr",
                "url": baseUrl
            }
        }, null, 2);
    }
}

function updateTrafficSeoBlock(seoPage) {
    if (!seoPage) return;

    const seoBlock = document.getElementById('categorySeoBlock');
    const seoTitle = document.getElementById('seoTitle');
    const seoDesc = document.getElementById('seoDesc');

    if (seoBlock) seoBlock.classList.remove('hidden');
    if (seoTitle) seoTitle.textContent = currentLang === 'zh' ? seoPage.zhTitle : seoPage.enTitle;
    if (seoDesc) seoDesc.textContent = currentLang === 'zh' ? seoPage.zhDesc : seoPage.enDesc;

    updateTrafficSeoMeta(seoPage);
}


// === Pinterest SEO Generator ===
function generatePinterestContent(wp) {
    if (!wp) return '';

    const title = wp.title || 'Cinematic Wallpaper';
    const tags = (wp.tags || []).slice(0, 5);
    const category = wp.category || 'wallpaper';

    const pinTitle = `${title} | 4K ${category} Wallpaper`;

    const pinDesc = `Download ${title} in 4K resolution. Cinematic lighting, realistic atmosphere, high quality wallpaper${tags.length ? ` featuring ${tags.join(', ')}` : ''}. Free download on Afterglowr.`;

    const hashtags = [
        '#wallpaper',
        '#4kwallpaper',
        '#aesthetic',
        '#cinematic',
        '#desktopwallpaper',
        '#mobilewallpaper',
        ...tags.map(t => '#' + String(t).replace(/\s+/g, '').replace(/[^\w]/g, ''))
    ].join(' ');

    return `${pinTitle}\n\n${pinDesc}\n\n${hashtags}`;
}

async function copyPinterestText(wp, buttonEl = null) {
    const text = generatePinterestContent(wp);
    if (!text) return;

    try {
        await navigator.clipboard.writeText(text);
        if (buttonEl) {
            const oldText = buttonEl.innerHTML;
            buttonEl.innerHTML = '<span class="icon">✅</span><span>Copied</span>';
            setTimeout(() => {
                buttonEl.innerHTML = oldText;
            }, 1300);
        } else {
            alert(currentLang === 'zh' ? '已複製 Pinterest 文案' : 'Pinterest text copied');
        }
    } catch (err) {
        console.warn('Pinterest copy failed:', err);
        alert(currentLang === 'zh' ? '複製失敗，請再試一次' : 'Copy failed, please try again.');
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const obsvr = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => obsvr.observe(el));

    // 非同步讀取 tags.json 標籤庫 (保留手動覆寫的功能)
    let tagsData = {};
    try {
        const response = await fetch('/tags.json');
        if (response.ok) {
            tagsData = await response.json();
        }
    } catch (e) {
        console.warn('Could not load tags.json', e);
    }

    let wallpapers = [];
    const wallpaperMap = new Map();
    try {
        const res = await fetch('/wallpapers.json');
        if (res.ok) {
            wallpapers = await res.json();
            wallpapers.forEach(wp => {
                if (wp.id) wallpaperMap.set(wp.id, wp);
                if (wp.slug && wp.slug !== wp.id) wallpaperMap.set(wp.slug, wp);
            });
            wallpapers = wallpapers.sort(() => Math.random() - 0.5);
        }
    } catch (e) {
        console.error('Failed to load wallpapers.json', e);
    }

    wallpapers = wallpapers.filter((wp, index, list) => {
        const key = wp.id || wp.slug;
        return key && list.findIndex(item => (item.id || item.slug) === key) === index;
    });
    wallpapers = wallpapers.filter(wp => wp.desktopImg); 
    wallpapers = wallpapers.sort(() => Math.random() - 0.5); 
    
    console.log("目前載入的桌布資料:", wallpapers);

    // DOM Elements
    const homeView = document.getElementById('homeView');
    const wallpaperView = document.getElementById('wallpaperView');
    const categoryView = document.getElementById('categoryView');
    const infoPageView = document.getElementById('infoPageView');
    const infoPageKicker = document.getElementById('infoPageKicker');
    const infoPageTitle = document.getElementById('infoPageTitle');
    const infoPageLead = document.getElementById('infoPageLead');
    const infoPageContent = document.getElementById('infoPageContent');
    const categoryGallery = document.getElementById('categoryGallery');
    const catTitle = document.getElementById('catTitle');
    const catDesc = document.getElementById('catDesc');
    const catBackToHomeBtn = document.getElementById('catBackToHomeBtn');
    
    if (catBackToHomeBtn) {
        catBackToHomeBtn.addEventListener('click', () => navigateTo('/'));
    }

    const infoPages = {
        about: {
            en: {
                nav: 'About',
                title: 'About Afterglowr',
                lead: 'Afterglowr is a curated AI-assisted wallpaper project focused on cinematic lighting, atmospheric depth, and polished visual storytelling.',
                sections: [
                    {
                        title: 'What This Site Is',
                        body: 'Afterglowr Wallpapers collects original and AI-assisted wallpaper concepts, then refines them for desktop and mobile use. The goal is to share images that feel cinematic, realistic, moody, and carefully composed.'
                    },
                    {
                        title: 'Creative Approach',
                        body: 'Each wallpaper is selected around visual atmosphere: light, shadow, location, subject, texture, and mood. AI tools may support ideation and image creation, while curation, naming, presentation, and publishing decisions are handled by the Afterglowr project.'
                    },
                    {
                        title: 'Free Access',
                        body: 'Wallpapers are provided for free download for personal use. Ads and voluntary support help maintain hosting, image processing, and ongoing publishing work.'
                    }
                ]
            },
            zh: {
                nav: '關於',
                title: '關於 Afterglowr',
                lead: 'Afterglowr 是一個 AI 輔助桌布策展網站，專注於電影感光影、氛圍深度與精緻視覺敘事。',
                sections: [
                    {
                        title: '網站定位',
                        body: 'Afterglowr Wallpapers 收集原創與 AI 輔助生成的桌布概念，並整理成適合電腦與手機使用的作品。網站目標是分享具備電影感、真實感、情緒與構圖品質的視覺作品。'
                    },
                    {
                        title: '創作方式',
                        body: '每張桌布都圍繞光影、場景、主體、材質與氛圍進行篩選。AI 工具可能參與發想與影像生成，而作品整理、命名、呈現與發布由 Afterglowr 專案負責。'
                    },
                    {
                        title: '免費使用',
                        body: '本站桌布提供免費下載供個人使用。廣告與自願支持會用於維持主機、影像處理與持續更新。'
                    }
                ]
            }
        },
        privacy: {
            en: {
                nav: 'Privacy',
                title: 'Privacy Policy',
                lead: 'This Privacy Policy explains how Afterglowr handles basic website data, cookies, analytics, and advertising services.',
                sections: [
                    {
                        title: 'Google AdSense and Third-Party Advertising',
                        list: [
                            'This site may display advertisements through Google AdSense or other third-party advertising partners.',
                            'Advertising partners may use cookies or similar technologies to show, measure, and improve ads.',
                            'Ad partners may process information such as browser type, approximate location, page views, and interactions with ads.'
                        ]
                    },
                    {
                        title: 'Cookies',
                        body: 'Cookies may be used to remember preferences, support analytics, prevent abuse, and deliver relevant advertising. You can control or disable cookies through your browser settings.'
                    },
                    {
                        title: 'Google Analytics',
                        body: 'This site may use Google Analytics to understand traffic, popular pages, device types, and general visitor behavior. Analytics data is used to improve the website experience and does not require account login.'
                    },
                    {
                        title: 'User Data',
                        body: 'Afterglowr does not require user accounts for downloads. Local actions such as likes may be stored in your browser localStorage. Contact emails are used only to respond to the message you send.'
                    },
                    {
                        title: 'Contact',
                        body: 'For privacy questions, contact afterglowr.wallpaper@gmail.com.'
                    }
                ]
            },
            zh: {
                nav: '隱私權',
                title: '隱私權政策',
                lead: '本政策說明 Afterglowr 如何處理基本網站資料、cookies、分析工具與廣告服務。',
                sections: [
                    {
                        title: 'Google AdSense 與第三方廣告',
                        list: [
                            '本站可能透過 Google AdSense 或其他第三方廣告合作夥伴顯示廣告。',
                            '廣告合作夥伴可能使用 cookies 或類似技術，用於顯示、衡量與改善廣告。',
                            '廣告合作夥伴可能處理瀏覽器類型、概略位置、頁面瀏覽與廣告互動等資訊。'
                        ]
                    },
                    {
                        title: 'Cookies',
                        body: '本站可能使用 cookies 記住偏好、支援分析、防止濫用並提供相關廣告。你可以透過瀏覽器設定控制或停用 cookies。'
                    },
                    {
                        title: 'Google Analytics',
                        body: '本站可能使用 Google Analytics 了解流量、熱門頁面、裝置類型與一般訪客行為。分析資料用於改善網站體驗，不需要使用者登入。'
                    },
                    {
                        title: '使用者資料',
                        body: 'Afterglowr 下載不需要帳號。愛心等本機操作可能儲存在你的瀏覽器 localStorage。聯絡信件僅用於回覆你的來信。'
                    },
                    {
                        title: '聯絡',
                        body: '如有隱私相關問題，請聯絡 afterglowr.wallpaper@gmail.com。'
                    }
                ]
            }
        },
        terms: {
            en: {
                nav: 'Terms',
                title: 'Terms of Use',
                lead: 'By using Afterglowr, you agree to use the wallpapers and website responsibly and within the limits described below.',
                sections: [
                    {
                        title: 'Free Downloads',
                        body: 'Wallpapers on this site are free to download for personal use, including personal devices, mood boards, and non-commercial personal projects.'
                    },
                    {
                        title: 'No Resale',
                        body: 'You may not resell, redistribute, package, upload, or offer these wallpapers as paid products, NFT assets, stock files, marketplace items, or competing wallpaper collections.'
                    },
                    {
                        title: 'Copyright and Disclaimer',
                        body: 'Images are provided for personal creation, testing, and wallpaper use. Some works may be AI-assisted. If any content raises copyright concerns, contact us and we will review it promptly.'
                    },
                    {
                        title: 'Service Changes',
                        body: 'Afterglowr may update, remove, or reorganize wallpapers and pages at any time to maintain quality, safety, and availability.'
                    }
                ]
            },
            zh: {
                nav: '使用條款',
                title: '使用條款',
                lead: '使用 Afterglowr 即表示你同意依照以下限制合理使用本站桌布與服務。',
                sections: [
                    {
                        title: '免費下載',
                        body: '本站桌布可免費下載供個人使用，包括個人裝置、靈感參考與非商業個人專案。'
                    },
                    {
                        title: '禁止二次販售',
                        body: '你不得將本站桌布轉售、重新包裝、上架、作為付費商品、NFT 素材、圖庫素材、商城項目或競爭性桌布合集散布。'
                    },
                    {
                        title: '版權與免責聲明',
                        body: '圖片提供個人創作、測試與桌布用途。部分作品可能由 AI 輔助生成。如任何內容涉及版權疑慮，請聯絡我們，我們會盡快審視。'
                    },
                    {
                        title: '服務調整',
                        body: 'Afterglowr 可能隨時更新、移除或重新整理桌布與頁面，以維持品質、安全與可用性。'
                    }
                ]
            }
        },
        contact: {
            en: {
                nav: 'Contact',
                title: 'Contact',
                lead: 'For support, copyright concerns, privacy questions, or collaboration inquiries, contact the Afterglowr project by email.',
                sections: [
                    {
                        title: 'Email',
                        body: '<a href="mailto:afterglowr.wallpaper@gmail.com">afterglowr.wallpaper@gmail.com</a>'
                    },
                    {
                        title: 'Response Scope',
                        body: 'Please include the related wallpaper title or page URL when reporting copyright, privacy, or technical issues so we can review the request efficiently.'
                    }
                ]
            },
            zh: {
                nav: '聯絡',
                title: '聯絡我們',
                lead: '如需支援、版權疑慮、隱私問題或合作洽詢，請透過電子郵件聯絡 Afterglowr 專案。',
                sections: [
                    {
                        title: '電子郵件',
                        body: '<a href="mailto:afterglowr.wallpaper@gmail.com">afterglowr.wallpaper@gmail.com</a>'
                    },
                    {
                        title: '來信建議',
                        body: '回報版權、隱私或技術問題時，請附上相關桌布名稱或頁面網址，方便我們更有效率地檢視。'
                    }
                ]
            }
        }
    };

    const backToGalleryBtn = document.getElementById('backToGalleryBtn');
    const wpMainImage = document.getElementById('wpMainImage');
    const wpTitle = document.getElementById('wpTitle');
    const wpTags = document.getElementById('wpTags');
    const wpDesc = document.getElementById('wpDesc');
    const wpToggleMobileBtn = document.getElementById('wpToggleMobileBtn');
    const wpDesktopBtn = document.getElementById('wpDesktopBtn');
    const wpMobileBtn = document.getElementById('wpMobileBtn');
    const wpSizeSwitchGroup = document.getElementById('wpSizeSwitchGroup');
    const wpDownloadBtn = document.getElementById('wpDownloadBtn');
    const wpLikeBtn = document.getElementById('wpLikeBtn');
    const wpLikeCount = document.getElementById('wpLikeCount');
    const copyPinBtn = document.getElementById('copyPinBtn');
    const modalCopyPinBtn = document.getElementById('modalCopyPinBtn');


    if (copyPinBtn) {
        copyPinBtn.addEventListener('click', () => {
            copyPinterestText(currentWpPage, copyPinBtn);
        });
    }

    if (modalCopyPinBtn) {
        modalCopyPinBtn.addEventListener('click', () => {
            copyPinterestText(currentWallpaper, modalCopyPinBtn);
        });
    }

    function updateSizeSwitchState(desktopBtn, mobileBtn, isMobile, hasMobile = true) {
        if (desktopBtn) desktopBtn.classList.toggle('active', !isMobile);
        if (mobileBtn) {
            mobileBtn.classList.toggle('active', !!isMobile);
            mobileBtn.disabled = !hasMobile;
            mobileBtn.classList.toggle('disabled', !hasMobile);
        }
    }

    function setModalSize(mode) {
        if (!currentWallpaper) return;
        if (mode === 'mobile' && !currentWallpaper.hasMobile) return;
        showingMobile = mode === 'mobile';
        updateModalContent();
    }

    function setFullPageSize(mode) {
        if (!currentWpPage) return;
        if (mode === 'mobile' && !currentWpPage.hasMobile) return;
        wpShowingMobile = mode === 'mobile';
        updateWpPageContent();
    }

    function setSwitchButtonLabel(button, mode) {
        if (!button) return;
        const label = mode === 'desktop' ? 'View Desktop Size' : 'View Mobile Size';
        const icon = mode === 'desktop' ? '💻' : '📱';
        button.classList.add('finger-hint');
        button.innerHTML = `<span class="finger" aria-hidden="true"></span><span class="icon">${icon}</span><span class="btn-text">${label}</span>`;
    }


    const heroSection = document.querySelector('.hero');
    const filtersSection = document.querySelector('.category-filters');
    const gallery = document.getElementById('gallery');
    
    // Modal Elements
    const modal = document.getElementById('wallpaperModal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalTags = document.getElementById('modalTags');
    const modalDesc = document.getElementById('modalDesc');
    const toggleMobileBtn = document.getElementById('toggleMobileBtn');
    const modalDesktopBtn = document.getElementById('modalDesktopBtn');
    const modalMobileBtn = document.getElementById('modalMobileBtn');
    const modalSizeSwitchGroup = document.getElementById('modalSizeSwitchGroup');
    const downloadBtn = document.getElementById('downloadBtn');
    const viewFullPageBtn = document.getElementById('viewFullPageBtn');
    const noMobileMsg = document.getElementById('noMobileMsg');
    const modalBackdrop = document.querySelector('.modal-backdrop');
    const modalPrevBtn = document.getElementById('modalPrevBtn');
    const modalNextBtn = document.getElementById('modalNextBtn');
    const wpPrevBtn = document.getElementById('wpPrevBtn');
    const wpNextBtn = document.getElementById('wpNextBtn');
    
    const imageContainer = document.getElementById('imageContainer');
    const downloadGateModal = document.getElementById('downloadGateModal');
    const downloadGateCountdown = document.getElementById('downloadGateCountdown');
    const downloadGateActionBtn = document.getElementById('downloadGateActionBtn');
    const downloadGateTimerMsg = document.getElementById('downloadGateTimerMsg');

    // Local engagement state.
    let appData = { likes: {}, userLiked: {} };

    try {
        const savedData = localStorage.getItem('afterglowr_app_data');
        if (savedData) {
            appData = JSON.parse(savedData);
            if (!appData.userLiked) appData.userLiked = {};
            if (!appData.likes) appData.likes = {};
        }
    } catch (e) { console.warn(e); }

    function saveAppData() {
        localStorage.setItem('afterglowr_app_data', JSON.stringify(appData));
    }
    window.fullPageLikeClick = function () {
        if (!currentWpPage) return;

        const btn = document.getElementById('wpLikeBtn');

        toggleLike(currentWpPage.id, btn);
        updateFullPageSocial();
    };

    const modalLikeBtn = document.getElementById('modalLikeBtn');
    const modalLikeCount = document.getElementById('modalLikeCount');

    let currentWallpaper = null;
    let showingMobile = false;
    let downloadUrl = '';
    let currentWpPage = null;
    let wpShowingMobile = false;
    let wpDownloadUrl = '';

    function getCurrentWallpaperIndex(wp) {
        if (!wp || !Array.isArray(wallpapers) || wallpapers.length === 0) return -1;
        return wallpapers.findIndex(item => item.id === wp.id);
    }

    function getSiblingWallpaper(wp, direction) {
        if (!wp || !Array.isArray(wallpapers) || wallpapers.length === 0) return null;
        const currentIndex = getCurrentWallpaperIndex(wp);
        if (currentIndex < 0) return null;
        const nextIndex = (currentIndex + direction + wallpapers.length) % wallpapers.length;
        return wallpapers[nextIndex] || null;
    }

    function animateImageSwap(imgEl, callback, direction = 1) {
        if (!imgEl || typeof callback !== 'function') {
            if (typeof callback === 'function') callback();
            return;
        }

        const outClass = direction > 0 ? 'wallpaper-slide-out-left' : 'wallpaper-slide-out-right';
        const inClass = direction > 0 ? 'wallpaper-slide-in-right' : 'wallpaper-slide-in-left';

        imgEl.classList.remove(
            'wallpaper-image-switching',
            'wallpaper-slide-out-left',
            'wallpaper-slide-out-right',
            'wallpaper-slide-in-left',
            'wallpaper-slide-in-right'
        );

        void imgEl.offsetWidth;
        imgEl.classList.add(outClass);

        setTimeout(() => {
            callback();

            const restore = () => {
                imgEl.classList.remove(outClass);
                imgEl.classList.add(inClass);

                setTimeout(() => {
                    imgEl.classList.remove(inClass);
                }, 420);

                imgEl.removeEventListener('load', restore);
            };

            imgEl.addEventListener('load', restore);
            setTimeout(restore, 280);
        }, 230);
    }

    function switchModalWallpaper(direction) {
        if (!currentWallpaper) return;
        const nextWallpaper = getSiblingWallpaper(currentWallpaper, direction);
        if (!nextWallpaper) return;

        animateImageSwap(modalImage, () => {
            currentWallpaper = nextWallpaper;
            showingMobile = false;
            updateModalContent();
        }, direction);
    }



    function forceRenderFullPageWallpaper(wp) {
        if (!wp) return;

        currentWpPage = wp;
        if (wpShowingMobile && !wp.hasMobile) wpShowingMobile = false;

        if (wpTitle) wpTitle.textContent = wp.title || '';
        if (wpTags) {
            wpTags.innerHTML = (wp.tags && wp.tags.length)
                ? wp.tags.map(tag => `<span class="tag-chip">#${tag}</span>`).join('')
                : '';
        }

        const useMobile = wpShowingMobile && wp.hasMobile;

        if (wpMainImage) {
            wpMainImage.src = useMobile ? (wp.mobileImg || wp.desktopImg || '') : (wp.desktopImg || '');
            wpMainImage.alt = `${wp.title || 'Wallpaper'} ${useMobile ? 'Mobile' : 'Desktop'} Wallpaper`;
        }

        if (wpDesc) {
            const baseText = useMobile
                ? (translations[currentLang].mobile_version || 'Mobile Version')
                : (translations[currentLang].desktop_version || 'Desktop Version');
            const resolution = wp.resolution || 'High Resolution';
            wpDesc.textContent = `${baseText} • ${resolution}`;
        }

        wpDownloadUrl = {
            id: wp.id,
            type: useMobile ? 'mobile' : 'desktop',
            originalKey: useMobile ? wp.mobileOriginalKey : wp.desktopOriginalKey
        };

        if (wpSizeSwitchGroup) {
            wpSizeSwitchGroup.classList.toggle('no-mobile', !wp.hasMobile);
        }
        updateSizeSwitchState(wpDesktopBtn, wpMobileBtn, useMobile, wp.hasMobile);

        if (typeof updateFullPageSocial === 'function') {
            updateFullPageSocial();
        }

        if (typeof updateDetailSEOMeta === 'function') {
            updateDetailSEOMeta(wp);
        }
    }

    function switchFullPageWallpaper(direction) {
        if (!currentWpPage) return;

        const nextWallpaper = getSiblingWallpaper(currentWpPage, direction);
        if (!nextWallpaper) return;

        animateImageSwap(wpMainImage, () => {
            currentWpPage = nextWallpaper;
            wpShowingMobile = false;

            // 直接重繪獨立頁內容，不依賴路由重新觸發
            if (typeof forceRenderFullPageWallpaper === 'function') {
                forceRenderFullPageWallpaper(nextWallpaper);
            } else if (typeof updateFullPageContent === 'function') {
                updateFullPageContent();
            } else if (typeof showWallpaperPage === 'function') {
                showWallpaperPage(nextWallpaper, { replaceUrl: true });
            }

            // 更新網址但不新增瀏覽器歷史紀錄
            const nextUrl = localizePath(`/wallpaper/${nextWallpaper.id}`);
            if (window.location.pathname !== nextUrl) {
                window.history.replaceState({ page: 'wallpaper', id: nextWallpaper.id }, '', nextUrl);
            }
        }, direction);
    }


    imageContainer.addEventListener('contextmenu', (e) => e.preventDefault());

    let currentCategory = 'all';
    let currentPage = 1;
    let searchKeyword = '';
    let sortMode = 'newest';
    let isInfiniteLoading = false;
    const ITEMS_PER_PAGE = 20;

    function getFilteredWallpapers() {
        let result = currentCategory === 'all'
            ? [...wallpapers]
            : wallpapers.filter(wp => wp.category === currentCategory);

        if (searchKeyword) {
            result = result.filter(wp => makeKeywordString(wp).includes(searchKeyword));
        }

        if (sortMode === 'popular') {
            result.sort((a, b) => (appData.likes[b.id] || 0) - (appData.likes[a.id] || 0));
        } else if (sortMode === 'az') {
            result.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
        } else if (sortMode === 'random') {
            result.sort(() => Math.random() - 0.5);
        } else {
            result.sort((a, b) => {
                const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime() || 0;
                const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime() || 0;
                return bTime - aTime;
            });
        }

        return result;
    }

    function getTotalPages() {
        return Math.max(1, Math.ceil(getFilteredWallpapers().length / ITEMS_PER_PAGE));
    }

    function getHomePageUrl(page) {
        const basePath = page <= 1 ? '/' : `/page/${page}`;
        return localizePath(basePath);
    }

    function updateHomeSEOMeta(page) {
        const pageTitle = document.getElementById('pageTitle');
        const metaDesc = document.getElementById('metaDescription');
        const ogTitle = document.getElementById('ogTitle');
        const ogDesc = document.getElementById('ogDescription');
        const structuredData = document.getElementById('structuredData');

        const defaultTitle = currentLang === 'zh' ? 'Afterglowr 電影感桌布下載' : 'Afterglowr – Cinematic Wallpapers';
        const pagedTitle = currentLang === 'zh' ? `Afterglowr 電影感桌布 - 第 ${page} 頁 | 4K 桌布下載` : `Afterglowr Cinematic Wallpapers - Page ${page} | 4K Wallpaper Download`;
        const title = page <= 1 ? defaultTitle : pagedTitle;
        const desc = page <= 1
            ? (currentLang === 'zh' ? '下載電影感、真實光影、暗色氛圍的高質感桌布，支援電腦與手機版本。' : 'Download cinematic wallpapers with realistic lighting, dark atmosphere, and no CGI feel.')
            : (currentLang === 'zh' ? `瀏覽 Afterglowr 電影感桌布第 ${page} 頁，探索適合電腦與手機的 4K 高質感桌布。` : `Browse page ${page} of Afterglowr Cinematic Wallpapers. Explore premium 4K artistic wallpapers for desktop and mobile devices.`);
        const routePath = page <= 1 ? '/' : `/page/${page}`;
        const url = setUrlMetaTags(routePath);

        if (pageTitle) pageTitle.textContent = title;
        if (metaDesc) metaDesc.setAttribute('content', desc);
        if (ogTitle) ogTitle.setAttribute('content', title);
        if (ogDesc) ogDesc.setAttribute('content', desc);
        if (structuredData) {
            const schema = {
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                "name": title,
                "url": url,
                "description": desc
            };
            structuredData.textContent = JSON.stringify(schema, null, 2);
        }
    }

    function createWallpaperCard(wp) {
        const desktopIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="12" rx="2" ry="2"></rect><path d="M8 20h8"></path><path d="M12 16v4"></path></svg>`;
        const mobileIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect><path d="M10 2h4" stroke-width="2.5"></path><circle cx="12" cy="18.5" r="1.2"></circle></svg>`;
        const badgesStr = wp.hasMobile
            ? `<span class="badge" style="display:flex; gap:8px; align-items:center;">${desktopIcon} ${mobileIcon}</span>`
            : `<span class="badge" style="display:flex; align-items:center;">${desktopIcon}</span>`;
        const seoTagsStr = (wp.tags || []).join(', ');
        const isNewWallpaper = isRecentlyAddedWallpaper(wp);
        const newBadge = isNewWallpaper ? `<span class="new-badge">NEW</span>` : '';
        const likeCount = appData.likes[wp.id] || 0;
        const cardResolution = wp.resolution || '4K / HD';

        const card = document.createElement('div');
        card.className = 'wallpaper-card animate-on-scroll page-slide-card';
        card.innerHTML = `
            <div class="card-image-wrap">
                ${newBadge}
                <img src="${wp.desktopImg}" alt="${wp.title} 4K wallpaper, ${seoTagsStr}" class="card-image" loading="lazy">
            </div>
            <div class="card-info">
                <div>
                    <div class="card-title">${wp.title}</div>
                    <div class="card-meta-line">${cardResolution}</div>
                </div>
                <div class="card-badges">${badgesStr}</div>
            </div>
            <div class="card-seo-tags">${(wp.tags || []).slice(0, 3).map(tag => `<span>#${tag}</span>`).join('')}</div>
            <div class="card-popularity">♥ ${likeCount}</div>
        `;
        card.addEventListener('click', () => openModal(wp));
        return card;
    }

    function renderGallery(options = {}) {
        const { updateUrl = false, smoothScroll = false } = options;
        const append = false;
        const filteredWallpapers = getFilteredWallpapers();
        const totalPages = getTotalPages();

        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        if (!append) {
            gallery.classList.remove('gallery-page-transition');
            void gallery.offsetWidth;
            gallery.classList.add('gallery-page-transition');
            gallery.innerHTML = '';
        }

        if (filteredWallpapers.length === 0) {
            gallery.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary); font-size: 1.2rem;">${translations[currentLang].no_wallpapers}</div>`;
            renderPagination(1);
            return;
        }

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageItems = filteredWallpapers.slice(start, end);

        pageItems.forEach((wp, index) => {
            const card = createWallpaperCard(wp);
            gallery.appendChild(card);
            setTimeout(() => card.classList.add('is-visible'), 40 + index * 25);
        });

        renderPagination(totalPages);
        updateHomeSEOMeta(currentPage);

        if (updateUrl) {
            const nextUrl = getHomePageUrl(currentPage);
            if (window.location.pathname !== nextUrl) {
                window.history.pushState({ page: currentPage }, '', nextUrl);
            }
        }

        if (smoothScroll && !append) {
            gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function renderPagination(totalPages) {
        let pagination = document.getElementById('galleryPagination');
        if (!pagination) {
            pagination = document.createElement('div');
            pagination.id = 'galleryPagination';
            pagination.className = 'gallery-pagination';
            gallery.insertAdjacentElement('afterend', pagination);
        }

        const totalItems = getFilteredWallpapers().length;
        if (totalPages <= 1) {
            pagination.innerHTML = `<div class="pagination-summary">1 / 1 · ${totalItems} wallpapers</div>`;
            return;
        }

        const pages = [];
        const addPage = (p) => {
            if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p);
        };

        addPage(1);
        addPage(currentPage - 2);
        addPage(currentPage - 1);
        addPage(currentPage);
        addPage(currentPage + 1);
        addPage(currentPage + 2);
        addPage(totalPages);
        pages.sort((a, b) => a - b);

        let buttons = '';
        let previous = 0;
        pages.forEach(p => {
            if (previous && p - previous > 1) buttons += `<span class="pagination-ellipsis">…</span>`;
            buttons += `<button type="button" class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
            previous = p;
        });

        pagination.innerHTML = `
            <div class="pagination-summary">Page ${currentPage} / ${totalPages} · ${totalItems} wallpapers</div>
            <div class="pagination-controls">
                <button type="button" class="page-nav" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>
                ${buttons}
                <button type="button" class="page-nav" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>
            </div>
        `;
    }

    document.addEventListener('click', (e) => {
        const pageBtn = e.target.closest('#galleryPagination button[data-page]');
        if (!pageBtn || pageBtn.disabled) return;

        e.preventDefault();
        const targetPage = parseInt(pageBtn.getAttribute('data-page'), 10);
        const totalPages = getTotalPages();
        if (!Number.isFinite(targetPage) || targetPage < 1 || targetPage > totalPages) return;

        currentPage = targetPage;
        renderGallery({ updateUrl: true, smoothScroll: true });
    });

    // Pagination mode: keep each page capped at 20 wallpapers.
    // Infinite append is intentionally disabled because it conflicts with the "max 20 per page" rule.
    function setupInfiniteScroll() {
        return;
    }

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-filter');
            currentPage = 1;
            renderGallery({ updateUrl: true, smoothScroll: true });
        });
    });

    const gallerySearchInput = document.getElementById('gallerySearchInput');
    const gallerySortSelect = document.getElementById('gallerySortSelect');

    if (gallerySearchInput) {
        gallerySearchInput.addEventListener('input', (e) => {
            searchKeyword = normalizeTextForSearch(e.target.value);
            currentPage = 1;
            renderGallery({ updateUrl: false, smoothScroll: false });
        });
    }

    if (gallerySortSelect) {
        gallerySortSelect.value = sortMode;
        gallerySortSelect.addEventListener('change', (e) => {
            sortMode = e.target.value;
            currentPage = 1;
            renderGallery({ updateUrl: false, smoothScroll: true });
        });
    }

    function openModal(wp) {
        currentWallpaper = wp;
        showingMobile = false;
        updateModalContent();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; 
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => { modalImage.src = ''; }, 500);
    }

    function updateModalContent() {
        if (!currentWallpaper) return;

        modalTitle.textContent = currentWallpaper.title;

        if (currentWallpaper.tags && currentWallpaper.tags.length > 0) {
            modalTags.innerHTML = currentWallpaper.tags.map(tag => `<span class="tag-chip">#${tag}</span>`).join('');
            modalTags.classList.remove('hidden');
        } else {
            modalTags.classList.add('hidden');
        }

        const tagsString = (currentWallpaper.tags || []).join(', ');
        const useMobile = showingMobile && currentWallpaper.hasMobile;

        if (useMobile) {
            modalImage.src = currentWallpaper.mobileImg;
            modalImage.alt = `${currentWallpaper.title} Mobile Wallpaper - Tags: ${tagsString}`;
            downloadUrl = {
                id: currentWallpaper.id,
                type: 'mobile',
                originalKey: currentWallpaper.mobileOriginalKey
            };
        } else {
            modalImage.src = currentWallpaper.desktopImg;
            modalImage.alt = `${currentWallpaper.title} Desktop Wallpaper - Tags: ${tagsString}`;
            downloadUrl = {
                id: currentWallpaper.id,
                type: 'desktop',
                originalKey: currentWallpaper.desktopOriginalKey
            };
        }

        const baseText = useMobile
            ? (translations[currentLang].mobile_version || 'Mobile Version')
            : (translations[currentLang].desktop_version || 'Desktop Version');
        modalDesc.textContent = `${baseText}  •  ${currentWallpaper.resolution || 'High Resolution'}`;

        if (!currentWallpaper.hasMobile) {
            noMobileMsg.classList.remove('hidden');
            if (modalSizeSwitchGroup) modalSizeSwitchGroup.classList.add('no-mobile');
        } else {
            noMobileMsg.classList.add('hidden');
            if (modalSizeSwitchGroup) modalSizeSwitchGroup.classList.remove('no-mobile');
        }

        updateSizeSwitchState(modalDesktopBtn, modalMobileBtn, useMobile, currentWallpaper.hasMobile);

        const likeCountVal = appData.likes[currentWallpaper.id] || 0;
        const isLikedVal = appData.userLiked[currentWallpaper.id] || false;
        modalLikeCount.textContent = likeCountVal;
        if (isLikedVal) modalLikeBtn.classList.add('liked');
        else modalLikeBtn.classList.remove('liked');

    }

    closeModalBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    if (modalPrevBtn) {
        modalPrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            switchModalWallpaper(-1);
        });
    }

    if (modalNextBtn) {
        modalNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            switchModalWallpaper(1);
        });
    }

    if (wpPrevBtn) {
        wpPrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            switchFullPageWallpaper(-1);
        });
    }

    if (wpNextBtn) {
        wpNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            switchFullPageWallpaper(1);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();

        if (modal.classList.contains('active')) {
            if (e.key === 'ArrowLeft') switchModalWallpaper(-1);
            if (e.key === 'ArrowRight') switchModalWallpaper(1);
            return;
        }

        if (!wallpaperView.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') switchFullPageWallpaper(-1);
            if (e.key === 'ArrowRight') switchFullPageWallpaper(1);
        }
    });

    
    const fullPageArrowFallbackHandler = (e) => {
        const prevFull = e.target.closest('#wpPrevBtn');
        const nextFull = e.target.closest('#wpNextBtn');

        if (prevFull) {
            e.preventDefault();
            e.stopPropagation();
            switchFullPageWallpaper(-1);
        }

        if (nextFull) {
            e.preventDefault();
            e.stopPropagation();
            switchFullPageWallpaper(1);
        }
    };
    document.addEventListener('click', fullPageArrowFallbackHandler);

    let downloadGateTimerId;

    function resetDownloadGateState() {
        if (downloadGateTimerId) {
            clearInterval(downloadGateTimerId);
            downloadGateTimerId = null;
        }
        if (downloadGateModal) downloadGateModal.classList.remove('active');
        if (downloadGateActionBtn) {
            downloadGateActionBtn.classList.add('hidden');
            downloadGateActionBtn.removeAttribute('data-download-url');
            downloadGateActionBtn.textContent = translations[currentLang]?.close_download_gate || 'Close & Download';
        }
        if (downloadGateTimerMsg) downloadGateTimerMsg.classList.remove('hidden');
        if (downloadGateCountdown) downloadGateCountdown.textContent = '5';
    }

    function getBlockerDownloadMessage() {
        return currentLang === 'zh'
            ? '\u8acb\u95dc\u9589\u5ee3\u544a\u5c01\u9396\u5668\u4e26\u91cd\u65b0\u6574\u7406\u9801\u9762\u5f8c\u518d\u4e0b\u8f09\u3002'
            : 'Please turn off your ad blocker, refresh the page, and download again.';
    }

    function isVisibleElement(el) {
        if (!el || !el.isConnected) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number(style.opacity) !== 0
            && rect.width > 0
            && rect.height > 0;
    }

    function isDownloadGateBlocked() {
        if (!isVisibleElement(downloadGateModal)) return true;

        const gateContent = downloadGateModal.querySelector('.download-gate-content');
        const gateBody = downloadGateModal.querySelector('.download-gate-body');
        const gatePanel = downloadGateModal.querySelector('.download-gate-panel');

        return !isVisibleElement(gateContent)
            || !isVisibleElement(gateBody)
            || !isVisibleElement(gatePanel);
    }

    function showBlockedDownloadMessage() {
        if (downloadGateTimerId) {
            clearInterval(downloadGateTimerId);
            downloadGateTimerId = null;
        }

        if (downloadGateModal) downloadGateModal.classList.add('active');
        if (downloadGateTimerMsg) downloadGateTimerMsg.classList.add('hidden');
        if (downloadGateActionBtn) downloadGateActionBtn.classList.add('hidden');

        const hint = downloadGateModal?.querySelector('.blocker-download-hint');
        if (hint) {
            hint.textContent = getBlockerDownloadMessage();
        }
    }

    function shouldUseManualDownload() {
        const ua = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isMobile = /Mobi|Android|iPad|iPhone|iPod/i.test(ua)
            || window.matchMedia?.('(pointer: coarse)').matches;

        return isIOS || isMobile;
    }

    function getManualDownloadLabel() {
        return currentLang === 'zh' ? '點此下載' : 'Tap to Download';
    }

    async function generateDownloadLink(data) {
        const params = new URLSearchParams({
            id: data.id,
            type: data.type
        });
        if (data.originalKey) {
            params.set('originalKey', data.originalKey);
        }

        const response = await fetch(apiUrl(`/api/generate-link?${params.toString()}`));
        if (!response.ok) {
            let errorMsg = 'Network response was not ok';
            try {
                const errData = await response.json();
                errorMsg = errData.error || errorMsg;
            } catch(e) {}
            throw new Error(errorMsg);
        }

        const result = await response.json();
        if (!result.url) {
            throw new Error(result.error || 'Failed to get download link');
        }

        return result.url;
    }

    async function prepareManualDownload(data) {
        try {
            const url = await generateDownloadLink(data);
            downloadGateActionBtn.textContent = getManualDownloadLabel();
            downloadGateActionBtn.setAttribute('data-download-url', url);
            downloadGateActionBtn.classList.remove('hidden');
        } catch (error) {
            console.error('Download API error:', error);
            alert(translations[currentLang]?.download_error || 'Download failed, please try again later.');
        }
    }

    function startDownloadFlow(downloadData) {
        if (!downloadData || !downloadData.id || !downloadData.type) {
            alert(translations[currentLang]?.download_error || 'Download failed, please try again later.');
            return;
        }

        if (!downloadGateModal || !downloadGateActionBtn || !downloadGateTimerMsg || !downloadGateCountdown) {
            console.error('Download gate elements are missing.', {
                downloadGateModal: !!downloadGateModal,
                downloadGateActionBtn: !!downloadGateActionBtn,
                downloadGateTimerMsg: !!downloadGateTimerMsg,
                downloadGateCountdown: !!downloadGateCountdown
            });
            alert(translations[currentLang]?.download_error || 'Download failed, please try again later.');
            return;
        }

        downloadGateModal.classList.add('active');
        downloadGateActionBtn.classList.add('hidden');
        downloadGateActionBtn.removeAttribute('data-download-url');
        downloadGateActionBtn.textContent = translations[currentLang]?.close_download_gate || 'Close & Download';
        downloadGateTimerMsg.classList.remove('hidden');

        let secondsLeft = 5;
        downloadGateCountdown.textContent = secondsLeft;

        if (downloadGateTimerId) clearInterval(downloadGateTimerId);

        window.setTimeout(() => {
            if (isDownloadGateBlocked()) {
                showBlockedDownloadMessage();
                return;
            }

            downloadGateTimerId = setInterval(() => {
                secondsLeft--;
                downloadGateCountdown.textContent = secondsLeft;
                if (secondsLeft <= 0) {
                    clearInterval(downloadGateTimerId);
                    downloadGateTimerId = null;

                    if (isDownloadGateBlocked()) {
                        showBlockedDownloadMessage();
                        return;
                    }

                    downloadGateTimerMsg.classList.add('hidden');
                    if (shouldUseManualDownload()) {
                        prepareManualDownload(downloadData);
                    } else {
                        downloadGateActionBtn.classList.remove('hidden');
                        forceDownload(downloadData);
                    }
                }
            }, 1000);
        }, 80);
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            startDownloadFlow(downloadUrl);
        });
    }

    if (wpDownloadBtn) {
        wpDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            startDownloadFlow(wpDownloadUrl);
        });
    }

    if (downloadGateActionBtn) {
        downloadGateActionBtn.addEventListener('click', () => {
            const url = downloadGateActionBtn.getAttribute('data-download-url');
            if (url) {
                window.location.href = url;
                return;
            }
            resetDownloadGateState();
        });
    }

    async function forceDownload(data) {
        try {
            const url = await generateDownloadLink(data);
            const link = document.createElement('a');
            link.href = url;
            link.rel = 'noopener';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => link.remove(), 1000);
        } catch (error) {
            console.error('Download API error:', error);
            alert(translations[currentLang]?.download_error || 'Download failed, please try again later.');
        }
    }

    function toggleLike(id, btnElement) {
        let count = appData.likes[id] || 0;
        let isLiked = appData.userLiked[id] || false;
        
        if (isLiked) {
            count--;
            isLiked = false;
        } else {
            count++;
            isLiked = true;
        }
        
        appData.likes[id] = count;
        appData.userLiked[id] = isLiked;
        saveAppData();
        
        if (btnElement) {
            if (isLiked) btnElement.classList.add('liked');
            else btnElement.classList.remove('liked');
            
            const countSpan = btnElement.querySelector('.card-like-count') || btnElement.querySelector('.like-count');
            if (countSpan) countSpan.textContent = count;
        }
        
        if (currentWallpaper && currentWallpaper.id === id) {
            if (isLiked) modalLikeBtn.classList.add('liked');
            else modalLikeBtn.classList.remove('liked');
            modalLikeCount.textContent = count;
        }
    }

    modalLikeBtn.addEventListener('click', () => {
        if (currentWallpaper) {
            toggleLike(currentWallpaper.id, modalLikeBtn);
            renderGallery(); 
        }
    });

    const langToggleBtn = document.getElementById('langToggleBtn');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetDownloadGateState();
            const targetPath = `${switchLocalePath(window.location.pathname)}${window.location.search}${window.location.hash}`;
            window.history.pushState({}, '', targetPath);
            updateLangFromUrl();
            applyTranslations();
            handleRoute();
        });
    }

    function localizePath(path) {
        return withLocalePath(path || '/', currentLang);
    }

    function updateSEOMeta(wp, context) {
        const pageTitle = document.getElementById('pageTitle');
        const metaDesc = document.getElementById('metaDescription');
        const ogTitle = document.getElementById('ogTitle');
        const ogDesc = document.getElementById('ogDescription');
        const ogImage = document.getElementById('ogImage');
        const structuredData = document.getElementById('structuredData');
        
        const baseUrl = SITE_URL;
        
        if (wp) {
            const title = buildSeoTitle(wp);
            const desc = buildSeoDescription(wp);
            const imgPath = wp.desktopImg || wp.mobileImg || '';
            const fullImgUrl = imgPath ? baseUrl + imgPath : '';
            const url = setUrlMetaTags(`/wallpaper/${wp.slug}`);
            
            if (pageTitle) pageTitle.textContent = title;
            if (metaDesc) metaDesc.setAttribute('content', desc);
            if (ogTitle) ogTitle.setAttribute('content', title);
            if (ogDesc) ogDesc.setAttribute('content', desc);
            if (ogImage) ogImage.setAttribute('content', fullImgUrl);
            if (structuredData) {
                const schema = {
                    "@context": "https://schema.org",
                    "@type": "ImageObject",
                    "name": wp.title,
                    "description": `Download ${wp.title} in high resolution. Includes desktop and mobile wallpaper versions.`,
                    "thumbnailUrl": fullImgUrl,
                    "contentUrl": fullImgUrl,
                    "encodingFormat": "image/webp",
                    "keywords": (wp.tags || []).join(", "),
                    "contentLocation": wp.category || "Wallpaper",
                    "creator": {
                        "@type": "Organization",
                        "name": "Afterglowr"
                    },
                    "acquireLicensePage": url
                };
                structuredData.textContent = JSON.stringify(schema, null, 2);
            }
        } else if (context && context.type === 'category' && context.name) {
            const catName = context.name;
            const title = `${catName} Wallpapers 4K Download | Afterglowr Cinematic Wallpapers`;
            const desc = `Download high-quality ${catName} wallpapers including desktop and mobile versions. Explore premium AI-generated scenic backgrounds.`;
            const url = setUrlMetaTags(`/category/${context.slug}`);
            
            let catImgUrl = '';
            const filteredWps = wallpapers.filter(w => w.category && w.category.toLowerCase() === context.slug.toLowerCase());
            if (filteredWps.length > 0) {
                const firstWp = filteredWps[0];
                const imgPath = firstWp.desktopImg || firstWp.mobileImg || '';
                catImgUrl = imgPath ? baseUrl + imgPath : '';
            }
            
            if (pageTitle) pageTitle.textContent = title;
            if (metaDesc) metaDesc.setAttribute('content', desc);
            if (ogTitle) ogTitle.setAttribute('content', title);
            if (ogDesc) ogDesc.setAttribute('content', desc);
            if (ogImage) ogImage.setAttribute('content', catImgUrl);
            if (structuredData) {
                const schema = {
                    "@context": "https://schema.org",
                    "@type": "CollectionPage",
                    "name": `${catName} Wallpapers`,
                    "description": `High-quality ${catName.toLowerCase()} wallpapers collection`,
                    "url": url
                };
                structuredData.textContent = JSON.stringify(schema, null, 2);
            }
        } else {
            const defaultTitle = currentLang === 'zh' ? 'Afterglowr 電影感桌布下載' : 'Afterglowr – Cinematic Wallpapers';
            const defaultDesc = currentLang === 'zh' ? '下載電影感、真實光影、暗色氛圍的高質感桌布，支援電腦與手機版本。' : 'Download cinematic wallpapers with realistic lighting, dark atmosphere, and no CGI feel.';
            const url = setUrlMetaTags('/');
            
            if (pageTitle) pageTitle.textContent = defaultTitle;
            if (metaDesc) metaDesc.setAttribute('content', defaultDesc);
            if (ogTitle) ogTitle.setAttribute('content', defaultTitle);
            if (ogDesc) ogDesc.setAttribute('content', defaultDesc);
            if (ogImage) ogImage.setAttribute('content', '');
            if (structuredData) {
                const schema = {
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "name": currentLang === 'zh' ? "Afterglowr 電影感桌布" : "Afterglowr Cinematic Wallpapers",
                    "url": url,
                    "description": defaultDesc
                };
                structuredData.textContent = JSON.stringify(schema, null, 2);
            }
        }
    }

    function getInfoPageKey(routePath = '/') {
        const key = String(routePath || '/').replace(/^\/+|\/+$/g, '');
        return infoPages[key] ? key : null;
    }

    function updateFooterPageLinks() {
        document.querySelectorAll('[data-page-link]').forEach(link => {
            const key = link.getAttribute('data-page-link');
            const page = infoPages[key]?.[currentLang] || infoPages[key]?.en;
            if (!page) return;

            link.textContent = page.nav;
            link.setAttribute('href', localizePath(`/${key}`));
        });
    }

    function renderInfoPage(pageKey) {
        const page = infoPages[pageKey]?.[currentLang] || infoPages[pageKey]?.en;
        if (!page || !infoPageView) return false;

        homeView.classList.add('hidden');
        wallpaperView.classList.add('hidden');
        if (categoryView) categoryView.classList.add('hidden');
        infoPageView.classList.remove('hidden');

        if (infoPageKicker) infoPageKicker.textContent = 'AFTERGLOWR';
        if (infoPageTitle) infoPageTitle.textContent = page.title;
        if (infoPageLead) infoPageLead.textContent = page.lead;
        if (infoPageContent) {
            infoPageContent.innerHTML = page.sections.map(section => {
                const body = section.list
                    ? `<ul>${section.list.map(item => `<li>${item}</li>`).join('')}</ul>`
                    : `<p>${section.body || ''}</p>`;

                return `
                    <section class="info-section">
                        <h2>${section.title}</h2>
                        ${body}
                    </section>
                `;
            }).join('');
        }

        window.scrollTo(0, 0);

        const title = `${page.title} | Afterglowr`;
        const desc = page.lead;
        const routePath = `/${pageKey}`;
        setUrlMetaTags(routePath);

        const pageTitle = document.getElementById('pageTitle');
        const metaDesc = document.getElementById('metaDescription');
        const ogTitle = document.getElementById('ogTitle');
        const ogDesc = document.getElementById('ogDescription');
        const ogType = document.getElementById('ogType');
        const structuredData = document.getElementById('structuredData');

        if (pageTitle) pageTitle.textContent = title;
        if (metaDesc) metaDesc.setAttribute('content', desc);
        if (ogTitle) ogTitle.setAttribute('content', title);
        if (ogDesc) ogDesc.setAttribute('content', desc);
        if (ogType) ogType.setAttribute('content', 'website');
        if (structuredData) {
            structuredData.textContent = JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebPage',
                name: title,
                url: getAbsoluteUrl(routePath),
                description: desc,
                isPartOf: {
                    '@type': 'WebSite',
                    name: 'Afterglowr',
                    url: SITE_URL
                }
            }, null, 2);
        }

        return true;
    }

    function handleRoute() {
        updateLangFromUrl();
        updateFooterPageLinks();
        const route = parseRoute(window.location.pathname);
        const routePath = route.routePath;
        const seoTrafficPage = getSeoTrafficPage(routePath);
        const infoPageKey = getInfoPageKey(routePath);
        
        if (infoPageKey) {
            renderInfoPage(infoPageKey);
        } else if (route.routeName === 'wallpaper') {
            const slug = route.params.slug;
            const wp = wallpaperMap.get(slug) || wallpapers.find(w => w.id === slug || w.slug === slug);
            if (wp) {
                renderWallpaperPage(wp);
                updateSEOMeta(wp, null);
            } else {
                homeView.classList.remove('hidden');
                wallpaperView.classList.add('hidden');
                if (categoryView) categoryView.classList.add('hidden');
                if (infoPageView) infoPageView.classList.add('hidden');
                renderGallery({ updateUrl: false });
                updateHomeSEOMeta(currentPage || 1);
            }
        } else if (route.routeName === 'category') {
            const catSlug = route.params.slug;
            const catName = renderCategoryPage(catSlug);
            updateSEOMeta(null, { type: 'category', name: catName, slug: catSlug });
        } else {
            homeView.classList.remove('hidden');
            wallpaperView.classList.add('hidden');
            if (categoryView) categoryView.classList.add('hidden');
            if (infoPageView) infoPageView.classList.add('hidden');

            currentCategory = 'all';
            currentPage = route.routeName === 'page' ? route.params.page : 1;
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-filter') === 'all');
            });

            renderGallery({ updateUrl: false });
            window.scrollTo(0, 0);
            if (seoTrafficPage) {
                updateTrafficSeoMeta(seoTrafficPage);
            } else {
                updateHomeSEOMeta(currentPage);
            }
        }
    }

    function navigateTo(url) {
        resetDownloadGateState();
        const targetUrl = localizePath(url);
        window.history.pushState({}, '', targetUrl);
        updateLangFromUrl();
        handleRoute();
    }

    document.querySelectorAll('[data-page-link]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href) return;

            e.preventDefault();
            navigateTo(href);
        });
    });

    window.addEventListener('popstate', () => {
        resetDownloadGateState();
        updateLangFromUrl();
        applyTranslations();
        handleRoute();
    });

    function renderWallpaperPage(wp) {
        currentWpPage = wp;
        wpShowingMobile = false;
        
        homeView.classList.add('hidden');
        if (categoryView) categoryView.classList.add('hidden');
        if (infoPageView) infoPageView.classList.add('hidden');
        wallpaperView.classList.remove('hidden');
        window.scrollTo(0, 0);

        wpTitle.textContent = wp.title;
        updateWpPageContent();
        renderRelatedWallpapers(wp);

        updateFullPageSocial();
    }

    function updateFullPageSocial() {
        if (!currentWpPage) return;

        const id = currentWpPage.id;
        const count = appData.likes[id] || 0;
        const liked = appData.userLiked[id] || false;

        if (wpLikeCount) wpLikeCount.textContent = count;

        if (wpLikeBtn) {
            wpLikeBtn.classList.toggle('liked', liked);
        }
    }

    function renderCategoryPage(categorySlug) {
        homeView.classList.add('hidden');
        wallpaperView.classList.add('hidden');
        if (categoryView) categoryView.classList.remove('hidden');
        if (infoPageView) infoPageView.classList.add('hidden');
        window.scrollTo(0, 0);

        const filteredWallpapers = wallpapers.filter(w => w.category && w.category.toLowerCase() === categorySlug.toLowerCase());
        const catName = categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);
        
        if (filteredWallpapers.length === 0) {
            catTitle.textContent = "Category Not Found";
            catDesc.textContent = "Sorry, we couldn't find any wallpapers for this category.";
            categoryGallery.innerHTML = '';
            return "Not Found";
        }

        catTitle.textContent = `${catName} Wallpapers`;
        catDesc.textContent = `High-quality ${categorySlug.toLowerCase()} wallpapers collection`;
        
        categoryGallery.innerHTML = '';
        filteredWallpapers.forEach(wp => {
            const desktopIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="12" rx="2" ry="2"></rect><path d="M8 20h8"></path><path d="M12 16v4"></path></svg>`;
            const mobileIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect><path d="M10 2h4" stroke-width="2.5"></path><circle cx="12" cy="18.5" r="1.2"></circle></svg>`;
            
            const badgesStr = wp.hasMobile 
                ? `<span class="badge" style="display:flex; gap:8px; align-items:center;">${desktopIcon} ${mobileIcon}</span>`
                : `<span class="badge" style="display:flex; align-items:center;">${desktopIcon}</span>`;

            const seoTagsStr = wp.tags.join(', ');

            const card = document.createElement('div');
            card.className = 'wallpaper-card animate-on-scroll is-visible';
            card.innerHTML = `
                <div class="card-image-wrap">
                    <img src="${wp.desktopImg || wp.mobileImg}" alt="${wp.title} Wallpaper - Tags: ${seoTagsStr}" class="card-image" loading="lazy">
                </div>
                <div class="card-info">
                    <div class="card-title">${wp.title}</div>
                    <div class="card-badges">
                        ${badgesStr}
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => openModal(wp));
            categoryGallery.appendChild(card);
        });

        return catName;
    }

    function updateWpPageContent() {
        if (!currentWpPage) return;

        if (currentWpPage.tags && currentWpPage.tags.length > 0) {
            wpTags.innerHTML = currentWpPage.tags.map(tag => `<span class="tag-chip">#${tag}</span>`).join('');
            wpTags.classList.remove('hidden');
        } else {
            wpTags.classList.add('hidden');
        }

        const tagsString = (currentWpPage.tags || []).join(', ');
        const useMobile = wpShowingMobile && currentWpPage.hasMobile;

        if (useMobile) {
            wpMainImage.src = currentWpPage.mobileImg;
            wpMainImage.alt = `${currentWpPage.title} Mobile Wallpaper - Tags: ${tagsString}`;
            wpDownloadUrl = {
                id: currentWpPage.id,
                type: 'mobile',
                originalKey: currentWpPage.mobileOriginalKey
            };
        } else {
            wpMainImage.src = currentWpPage.desktopImg;
            wpMainImage.alt = `${currentWpPage.title} Desktop Wallpaper - Tags: ${tagsString}`;
            wpDownloadUrl = {
                id: currentWpPage.id,
                type: 'desktop',
                originalKey: currentWpPage.desktopOriginalKey
            };
        }

        if (wpSizeSwitchGroup) {
            wpSizeSwitchGroup.classList.toggle('no-mobile', !currentWpPage.hasMobile);
        }
        updateSizeSwitchState(wpDesktopBtn, wpMobileBtn, useMobile, currentWpPage.hasMobile);

        const baseText = useMobile
            ? (translations[currentLang].mobile_version || 'Mobile Version')
            : (translations[currentLang].desktop_version || 'Desktop Version');
        wpDesc.innerHTML = `
            <div class="wallpaper-detail-list">
                <div><strong>${currentLang === 'zh' ? '版本' : 'Type'}:</strong> ${baseText}</div>
                <div><strong>${currentLang === 'zh' ? '解析度' : 'Resolution'}:</strong> ${currentWpPage.resolution || 'High Resolution'}</div>
                <div><strong>${currentLang === 'zh' ? '分類' : 'Category'}:</strong> ${currentWpPage.category || 'Wallpaper'}</div>
                <div><strong>${currentLang === 'zh' ? '標籤' : 'Tags'}:</strong> ${(currentWpPage.tags || []).join(', ') || 'Cinematic, Wallpaper'}</div>
            </div>
        `;
    }

    function getWallpaperScore(baseWp, targetWp) {
        if (!baseWp || !targetWp || baseWp.id === targetWp.id) return -999;

        let score = 0;

        if (baseWp.category && targetWp.category && baseWp.category === targetWp.category) {
            score += 50;
        }

        const baseTags = new Set(baseWp.tags || []);
        const targetTags = targetWp.tags || [];
        const sharedTags = targetTags.filter(tag => baseTags.has(tag));
        score += sharedTags.length * 18;

        const baseTitleWords = new Set(String(baseWp.title || '').toLowerCase().split(/\s+/).filter(Boolean));
        const targetTitleWords = String(targetWp.title || '').toLowerCase().split(/\s+/).filter(Boolean);
        const sharedTitleWords = targetTitleWords.filter(word => baseTitleWords.has(word));
        score += sharedTitleWords.length * 4;

        const targetTime = new Date(targetWp.createdAt || targetWp.updatedAt || targetWp.dateAdded || 0).getTime() || 0;
        if (targetTime > 0) {
            const ageDays = (Date.now() - targetTime) / (24 * 60 * 60 * 1000);
            if (ageDays <= 30) score += 6;
            if (ageDays <= 7) score += 10;
        }

        return score;
    }

    function getLatestWallpapers(limit = 6, excludeIds = new Set()) {
        return wallpapers
            .filter(wp => wp && !excludeIds.has(wp.id))
            .sort((a, b) => {
                const aTime = new Date(a.createdAt || a.updatedAt || a.dateAdded || 0).getTime() || 0;
                const bTime = new Date(b.createdAt || b.updatedAt || b.dateAdded || 0).getTime() || 0;
                return bTime - aTime;
            })
            .slice(0, limit);
    }

    function createRelatedCard(wp, reason = '') {
        const desktopIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="12" rx="2" ry="2"></rect><path d="M8 20h8"></path><path d="M12 16v4"></path></svg>`;
        const mobileIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect><path d="M10 2h4" stroke-width="2.5"></path><circle cx="12" cy="18.5" r="1.2"></circle></svg>`;
        const tags = (wp.tags || []).slice(0, 3);
        const imgSrc = wp.desktopImg || wp.mobileImg || '';
        const slug = wp.slug || wp.id;

        const card = document.createElement('article');
        card.className = 'related-smart-card animate-on-scroll';
        card.innerHTML = `
            <div class="related-smart-image-wrap">
                <img src="${imgSrc}" alt="${wp.title} 4K related wallpaper" loading="lazy">
                ${reason ? `<span class="related-reason">${reason}</span>` : ''}
            </div>
            <div class="related-smart-body">
                <div class="related-smart-title">${wp.title || 'Wallpaper'}</div>
                <div class="related-smart-meta">
                    <span>${wp.category || 'Wallpaper'}</span>
                    <span>${wp.resolution || '4K / HD'}</span>
                </div>
                <div class="related-smart-tags">
                    ${tags.map(tag => `<span>#${tag}</span>`).join('')}
                </div>
                <div class="related-smart-icons">
                    ${desktopIcon}
                    ${wp.hasMobile ? mobileIcon : ''}
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            navigateTo('/wallpaper/' + slug);
        });

        return card;
    }

    function renderRelatedGroup(gridId, groupId, countId, items, reason) {
        const group = document.getElementById(groupId);
        const grid = document.getElementById(gridId);
        const count = document.getElementById(countId);

        if (!group || !grid) return;

        if (!items || items.length === 0) {
            group.classList.add('hidden');
            grid.innerHTML = '';
            return;
        }

        group.classList.remove('hidden');
        grid.innerHTML = '';

        if (count) {
            count.textContent = `${items.length}`;
        }

        items.forEach((wp, index) => {
            const card = createRelatedCard(wp, reason);
            grid.appendChild(card);
            setTimeout(() => card.classList.add('is-visible'), 40 + index * 40);
        });
    }

    function renderRelatedWallpapers(currentWp) {
        if (!currentWp || !Array.isArray(wallpapers)) return;

        const usedIds = new Set([currentWp.id]);

        const sameCategory = wallpapers
            .filter(wp => wp.id !== currentWp.id && wp.category === currentWp.category)
            .sort((a, b) => getWallpaperScore(currentWp, b) - getWallpaperScore(currentWp, a))
            .slice(0, 6);

        sameCategory.forEach(wp => usedIds.add(wp.id));

        const currentTags = new Set(currentWp.tags || []);
        const similarMood = wallpapers
            .filter(wp => {
                if (!wp || usedIds.has(wp.id)) return false;
                return (wp.tags || []).some(tag => currentTags.has(tag));
            })
            .sort((a, b) => getWallpaperScore(currentWp, b) - getWallpaperScore(currentWp, a))
            .slice(0, 6);

        similarMood.forEach(wp => usedIds.add(wp.id));

        let latest = getLatestWallpapers(6, usedIds);
        latest.forEach(wp => usedIds.add(wp.id));

        // If any group is too small, fill with best scored wallpapers to keep internal links strong.
        const filler = wallpapers
            .filter(wp => wp.id !== currentWp.id && !usedIds.has(wp.id))
            .sort((a, b) => getWallpaperScore(currentWp, b) - getWallpaperScore(currentWp, a));

        while (sameCategory.length < 3 && filler.length) {
            const wp = filler.shift();
            sameCategory.push(wp);
            usedIds.add(wp.id);
        }

        while (similarMood.length < 3 && filler.length) {
            const wp = filler.shift();
            similarMood.push(wp);
            usedIds.add(wp.id);
        }

        if (latest.length < 3) {
            latest = latest.concat(filler.slice(0, 3 - latest.length));
        }

        renderRelatedGroup('relatedSameCategoryGrid', 'relatedSameCategoryGroup', 'relatedSameCategoryCount', sameCategory, 'Same category');
        renderRelatedGroup('relatedSimilarMoodGrid', 'relatedSimilarMoodGroup', 'relatedSimilarMoodCount', similarMood, 'Similar mood');
        renderRelatedGroup('relatedLatestGrid', 'relatedLatestGroup', 'relatedLatestCount', latest, 'Latest');

        // Backward compatibility for old template if it still exists.
        const oldRelatedGrid = document.getElementById('relatedGrid');
        if (oldRelatedGrid) {
            const combined = [...sameCategory, ...similarMood, ...latest].slice(0, 9);
            oldRelatedGrid.innerHTML = '';
            combined.forEach((wp, index) => {
                const card = createRelatedCard(wp, 'Recommended');
                oldRelatedGrid.appendChild(card);
                setTimeout(() => card.classList.add('is-visible'), 40 + index * 40);
            });
        }
    }


    if (modalDesktopBtn) modalDesktopBtn.addEventListener('click', () => setModalSize('desktop'));
    if (modalMobileBtn) modalMobileBtn.addEventListener('click', () => setModalSize('mobile'));
    if (wpDesktopBtn) wpDesktopBtn.addEventListener('click', () => setFullPageSize('desktop'));
    if (wpMobileBtn) wpMobileBtn.addEventListener('click', () => setFullPageSize('mobile'));

    backToGalleryBtn.addEventListener('click', () => {
        navigateTo('/');
    });

    viewFullPageBtn.addEventListener('click', () => {
        if (currentWallpaper) {
            closeModal();
            navigateTo('/wallpaper/' + currentWallpaper.id);
        }
    });

    document.addEventListener('click', (e) => {
        const fullPageBtn = e.target.closest('#viewFullPageBtn');
        if (fullPageBtn) {
            e.preventDefault();
            if (!currentWallpaper) return;
            closeModal();
            navigateTo('/wallpaper/' + currentWallpaper.id);
            return;
        }
    });


    // ===== Realtime wallpaper update system (SSE) =====
    let realtimeToastTimer = null;

    function showRealtimeToast(message) {
        let toast = document.getElementById('realtimeToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'realtimeToast';
            toast.className = 'realtime-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(realtimeToastTimer);
        realtimeToastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
    }

    async function reloadWallpapersFromServer(reason = 'realtime') {
        try {
            const res = await fetch('/wallpapers.json?ts=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch wallpapers.json');

            const freshWallpapers = await res.json();
            const oldCount = wallpapers.length;

            wallpaperMap.clear();
            freshWallpapers.forEach(wp => {
                if (wp.id) wallpaperMap.set(wp.id, wp);
                if (wp.slug && wp.slug !== wp.id) wallpaperMap.set(wp.slug, wp);
            });
            wallpapers = freshWallpapers.filter((wp, index, list) => {
                const key = wp.id || wp.slug;
                return key && wp.desktopImg && list.findIndex(item => (item.id || item.slug) === key) === index;
            });

            const totalPages = typeof getTotalPages === 'function' ? getTotalPages() : 1;
            if (typeof currentPage !== 'undefined') {
                if (currentPage > totalPages) currentPage = totalPages;
                if (currentPage < 1) currentPage = 1;
            }

            const isHomeVisible = homeView && !homeView.classList.contains('hidden');
            const isCategoryVisible = categoryView && !categoryView.classList.contains('hidden');
            const isWallpaperVisible = wallpaperView && !wallpaperView.classList.contains('hidden');

            if (isHomeVisible && typeof renderGallery === 'function') {
                renderGallery({ updateUrl: false, smoothScroll: false });
            }

            if (isCategoryVisible && typeof handleRoute === 'function') {
                handleRoute();
            }

            if (isWallpaperVisible && currentWpPage) {
                const updatedWp = wallpaperMap.get(currentWpPage.id);
                if (updatedWp) {
                    currentWpPage = updatedWp;
                    if (typeof forceRenderFullPageWallpaper === 'function') {
                        forceRenderFullPageWallpaper(updatedWp);
                    } else if (typeof updateWpPageContent === 'function') {
                        updateWpPageContent();
                    }
                    if (typeof renderRelatedWallpapers === 'function') renderRelatedWallpapers(updatedWp);
                }
            }

            if (freshWallpapers.length !== oldCount) {
                showRealtimeToast(`Wallpaper library updated: ${freshWallpapers.length} items`);
            } else {
                showRealtimeToast('Wallpaper library refreshed');
            }
        } catch (error) {
            console.error('[Realtime] reload failed:', error);
            showRealtimeToast('Wallpaper update failed. Check console.');
        }
    }

    function setupRealtimeWallpaperEvents() {
        if (!window.EventSource) {
            console.warn('[Realtime] EventSource is not supported by this browser.');
            return;
        }

        const events = new EventSource(apiUrl('/api/events'));

        events.onopen = () => {
            console.log('[Realtime] SSE connected');
        };

        events.onmessage = async (event) => {
            console.log('[Realtime] message:', event.data);

            // 相容兩種後端格式：
            // 1. 純文字：update
            // 2. JSON：{"type":"wallpapers-updated"}
            if (event.data === 'update') {
                await reloadWallpapersFromServer('realtime');
                return;
            }

            try {
                const data = JSON.parse(event.data);

                if (data.type === 'connected') {
                    console.log('[Realtime] connected');
                    return;
                }

                if (
                    data.type === 'wallpapers-updated' ||
                    data.type === 'update' ||
                    data.type === 'wallpaper-updated'
                ) {
                    await reloadWallpapersFromServer(data.reason || 'realtime');
                    return;
                }

                if (data.type === 'wallpapers-error') {
                    showRealtimeToast(data.message || 'Wallpaper update failed');
                    return;
                }
            } catch (error) {
                console.warn('[Realtime] invalid event payload:', event.data);
            }
        };

        events.onerror = () => {
            console.warn('[Realtime] connection interrupted. Browser will retry automatically.');
        };
    }

    // Initialize

    applyTranslations();
    handleRoute();
    setupInfiniteScroll();
    setupRealtimeWallpaperEvents();

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = function() {
        let playerReady = false;
        let ytPlayer = new YT.Player('yt-player', {
            height: '260',
            width: '100%',
            playerVars: {
                listType: 'playlist',
                list: 'PLbDAXXAD7B_zdNslU-Zx6tcAD038V0lGX',
                controls: 1,
                autoplay: 1
            },
            events: {
                'onReady': (event) => {
                    playerReady = true;
                    event.target.setShuffle(true);
                    setTimeout(() => {
                        event.target.playVideoAt(0); 
                    }, 800);
                }
            }
        });

        // 監聽使用者的首次互動 (點擊、滾動等) 來觸發音樂播放，突破瀏覽器限制
        const playOnInteract = () => {
            if (playerReady && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
                const state = ytPlayer.getPlayerState();
                if (state !== 1) { // 1 = playing
                    ytPlayer.playVideo();
                }
            }
            // 觸發一次後移除監聽器
            document.removeEventListener('click', playOnInteract);
            document.removeEventListener('scroll', playOnInteract);
            document.removeEventListener('touchstart', playOnInteract);
            document.removeEventListener('keydown', playOnInteract);
        };

        document.addEventListener('click', playOnInteract);
        document.addEventListener('scroll', playOnInteract, { once: true });
        document.addEventListener('touchstart', playOnInteract, { once: true });
        document.addEventListener('keydown', playOnInteract, { once: true });
    };


const supportCopy = {
    en: {
        kicker: 'AFTERGLOWR PROJECT',
        title: 'About Afterglowr Wallpapers',
        lead: 'Afterglowr Wallpapers is a curated collection of high-quality wallpapers built around cinematic lighting, atmospheric depth, and photorealistic detail.',
        story: 'This project started as a personal archive of creative experiments — exploring visual moods through original ideas, AI-assisted workflows, and refined compositions. Over time, it evolved into a platform for sharing these creations with others who appreciate immersive and carefully crafted visuals.',
        free: 'All wallpapers on this site are free to download and use.',
        goal: 'Our goal is simple: to create visuals that feel real, emotional, and timeless — not artificial or overly stylized.',
        donate: 'If you enjoy the work and would like to support the project, you’re welcome to contribute. Your support helps maintain the site and allows continuous creation of new content.',
        supportBtn: 'Support the Project',
        copyrightBtn: 'Report Copyright Concern',
        contact: 'Contact',
        updated: 'Last updated',
        updatedValue: 'May 2026',
        note: 'If any content raises copyright concerns, please contact us and it will be reviewed and removed promptly.'
    },
    zh: {
        kicker: 'AFTERGLOWR PROJECT',
        title: '關於 Afterglowr Wallpapers',
        lead: 'Afterglowr Wallpapers 是一個精選高質感桌布作品集，核心風格圍繞電影感光影、氛圍深度與擬真細節。',
        story: '這個計畫最初只是個人創作實驗的收藏庫，透過原創構想、AI 輔助流程與後期構圖整理，探索不同的視覺情緒。隨著作品逐漸累積，它慢慢發展成一個分享平台，提供給同樣喜歡沉浸式、細膩視覺作品的人使用。',
        free: '本站所有桌布皆可免費下載與使用。',
        goal: '我們的目標很單純：創造看起來真實、有情緒、且不容易過時的視覺作品，而不是過度人工或過度風格化的圖片。',
        donate: '如果你喜歡這些作品，也願意支持這個計畫，歡迎透過贊助協助網站維護與持續創作。你的支持會用於維持網站運作成本，並讓更多新內容能持續更新。',
        supportBtn: '支持這個計畫',
        copyrightBtn: '回報版權疑慮',
        contact: '聯絡方式',
        updated: '最後更新',
        updatedValue: '2026 年 5 月',
        note: '如果任何內容有版權疑慮，請與我們聯絡，我們會盡快審視並在必要時移除相關內容。'
    }
};

function updateSupportModalLanguage() {
    const copy = supportCopy[currentLang] || supportCopy.en;
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText('supportKicker', copy.kicker);
    setText('supportModalTitle', copy.title);
    setText('supportLead', copy.lead);
    setText('supportStory', copy.story);
    setText('supportFreeText', copy.free);
    setText('supportGoal', copy.goal);
    setText('supportDonateText', copy.donate);
    setText('supportProjectBtn', copy.supportBtn);
    setText('supportCopyrightBtn', copy.copyrightBtn);
    setText('supportContactLabel', copy.contact);
    setText('supportUpdatedLabel', copy.updated);
    setText('supportUpdatedValue', copy.updatedValue);
    setText('supportCopyrightNote', copy.note);
}

// Support / About Modal
const supportBtn = document.getElementById('supportBtn');
const supportModal = document.getElementById('supportModal');
const closeSupportModal = document.getElementById('closeSupportModal');
const supportBackdrop = document.getElementById('supportBackdrop');

function openSupportModal() {
    if (!supportModal) return;
    if (typeof updateSupportModalLanguage === 'function') updateSupportModalLanguage();
    supportModal.classList.add('active');
    supportModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeSupportModalFn() {
    if (!supportModal) return;
    supportModal.classList.remove('active');
    supportModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

if (supportBtn) {
    supportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openSupportModal();
    });
}

if (closeSupportModal) {
    closeSupportModal.addEventListener('click', closeSupportModalFn);
}

if (supportBackdrop) {
    supportBackdrop.addEventListener('click', closeSupportModalFn);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && supportModal && supportModal.classList.contains('active')) {
        closeSupportModalFn();
    }
});

});
