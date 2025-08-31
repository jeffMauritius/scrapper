"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const playwright_1 = require("playwright");
const vendors_enum_1 = require("../enums/vendors.enum");
function determineVendorType(url) {
    if (url.includes('/photo-mariage/'))
        return vendors_enum_1.VendorType.PHOTOGRAPHER;
    if (url.includes('/video-mariage/'))
        return vendors_enum_1.VendorType.VIDEOGRAPHER;
    if (url.includes('/musique-mariage/'))
        return vendors_enum_1.VendorType.MUSIC;
    if (url.includes('/traiteur-mariage/'))
        return vendors_enum_1.VendorType.CATERER;
    if (url.includes('/fleurs-mariage/'))
        return vendors_enum_1.VendorType.FLORIST;
    if (url.includes('/decoration-mariage/'))
        return vendors_enum_1.VendorType.DECORATION;
    if (url.includes('/animation-mariage/'))
        return vendors_enum_1.VendorType.ENTERTAINMENT;
    if (url.includes('/voiture-mariage/'))
        return vendors_enum_1.VendorType.TRANSPORT;
    if (url.includes('/bijoux-mariage/'))
        return vendors_enum_1.VendorType.JEWELRY;
    if (url.includes('/robe-mariage/'))
        return vendors_enum_1.VendorType.DRESS;
    if (url.includes('/costume-mariage/'))
        return vendors_enum_1.VendorType.SUIT;
    if (url.includes('/beaute-mariage/'))
        return vendors_enum_1.VendorType.BEAUTY;
    return vendors_enum_1.VendorType.OTHER;
}
const PAGE_OPTIONS = {
    waitUntil: 'networkidle',
    timeout: 120000,
};
const CONTEXT_OPTIONS = {
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    geolocation: { longitude: 2.3488, latitude: 48.8534 },
    locale: 'fr-FR',
    extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
    },
    ignoreHTTPSErrors: true,
    javaScriptEnabled: true,
};
async function autoDebug(page, error, context) {
    console.log('\n=== Débogage Automatique ===');
    console.log(`Contexte: ${context}`);
    console.log(`Erreur: ${error}`);
    const debugAttempts = [];
    const html = await page.content();
    const alternativeSelectors = [
        { original: '.app-list-directory-item', alternatives: [
                '.directory-list-item',
                '.listingCard',
                '.vendorTile',
                'article[data-type="business"]',
                '.business-card',
                '.vendor-item'
            ] },
        { original: '.storefrontHeading__title', alternatives: [
                'h1',
                '.vendor-name',
                '.business-name',
                '.header-title'
            ] },
        { original: '.storefrontHeading__price', alternatives: [
                '.price',
                '.vendor-price',
                '.business-price',
                '[data-price]'
            ] },
        { original: '.storefrontHeading__address', alternatives: [
                '.address',
                '.vendor-address',
                '.business-address',
                '[data-address]'
            ] }
    ];
    for (const selectorGroup of alternativeSelectors) {
        if (error.toString().includes(selectorGroup.original)) {
            console.log(`\nTentative de correction pour le sélecteur "${selectorGroup.original}"...`);
            for (const altSelector of selectorGroup.alternatives) {
                try {
                    const elements = await page.$$(altSelector);
                    if (elements.length > 0) {
                        console.log(`✓ Sélecteur alternatif trouvé: "${altSelector}" (${elements.length} éléments)`);
                        return {
                            fixed: true,
                            solution: `Remplacer "${selectorGroup.original}" par "${altSelector}"`
                        };
                    }
                    debugAttempts.push({
                        selector: altSelector,
                        error: 'Aucun élément trouvé',
                        html: html.substring(0, 500),
                        timestamp: new Date()
                    });
                }
                catch (e) {
                    debugAttempts.push({
                        selector: altSelector,
                        error: e.toString(),
                        html: html.substring(0, 500),
                        timestamp: new Date()
                    });
                }
            }
        }
    }
    if (error.toString().includes('timeout') || error.toString().includes('navigation')) {
        console.log('\nTentative de correction des problèmes de chargement...');
        try {
            await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(10000);
            return {
                fixed: true,
                solution: 'Page rechargée avec un délai plus long'
            };
        }
        catch (e) {
            console.log('Échec de la tentative de rechargement:', e);
        }
    }
    const debugLog = path.join(__dirname, '../../data/debug_log.json');
    fs.writeFileSync(debugLog, JSON.stringify(debugAttempts, null, 2));
    console.log('\n❌ Impossible de corriger automatiquement l\'erreur');
    console.log('Journal de débogage enregistré dans:', debugLog);
    return { fixed: false };
}
async function getFullDescription(page) {
    try {
        await page.waitForSelector('.storefrontDescription__content', { timeout: 10000 });
        const description = await page.$eval('.storefrontDescription__content', el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
        return description;
    }
    catch (error) {
        console.log('Erreur lors de la récupération de la description complète:', error);
        return '';
    }
}
async function getVendorServices(page) {
    try {
        await page.waitForSelector('.storefrontServices__list', { timeout: 10000 });
        const services = await page.$$eval('.storefrontServices__item', items => items.map(item => { var _a; return ((_a = item.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; }));
        return services.filter(service => service !== '');
    }
    catch (error) {
        console.log('Erreur lors de la récupération des services:', error);
        return [];
    }
}
async function scrapeListPage(page) {
    const vendors = [];
    const ITEMS_PER_PAGE = 24;
    const TOTAL_ITEMS = 14566;
    const TOTAL_PAGES = Math.ceil(TOTAL_ITEMS / ITEMS_PER_PAGE);
    let totalProcessed = 0;
    try {
        for (let currentPage = 1; currentPage <= TOTAL_PAGES; currentPage++) {
            const url = `https://www.mariages.net/busc.php?id_grupo=2&id_sector=8&isNearby=0&NumPage=${currentPage}`;
            console.log(`\n=== Page ${currentPage}/${TOTAL_PAGES} (${Math.round((currentPage / TOTAL_PAGES) * 100)}%) ===`);
            console.log(`Total traité: ${totalProcessed}/${TOTAL_ITEMS} photographes`);
            await page.goto(url, PAGE_OPTIONS).catch(async (error) => {
                const debug = await autoDebug(page, error, 'Navigation vers la page');
                if (!debug.fixed)
                    throw error;
            });
            console.log('Page chargée, attente du contenu...');
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            await page.waitForTimeout(5000);
            const html = await page.content();
            console.log('\nAnalyse de la structure de la page:');
            console.log('- Contient storefront-list:', html.includes('storefront-list'));
            console.log('- Contient directory-list-item:', html.includes('directory-list-item'));
            console.log('- Contient vendorTile:', html.includes('vendorTile'));
            const selectors = [
                '.storefront-list .directory-list-item',
                '.app-directory-list article',
                '.vendorTile',
                '.directory-item',
                '[data-list-type="Catalog"] article',
                '.listingCard'
            ];
            let cards = [];
            for (const selector of selectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 5000 });
                    cards = await page.$$(selector);
                    if (cards.length > 0) {
                        console.log(`\nSélecteur trouvé: ${selector} (${cards.length} cartes)`);
                        break;
                    }
                }
                catch (error) {
                    console.log(`Sélecteur ${selector} non trouvé`);
                }
            }
            if (cards.length === 0) {
                await page.waitForTimeout(10000);
                try {
                    cards = await page.$$('article');
                    if (cards.length > 0) {
                        console.log(`\nSélecteur de secours trouvé: article (${cards.length} cartes)`);
                    }
                }
                catch (error) {
                    console.log('Aucun sélecteur de secours trouvé');
                }
                if (cards.length === 0) {
                    console.log('\nAucune carte trouvée sur cette page, passage à la suivante');
                    continue;
                }
            }
            console.log(`\nTraitement des ${cards.length} cartes de la page ${currentPage}...`);
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                try {
                    console.log(`\nTraitement de la carte ${i + 1}/${cards.length} (page ${currentPage}/${TOTAL_PAGES})...`);
                    const isAttached = await card.evaluate((el) => el.isConnected);
                    if (!isAttached) {
                        console.log('Carte non attachée au DOM, on passe à la suivante');
                        continue;
                    }
                    const data = await card.evaluate((el) => {
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                        const nameEl = el.querySelector('.storefront-name, .vendorTile__title, .businessCard__title, h3');
                        const ratingEl = el.querySelector('.storefront-rating, .vendorTile__rating, .businessCard__rating');
                        const reviewsEl = el.querySelector('.storefront-reviews-count, .rating-counter, .businessCard__reviews');
                        const locationEl = el.querySelector('.storefront-location, .vendorTile__location, .businessCard__location');
                        const priceEl = el.querySelector('.storefront-price, .vendorTile__price, .businessCard__price');
                        const descriptionEl = el.querySelector('.storefront-description, .vendorTile__description, .businessCard__description');
                        const linkEl = el.querySelector('a[href*="/photo-mariage/"]');
                        const sliderImages = Array.from(el.querySelectorAll('.storefront-gallery img, .vendorTile__gallery img, .businessCard__gallery img'))
                            .map(img => {
                            const dataSrc = img.getAttribute('data-lazy') || img.getAttribute('data-src');
                            const src = img.getAttribute('src');
                            return dataSrc || src;
                        })
                            .filter(Boolean);
                        console.log('Éléments trouvés:', {
                            name: (_a = nameEl === null || nameEl === void 0 ? void 0 : nameEl.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                            rating: (_b = ratingEl === null || ratingEl === void 0 ? void 0 : ratingEl.textContent) === null || _b === void 0 ? void 0 : _b.trim(),
                            reviews: (_c = reviewsEl === null || reviewsEl === void 0 ? void 0 : reviewsEl.textContent) === null || _c === void 0 ? void 0 : _c.trim(),
                            location: (_d = locationEl === null || locationEl === void 0 ? void 0 : locationEl.textContent) === null || _d === void 0 ? void 0 : _d.trim(),
                            price: (_e = priceEl === null || priceEl === void 0 ? void 0 : priceEl.textContent) === null || _e === void 0 ? void 0 : _e.trim(),
                            description: (_f = descriptionEl === null || descriptionEl === void 0 ? void 0 : descriptionEl.textContent) === null || _f === void 0 ? void 0 : _f.trim(),
                            url: linkEl === null || linkEl === void 0 ? void 0 : linkEl.href,
                            imagesCount: sliderImages.length
                        });
                        return {
                            name: ((_g = nameEl === null || nameEl === void 0 ? void 0 : nameEl.textContent) === null || _g === void 0 ? void 0 : _g.trim()) || '',
                            rating: ((_h = ratingEl === null || ratingEl === void 0 ? void 0 : ratingEl.textContent) === null || _h === void 0 ? void 0 : _h.trim()) || '',
                            reviews: ((_j = reviewsEl === null || reviewsEl === void 0 ? void 0 : reviewsEl.textContent) === null || _j === void 0 ? void 0 : _j.trim().replace(/[()]/g, '')) || '',
                            location: ((_k = locationEl === null || locationEl === void 0 ? void 0 : locationEl.textContent) === null || _k === void 0 ? void 0 : _k.trim()) || '',
                            price: ((_l = priceEl === null || priceEl === void 0 ? void 0 : priceEl.textContent) === null || _l === void 0 ? void 0 : _l.trim()) || '',
                            description: ((_m = descriptionEl === null || descriptionEl === void 0 ? void 0 : descriptionEl.textContent) === null || _m === void 0 ? void 0 : _m.trim()) || '',
                            url: (linkEl === null || linkEl === void 0 ? void 0 : linkEl.href) || '',
                            images: sliderImages,
                            type: 'photographer'
                        };
                    });
                    if (data.url) {
                        const [city, region] = data.location.split(',').map((s) => s.trim());
                        const newPage = await page.context().newPage();
                        try {
                            await newPage.goto(data.url, PAGE_OPTIONS);
                            await newPage.waitForLoadState('networkidle');
                            await newPage.waitForTimeout(2000);
                            const fullDescription = await getFullDescription(newPage);
                            const services = await getVendorServices(newPage);
                            const vendor = {
                                url: data.url,
                                name: data.name,
                                type: determineVendorType(data.url),
                                description: fullDescription || data.description,
                                images: data.images,
                                price: data.price,
                                address: data.location,
                                city: city || '',
                                region: region || '',
                                rating: `${data.rating} (${data.reviews})`,
                                services
                            };
                            await saveData([vendor]);
                            vendors.push(vendor);
                            totalProcessed++;
                            console.log(`\nPhotographe ajouté et sauvegardé: ${vendor.name}`);
                            console.log('Services:', vendor.services);
                        }
                        catch (error) {
                            console.log(`Erreur lors de l'extraction des détails:`, error);
                            const vendor = {
                                url: data.url,
                                name: data.name,
                                type: determineVendorType(data.url),
                                description: data.description,
                                images: data.images,
                                price: data.price,
                                address: data.location,
                                city: city || '',
                                region: region || '',
                                rating: `${data.rating} (${data.reviews})`,
                                services: []
                            };
                            await saveData([vendor]);
                            vendors.push(vendor);
                            totalProcessed++;
                            console.log(`Photographe ajouté avec données de base: ${vendor.name}`);
                        }
                        finally {
                            await newPage.close();
                        }
                    }
                    if (totalProcessed % 50 === 0) {
                        console.log(`\n=== ${totalProcessed}/${TOTAL_ITEMS} photographes traités (${Math.round((totalProcessed / TOTAL_ITEMS) * 100)}%) ===`);
                        await saveData(vendors);
                    }
                }
                catch (error) {
                    console.log('Erreur lors du traitement de la carte:', error);
                }
            }
            if (currentPage < TOTAL_PAGES) {
                const waitTime = Math.random() * 5000 + 3000;
                console.log(`\nAttente de ${Math.round(waitTime / 1000)}s avant la page suivante...`);
                await page.waitForTimeout(waitTime);
            }
        }
    }
    catch (error) {
        console.log('Erreur lors du scraping:', error);
        await autoDebug(page, error, 'Erreur générale');
    }
    console.log(`\nTotal final: ${vendors.length} photographes trouvés`);
    return vendors;
}
async function saveData(vendors) {
    try {
        const outputPath = path.join(process.cwd(), 'data/photographers.json');
        let existingData = { vendors: [] };
        if (fs.existsSync(outputPath)) {
            try {
                const fileContent = fs.readFileSync(outputPath, 'utf8');
                const parsed = JSON.parse(fileContent);
                existingData = {
                    vendors: Array.isArray(parsed.vendors) ? parsed.vendors :
                        Array.isArray(parsed) ? parsed : []
                };
            }
            catch (error) {
                console.log('Erreur lors de la lecture du fichier existant, création d\'un nouveau fichier');
            }
        }
        const newVendors = vendors.filter(newVendor => {
            const exists = existingData.vendors.some(existingVendor => existingVendor.name.toLowerCase().trim() === newVendor.name.toLowerCase().trim() &&
                existingVendor.city.toLowerCase().trim() === newVendor.city.toLowerCase().trim());
            if (exists) {
                console.log(`⚠️ Photographe déjà existant, ignoré: ${newVendor.name} à ${newVendor.city}`);
                return false;
            }
            return true;
        });
        if (newVendors.length === 0) {
            console.log('Aucun nouveau photographe à ajouter');
            return;
        }
        existingData.vendors.push(...newVendors);
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('Dossier data créé');
        }
        fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2));
        console.log(`Données sauvegardées dans ${outputPath}`);
        console.log(`${newVendors.length} nouveaux photographes ajoutés, total: ${existingData.vendors.length}`);
    }
    catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
    }
}
async function main() {
    const browser = await playwright_1.chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu'
        ]
    }).catch(error => {
        console.error('Erreur lors du lancement du navigateur:', error);
        throw error;
    });
    const context = await browser.newContext(Object.assign(Object.assign({}, CONTEXT_OPTIONS), { bypassCSP: true })).catch(error => {
        console.error('Erreur lors de la création du contexte:', error);
        throw error;
    });
    await context.grantPermissions(['geolocation']);
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
    });
    const page = await context.newPage().catch(error => {
        console.error('Erreur lors de la création de la page:', error);
        throw error;
    });
    try {
        console.log('Démarrage du scraping des photographes...');
        console.log('Visite de la page d\'accueil des photographes pour initialiser la session...');
        await page.goto('https://www.mariages.net/photo-mariage', { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);
        const vendors = await scrapeListPage(page);
        await saveData(vendors);
    }
    catch (error) {
        console.error('Erreur:', error);
        await autoDebug(page, error, 'Erreur générale main');
    }
    finally {
        await browser.close().catch(console.error);
    }
}
main().catch(console.error);
//# sourceMappingURL=scrape-vendors.js.map