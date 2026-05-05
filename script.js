import { translations } from './translations.js';

let currentLang = 'en';

function updateLangFromUrl() {
    const path = window.location.pathname;
    if (path.startsWith('/zh')) {
        currentLang = 'zh';
    } else {
        currentLang = 'en';
    }
}
updateLangFromUrl();

const API_BASE_URL = 'https://afterglowr.onrender.com';

function apiUrl(path) {
    if (!path) return API_BASE_URL;
    return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
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

function localizePath(pathValue) {
    const cleanPath = pathValue || '/';
    if (currentLang !== 'zh') return cleanPath;
    if (cleanPath === '/') return '/zh/';
    if (cleanPath.startsWith('/zh')) return cleanPath;
    return '/zh' + cleanPath;
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

    const navLoginBtn = document.getElementById('navLoginBtn');
    const savedUser = localStorage.getItem('afterglowr_user');
    if (navLoginBtn && savedUser) {
        try {
            const user = JSON.parse(savedUser);
            const initials = (user.name || 'U').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
            navLoginBtn.classList.add('logged-in');
            navLoginBtn.innerHTML = `<span class="nav-avatar">${initials}</span><span>${user.name || 'User'}</span>`;
        } catch (e) {}
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
    const key = path.replace(/^\/zh\/?/, '').replace(/^\/+|\/+$/g, '');
    return SEO_TRAFFIC_PAGES[key] || null;
}

function updateTrafficSeoMeta(seoPage) {
    if (!seoPage) return;

    const baseUrl = 'https://afterglowr-wallpapers.vercel.app';
    const key = window.location.pathname.replace(/^\/zh\/?/, '').replace(/^\/+|\/+$/g, '');
    const url = `${baseUrl}${currentLang === 'zh' ? '/zh/' : '/'}${key}`;
    const title = currentLang === 'zh' ? `${seoPage.zhTitle} | Afterglowr` : `${seoPage.enTitle} | Afterglowr`;
    const desc = currentLang === 'zh' ? seoPage.zhDesc : seoPage.enDesc;

    const pageTitle = document.getElementById('pageTitle');
    const metaDesc = document.getElementById('metaDescription');
    const ogTitle = document.getElementById('ogTitle');
    const ogDesc = document.getElementById('ogDescription');
    const ogUrl = document.getElementById('ogUrl');
    const canonicalUrl = document.getElementById('canonicalUrl');
    const structuredData = document.getElementById('structuredData');

    if (pageTitle) pageTitle.textContent = title;
    if (metaDesc) metaDesc.setAttribute('content', desc);
    if (ogTitle) ogTitle.setAttribute('content', title);
    if (ogDesc) ogDesc.setAttribute('content', desc);
    if (ogUrl) ogUrl.setAttribute('content', url);
    if (canonicalUrl) canonicalUrl.setAttribute('href', url);

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
            wallpapers.forEach(wp => wallpaperMap.set(wp.id, wp));
            wallpapers = wallpapers.sort(() => Math.random() - 0.5);
        }
    } catch (e) {
        console.error('Failed to load wallpapers.json', e);
    }

    wallpapers = Array.from(wallpaperMap.values());
    wallpapers = wallpapers.filter(wp => wp.desktopImg); 
    wallpapers = wallpapers.sort(() => Math.random() - 0.5); 
    
    console.log("目前載入的桌布資料:", wallpapers);

    // DOM Elements
    const homeView = document.getElementById('homeView');
    const wallpaperView = document.getElementById('wallpaperView');
    const categoryView = document.getElementById('categoryView');
    const categoryGallery = document.getElementById('categoryGallery');
    const catTitle = document.getElementById('catTitle');
    const catDesc = document.getElementById('catDesc');
    const catBackToHomeBtn = document.getElementById('catBackToHomeBtn');
    
    if (catBackToHomeBtn) {
        catBackToHomeBtn.addEventListener('click', () => navigateTo('/'));
    }

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
    const wpCommentsList = document.getElementById('wpCommentsList');
    const wpCommentCount = document.getElementById('wpCommentCount');
    const wpCommentForm = document.getElementById('wpCommentForm');
    const wpCommentInput = document.getElementById('wpCommentInput');
    const wpCurrentUserAvatar = document.getElementById('wpCurrentUserAvatar');
    const wpLoginPrompt = document.getElementById('wpLoginPrompt');
    const wpPromptLogin = document.getElementById('wpPromptLoginLink');
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
    const adModal = document.getElementById('adModal');
    const adCountdown = document.getElementById('adCountdown');
    const skipAdBtn = document.getElementById('skipAdBtn');
    const adTimerMsg = document.getElementById('adTimerMsg');

    // App State (Mock DB)
    let currentUser = null;
    let appData = { likes: {}, userLiked: {}, comments: {} };

    try {
        const savedData = localStorage.getItem('afterglowr_app_data');
        if (savedData) {
            appData = JSON.parse(savedData);
            if (!appData.comments) appData.comments = {};
            if (!appData.userLiked) appData.userLiked = {};
            if (!appData.likes) appData.likes = {};
        }
        const savedUser = localStorage.getItem('afterglowr_user');
        if (savedUser) currentUser = JSON.parse(savedUser);
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

    const navLoginBtn = document.getElementById('navLoginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeLoginModalBtn = document.getElementById('closeLoginModal');
    const loginBackdrop = document.getElementById('loginBackdrop');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const fbLoginBtn = document.getElementById('fbLoginBtn');
    const modalLikeBtn = document.getElementById('modalLikeBtn');
    const modalLikeCount = document.getElementById('modalLikeCount');
    const commentsList = document.getElementById('commentsList');
    const commentCount = document.getElementById('commentCount');
    const commentForm = document.getElementById('commentForm');
    const commentInput = document.getElementById('commentInput');
    const loginPrompt = document.getElementById('loginPrompt');
    const promptLoginLink = document.getElementById('promptLoginLink');
    const currentUserAvatar = document.getElementById('currentUserAvatar');

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

        wpDownloadUrl = { id: wp.id, type: useMobile ? 'mobile' : 'desktop' };

        if (wpSizeSwitchGroup) {
            wpSizeSwitchGroup.classList.toggle('no-mobile', !wp.hasMobile);
        }
        updateSizeSwitchState(wpDesktopBtn, wpMobileBtn, useMobile, wp.hasMobile);

        if (typeof updateFullPageSocial === 'function') {
            updateFullPageSocial();
        }

        if (typeof renderFullPageComments === 'function') {
            renderFullPageComments();
        } else if (typeof renderWpComments === 'function') {
            renderWpComments();
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
            const nextUrl = `/wallpaper/${nextWallpaper.id}`;
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

    function getPageFromPath(path = window.location.pathname) {
        const match = path.match(/^\/page\/(\d+)\/?$/);
        if (!match) return 1;
        const page = parseInt(match[1], 10);
        return Number.isFinite(page) && page > 0 ? page : 1;
    }

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
        const baseUrl = 'https://afterglowr-wallpapers.vercel.app';
        const pageTitle = document.getElementById('pageTitle');
        const metaDesc = document.getElementById('metaDescription');
        const ogTitle = document.getElementById('ogTitle');
        const ogDesc = document.getElementById('ogDescription');
        const ogUrl = document.getElementById('ogUrl');
        const canonicalUrl = document.getElementById('canonicalUrl');
        const structuredData = document.getElementById('structuredData');

        const defaultTitle = currentLang === 'zh' ? 'Afterglowr 電影感桌布下載' : 'Afterglowr – Cinematic Wallpapers';
        const pagedTitle = currentLang === 'zh' ? `Afterglowr 電影感桌布 - 第 ${page} 頁 | 4K 桌布下載` : `Afterglowr Cinematic Wallpapers - Page ${page} | 4K Wallpaper Download`;
        const title = page <= 1 ? defaultTitle : pagedTitle;
        const desc = page <= 1
            ? (currentLang === 'zh' ? '下載電影感、真實光影、暗色氛圍的高質感桌布，支援電腦與手機版本。' : 'Download cinematic wallpapers with realistic lighting, dark atmosphere, and no CGI feel.')
            : (currentLang === 'zh' ? `瀏覽 Afterglowr 電影感桌布第 ${page} 頁，探索適合電腦與手機的 4K 高質感桌布。` : `Browse page ${page} of Afterglowr Cinematic Wallpapers. Explore premium 4K artistic wallpapers for desktop and mobile devices.`);
        const url = `${baseUrl}${getHomePageUrl(page)}`;

        if (pageTitle) pageTitle.textContent = title;
        if (metaDesc) metaDesc.setAttribute('content', desc);
        if (ogTitle) ogTitle.setAttribute('content', title);
        if (ogDesc) ogDesc.setAttribute('content', desc);
        if (ogUrl) ogUrl.setAttribute('content', url);
        if (canonicalUrl) canonicalUrl.setAttribute('href', url);
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
            downloadUrl = { id: currentWallpaper.id, type: 'mobile' };
        } else {
            modalImage.src = currentWallpaper.desktopImg;
            modalImage.alt = `${currentWallpaper.title} Desktop Wallpaper - Tags: ${tagsString}`;
            downloadUrl = { id: currentWallpaper.id, type: 'desktop' };
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

        renderComments();
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

    let adInterval;

    function startDownloadAdFlow(downloadData) {
        if (!downloadData || !downloadData.id || !downloadData.type) {
            alert(translations[currentLang]?.download_error || 'Download failed, please try again later.');
            return;
        }

        if (!adModal || !skipAdBtn || !adTimerMsg || !adCountdown) {
            forceDownload(downloadData);
            return;
        }

        adModal.classList.add('active');
        skipAdBtn.classList.add('hidden');
        adTimerMsg.classList.remove('hidden');

        let secondsLeft = 5;
        adCountdown.textContent = secondsLeft;

        if (adInterval) clearInterval(adInterval);

        adInterval = setInterval(() => {
            secondsLeft--;
            adCountdown.textContent = secondsLeft;
            if (secondsLeft <= 0) {
                clearInterval(adInterval);
                adTimerMsg.classList.add('hidden');
                skipAdBtn.classList.remove('hidden');
                forceDownload(downloadData);
            }
        }, 1000);
    }

    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        adModal.classList.add('active');
        skipAdBtn.classList.add('hidden');
        adTimerMsg.classList.remove('hidden');
        
        let secondsLeft = 5;
        adCountdown.textContent = secondsLeft;
        if (adInterval) clearInterval(adInterval);
        
        adInterval = setInterval(() => {
            secondsLeft--;
            adCountdown.textContent = secondsLeft;
            if (secondsLeft <= 0) {
                clearInterval(adInterval);
                adTimerMsg.classList.add('hidden');
                skipAdBtn.classList.remove('hidden');
                forceDownload(downloadUrl);
            }
        }, 1000);
    });


    // AFTERGLOWR_DOWNLOAD_AD_GUARD
    document.addEventListener('click', (e) => {
        const targetDownloadBtn = e.target.closest('#downloadBtn, #wpDownloadBtn');
        if (!targetDownloadBtn) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        const data = targetDownloadBtn.id === 'wpDownloadBtn' ? wpDownloadUrl : downloadUrl;
        startDownloadAdFlow(data);
    }, true);

    skipAdBtn.addEventListener('click', () => adModal.classList.remove('active'));

    async function forceDownload(data) {
        try {
            // 向後端 API 請求一次性下載 token，必須使用 encodeURIComponent 避免 URL 特殊符號解析錯誤
            const response = await fetch(apiUrl(`/api/generate-link?id=${encodeURIComponent(data.id)}&type=${encodeURIComponent(data.type)}`));
            if (!response.ok) {
                let errorMsg = 'Network response was not ok';
                try {
                    const errData = await response.json();
                    errorMsg = errData.error || errorMsg;
                } catch(e) {}
                throw new Error(errorMsg);
            }
            const result = await response.json();
            
            if (result.url) {
                // 收到 token 下載連結後，透過 a 標籤觸發下載
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = result.url;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                throw new Error(result.error || 'Failed to get download link');
            }
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

    function renderComments() {
        if (!currentWallpaper) return;
        const id = currentWallpaper.id;
        const imgComments = appData.comments[id] || [];
        commentCount.textContent = `(${imgComments.length})`;
        
        if (imgComments.length === 0) {
            commentsList.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.9rem; text-align: center; padding: 20px 0;">${translations[currentLang].no_comments}</div>`;
        } else {
            commentsList.innerHTML = imgComments.map(c => `
                <div class="comment-item">
                    <div class="user-avatar-small">${c.avatar}</div>
                    <div class="comment-content">
                        <div class="comment-user">${c.user} <span style="font-weight: 400; color: var(--text-secondary); font-size: 0.75rem; margin-left: 8px;">${c.date}</span></div>
                        <div class="comment-text">${c.text}</div>
                    </div>
                </div>
            `).join('');
            setTimeout(() => { commentsList.scrollTop = commentsList.scrollHeight; }, 10);
        }
    }

    modalLikeBtn.addEventListener('click', () => {
        if (currentWallpaper) {
            toggleLike(currentWallpaper.id, modalLikeBtn);
            renderGallery(); 
        }
    });

    function updateAuthState() {
        if (currentUser) {
            navLoginBtn.innerHTML = `<div class="user-avatar-small" style="width:28px; height:28px; margin-right: 8px; font-size:0.75rem;">${currentUser.avatar}</div> <span data-i18n="logout">${translations[currentLang].logout}</span>`;
            navLoginBtn.style.padding = '4px 12px 4px 4px';
            loginPrompt.classList.add('hidden');
            commentForm.classList.remove('hidden');
            currentUserAvatar.textContent = currentUser.avatar;
        } else {
            navLoginBtn.innerHTML = `<span data-i18n="login">${translations[currentLang].login}</span>`;
            navLoginBtn.style.padding = '8px 16px';
            loginPrompt.classList.remove('hidden');
            commentForm.classList.add('hidden');
        }
        updateFullPageSocial();
    }

    navLoginBtn.addEventListener('click', () => {
        if (currentUser) {
            currentUser = null;
            localStorage.removeItem('afterglowr_user');
            updateAuthState();
        } else {
            loginModal.classList.add('active');
        }
    });

    [closeLoginModalBtn, loginBackdrop].forEach(el => el.addEventListener('click', () => {
        loginModal.classList.remove('active');
    }));

    promptLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.classList.add('active');
    });

    function handleLogin() {
        currentUser = { name: "Demo User", avatar: "D" };
        localStorage.setItem('afterglowr_user', JSON.stringify(currentUser));
        updateAuthState();
        loginModal.classList.remove('active');
    }

    googleLoginBtn.addEventListener('click', handleLogin);
    fbLoginBtn.addEventListener('click', handleLogin);
    
    updateAuthState();

    commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser || !currentWallpaper) return;
        const text = commentInput.value.trim();
        if (!text) return;
        const id = currentWallpaper.id;
        if (!appData.comments[id]) appData.comments[id] = [];
        const now = new Date();
        const dateStr = now.toLocaleDateString() + ' ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
        appData.comments[id].push({ user: currentUser.name, avatar: currentUser.avatar, text: text, date: dateStr });
        saveAppData();
        commentInput.value = '';
        renderComments();
        updateFullPageSocial();
    });

    const langToggleBtn = document.getElementById('langToggleBtn');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const path = window.location.pathname;
            const isZhPath = path.startsWith('/zh');

            let targetPath;
            if (isZhPath) {
                targetPath = path.replace(/^\/zh\/?/, '/');
                if (!targetPath || targetPath === '') targetPath = '/';
            } else {
                targetPath = '/zh' + (path === '/' ? '/' : path);
            }

            window.location.href = targetPath;
        });
    }

    function getRoutePath(path = window.location.pathname) {
        if (path === '/zh') return '/';
        if (path.startsWith('/zh/')) return path.replace(/^\/zh/, '') || '/';
        return path;
    }

    function localizePath(path) {
        if (currentLang === 'zh') {
            if (path === '/') return '/zh/';
            if (path.startsWith('/zh/')) return path;
            return '/zh' + path;
        }
        return path.replace(/^\/zh\/?/, '/') || '/';
    }

    function updateSEOMeta(wp, context) {
        const pageTitle = document.getElementById('pageTitle');
        const metaDesc = document.getElementById('metaDescription');
        const ogTitle = document.getElementById('ogTitle');
        const ogDesc = document.getElementById('ogDescription');
        const ogImage = document.getElementById('ogImage');
        const ogUrl = document.getElementById('ogUrl');
        const canonicalUrl = document.getElementById('canonicalUrl');
        const structuredData = document.getElementById('structuredData');
        
        const baseUrl = 'https://afterglowr-wallpapers.vercel.app';
        
        if (wp) {
            const title = buildSeoTitle(wp);
            const desc = buildSeoDescription(wp);
            const imgPath = wp.desktopImg || wp.mobileImg || '';
            const fullImgUrl = imgPath ? baseUrl + imgPath : '';
            const url = `${baseUrl}${localizePath(`/wallpaper/${wp.slug}`)}`;
            
            if (pageTitle) pageTitle.textContent = title;
            if (metaDesc) metaDesc.setAttribute('content', desc);
            if (ogTitle) ogTitle.setAttribute('content', title);
            if (ogDesc) ogDesc.setAttribute('content', desc);
            if (ogImage) ogImage.setAttribute('content', fullImgUrl);
            if (ogUrl) ogUrl.setAttribute('content', url);
            if (canonicalUrl) canonicalUrl.setAttribute('href', url);
            
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
            const url = `${baseUrl}${localizePath(`/category/${context.slug}`)}`;
            
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
            if (ogUrl) ogUrl.setAttribute('content', url);
            if (canonicalUrl) canonicalUrl.setAttribute('href', url);
            
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
            const url = `${baseUrl}${localizePath('/')}`;
            
            if (pageTitle) pageTitle.textContent = defaultTitle;
            if (metaDesc) metaDesc.setAttribute('content', defaultDesc);
            if (ogTitle) ogTitle.setAttribute('content', defaultTitle);
            if (ogDesc) ogDesc.setAttribute('content', defaultDesc);
            if (ogImage) ogImage.setAttribute('content', '');
            if (ogUrl) ogUrl.setAttribute('content', url);
            if (canonicalUrl) canonicalUrl.setAttribute('href', url);
            
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

    function handleRoute() {
        const path = window.location.pathname;
        const routePath = getRoutePath(path);
        const wallpaperMatch = routePath.match(/^\/wallpaper\/([^\/]+)\/?$/);
        const categoryMatch = routePath.match(/^\/category\/([^\/]+)\/?$/);
        const pageMatch = routePath.match(/^\/page\/(\d+)\/?$/);
        
        if (wallpaperMatch) {
            const slug = decodeURIComponent(wallpaperMatch[1]);
            const wp = wallpapers.find(w => w.id === slug) || wallpaperMap.get(slug);
            if (wp) {
                renderWallpaperPage(wp);
                updateSEOMeta(wp, null);
            } else {
                navigateTo('/');
            }
        } else if (categoryMatch) {
            const catSlug = decodeURIComponent(categoryMatch[1]);
            const catName = renderCategoryPage(catSlug);
            updateSEOMeta(null, { type: 'category', name: catName, slug: catSlug });
        } else {
            homeView.classList.remove('hidden');
            wallpaperView.classList.add('hidden');
            if (categoryView) categoryView.classList.add('hidden');

            currentCategory = 'all';
            currentPage = pageMatch ? getPageFromPath(routePath) : 1;
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-filter') === 'all');
            });

            renderGallery({ updateUrl: false });
            window.scrollTo(0, 0);
            updateHomeSEOMeta(currentPage);
        }
    }

    function navigateTo(url) {
        const targetUrl = localizePath(url);
        window.history.pushState({}, '', targetUrl);
        updateLangFromUrl();
        handleRoute();
    }

    window.addEventListener('popstate', handleRoute);

    function renderWallpaperPage(wp) {
        currentWpPage = wp;
        wpShowingMobile = false;
        
        homeView.classList.add('hidden');
        if (categoryView) categoryView.classList.add('hidden');
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
        const comments = appData.comments[id] || [];

        if (wpLikeCount) wpLikeCount.textContent = count;

        if (wpLikeBtn) {
            wpLikeBtn.classList.toggle('liked', liked);
        }

        if (wpCommentCount) {
            wpCommentCount.textContent = `(${comments.length})`;
        }

        if (wpCommentsList) {
            if (comments.length === 0) {
                wpCommentsList.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.9rem; text-align: center; padding: 16px 0;">${translations[currentLang]?.no_comments || 'No comments yet.'}</div>`;
            } else {
                wpCommentsList.innerHTML = comments.map(c => `
                    <div class="comment-item">
                        <div class="user-avatar-small">${c.avatar || 'D'}</div>
                        <div class="comment-content">
                            <div class="comment-user">
                                ${c.user}
                                <span style="font-weight:400; color:var(--text-secondary); font-size:0.75rem; margin-left:8px;">${c.date || ''}</span>
                            </div>
                            <div class="comment-text">${c.text}</div>
                        </div>
                    </div>
                `).join('');
            }
        }

        if (currentUser) {
            wpLoginPrompt?.classList.add('hidden');
            wpCommentForm?.classList.remove('hidden');
            if (wpCurrentUserAvatar) wpCurrentUserAvatar.textContent = currentUser.avatar;
        } else {
            wpLoginPrompt?.classList.remove('hidden');
            wpCommentForm?.classList.add('hidden');
        }
    }

    function renderCategoryPage(categorySlug) {
        homeView.classList.add('hidden');
        wallpaperView.classList.add('hidden');
        if (categoryView) categoryView.classList.remove('hidden');
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
            wpDownloadUrl = { id: currentWpPage.id, type: 'mobile' };
        } else {
            wpMainImage.src = currentWpPage.desktopImg;
            wpMainImage.alt = `${currentWpPage.title} Desktop Wallpaper - Tags: ${tagsString}`;
            wpDownloadUrl = { id: currentWpPage.id, type: 'desktop' };
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

    wpDownloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        adModal.classList.add('active');
        skipAdBtn.classList.add('hidden');
        adTimerMsg.classList.remove('hidden');
        let secondsLeft = 5;
        adCountdown.textContent = secondsLeft;
        if (adInterval) clearInterval(adInterval);
        adInterval = setInterval(() => {
            secondsLeft--;
            adCountdown.textContent = secondsLeft;
            if (secondsLeft <= 0) {
                clearInterval(adInterval);
                adTimerMsg.classList.add('hidden');
                skipAdBtn.classList.remove('hidden');
                forceDownload(wpDownloadUrl);
            }
        }, 1000);
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

        const loginLink = e.target.closest('#wpPromptLoginLink');
        if (loginLink) {
            e.preventDefault();
            loginModal.classList.add('active');
            return;
        }
    });

    if (wpCommentForm) {
        wpCommentForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!currentUser || !currentWpPage) {
                loginModal.classList.add('active');
                updateFullPageSocial();
                return;
            }

            const text = wpCommentInput.value.trim();
            if (!text) return;

            const id = currentWpPage.id;
            if (!appData.comments[id]) appData.comments[id] = [];

            const now = new Date();
            const dateStr = now.toLocaleDateString() + ' ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');

            appData.comments[id].push({
                user: currentUser.name,
                avatar: currentUser.avatar,
                text,
                date: dateStr
            });

            saveAppData();
            wpCommentInput.value = '';
            updateFullPageSocial();
            renderComments();
        });
    }


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
            freshWallpapers.forEach(wp => wallpaperMap.set(wp.id, wp));
            wallpapers = Array.from(wallpaperMap.values()).filter(wp => wp.desktopImg);

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


    /* === COMPLETE LOGIN UI PATCH === */
    function getUserInitials(user) {
        const name = (user && (user.name || user.provider || user.email)) || 'U';
        return name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0])
            .join('')
            .toUpperCase();
    }

    function openLoginModal() {
        if (loginModal) loginModal.classList.add('active');
    }

    function closeLoginModal() {
        if (loginModal) loginModal.classList.remove('active');
    }

    function setLoginLoading(button, isLoading) {
        if (!button) return;
        button.classList.toggle('loading', !!isLoading);
    }

    function mockLogin(provider, button) {
        setLoginLoading(button, true);

        setTimeout(() => {
            const providerName = provider === 'google' ? 'Google User' : 'Facebook User';
            currentUser = {
                name: providerName,
                provider,
                email: provider === 'google' ? 'google-user@afterglowr.local' : 'facebook-user@afterglowr.local',
                signedInAt: new Date().toISOString()
            };

            localStorage.setItem('afterglowr_user', JSON.stringify(currentUser));
            setLoginLoading(button, false);

            const successBox = document.getElementById('authSuccessState');
            if (successBox) successBox.classList.remove('hidden');

            updateAuthUI();

            setTimeout(() => {
                closeLoginModal();
                if (successBox) successBox.classList.add('hidden');
            }, 850);
        }, 650);
    }

    function updateAuthUI() {
        if (currentUser) {
            if (navLoginBtn) {
                navLoginBtn.classList.add('logged-in');
                navLoginBtn.innerHTML = `<span class="nav-avatar">${getUserInitials(currentUser)}</span><span>${currentUser.name}</span>`;
            }

            if (loginPrompt) loginPrompt.classList.add('hidden');
            if (commentForm) commentForm.classList.remove('hidden');
            if (currentUserAvatar) currentUserAvatar.textContent = getUserInitials(currentUser);

            if (wpLoginPrompt) wpLoginPrompt.classList.add('hidden');
            if (wpCommentForm) wpCommentForm.classList.remove('hidden');
            if (wpCurrentUserAvatar) wpCurrentUserAvatar.textContent = getUserInitials(currentUser);
        } else {
            if (navLoginBtn) {
                navLoginBtn.classList.remove('logged-in');
                navLoginBtn.textContent = translations[currentLang]?.login || 'Login';
            }

            if (loginPrompt) loginPrompt.classList.remove('hidden');
            if (commentForm) commentForm.classList.add('hidden');

            if (wpLoginPrompt) wpLoginPrompt.classList.remove('hidden');
            if (wpCommentForm) wpCommentForm.classList.add('hidden');
        }
    }

    if (navLoginBtn) {
        navLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                const shouldLogout = window.confirm('Sign out of Afterglowr?');
                if (shouldLogout) {
                    currentUser = null;
                    localStorage.removeItem('afterglowr_user');
                    updateAuthUI();
                }
                return;
            }
            openLoginModal();
        });
    }

    if (promptLoginLink) {
        promptLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            openLoginModal();
        });
    }

    if (wpPromptLogin) {
        wpPromptLogin.addEventListener('click', (e) => {
            e.preventDefault();
            openLoginModal();
        });
    }

    if (closeLoginModalBtn) closeLoginModalBtn.addEventListener('click', closeLoginModal);
    if (loginBackdrop) loginBackdrop.addEventListener('click', closeLoginModal);
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', () => mockLogin('google', googleLoginBtn));
    if (fbLoginBtn) fbLoginBtn.addEventListener('click', () => mockLogin('facebook', fbLoginBtn));

    updateAuthUI();

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


