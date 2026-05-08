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
