export const DEFAULT_LOCALE = 'en';
export const LOCALE_PREFIX = 'zh';
export const SUPPORTED_LOCALES = [DEFAULT_LOCALE, LOCALE_PREFIX];

export function normalizePathname(pathname = '/') {
    let path = String(pathname || '/');
    if (!path.startsWith('/')) path = `/${path}`;
    path = path.replace(/\/{2,}/g, '/');

    if (path === `/${LOCALE_PREFIX}`) return `/${LOCALE_PREFIX}/`;
    if (path.startsWith(`/${LOCALE_PREFIX}//`)) {
        return path.replace(`/${LOCALE_PREFIX}//`, `/${LOCALE_PREFIX}/`);
    }

    return path;
}

export function getLocaleFromPath(pathname = '/') {
    const path = normalizePathname(pathname);
    return path === `/${LOCALE_PREFIX}/` || path.startsWith(`/${LOCALE_PREFIX}/`)
        ? LOCALE_PREFIX
        : DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname = '/') {
    const path = normalizePathname(pathname);
    if (path === `/${LOCALE_PREFIX}/`) return '/';
    if (path.startsWith(`/${LOCALE_PREFIX}/`)) {
        return path.slice(LOCALE_PREFIX.length + 1) || '/';
    }
    return path;
}

export function withLocalePath(pathname = '/', locale = DEFAULT_LOCALE) {
    const routePath = stripLocalePrefix(pathname);
    if (locale === LOCALE_PREFIX) {
        return routePath === '/' ? `/${LOCALE_PREFIX}/` : `/${LOCALE_PREFIX}${routePath}`;
    }
    return routePath || '/';
}

export function switchLocalePath(pathname = '/') {
    const currentLocale = getLocaleFromPath(pathname);
    const nextLocale = currentLocale === LOCALE_PREFIX ? DEFAULT_LOCALE : LOCALE_PREFIX;
    return withLocalePath(pathname, nextLocale);
}

export function parseRoute(pathname = '/') {
    const normalizedPath = normalizePathname(pathname);
    const locale = getLocaleFromPath(normalizedPath);
    const routePath = stripLocalePrefix(normalizedPath);
    const wallpaperMatch = routePath.match(/^\/wallpaper\/([^/]+)\/?$/);
    const categoryMatch = routePath.match(/^\/category\/([^/]+)\/?$/);
    const pageMatch = routePath.match(/^\/page\/(\d+)\/?$/);

    if (wallpaperMatch) {
        return {
            locale,
            routePath,
            routeName: 'wallpaper',
            params: { slug: decodeURIComponent(wallpaperMatch[1]) }
        };
    }

    if (categoryMatch) {
        return {
            locale,
            routePath,
            routeName: 'category',
            params: { slug: decodeURIComponent(categoryMatch[1]) }
        };
    }

    if (pageMatch) {
        const page = parseInt(pageMatch[1], 10);
        return {
            locale,
            routePath,
            routeName: 'page',
            params: { page: Number.isFinite(page) && page > 0 ? page : 1 }
        };
    }

    return {
        locale,
        routePath,
        routeName: routePath === '/' ? 'home' : 'seoLanding',
        params: {}
    };
}
