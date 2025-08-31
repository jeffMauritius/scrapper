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
const wedding_venues_enum_1 = require("../enums/wedding-venues.enum");
function determineVenueType(url) {
    if (url.includes('/chateau-mariage/'))
        return wedding_venues_enum_1.WeddingVenueType.CASTLE;
    if (url.includes('/domaine-mariage/'))
        return wedding_venues_enum_1.WeddingVenueType.DOMAIN;
    if (url.includes('/salle-mariage/'))
        return wedding_venues_enum_1.WeddingVenueType.RECEPTION_HALL;
    if (url.includes('/hotel-mariage/'))
        return wedding_venues_enum_1.WeddingVenueType.HOTEL;
    if (url.includes('/restaurant-mariage/'))
        return wedding_venues_enum_1.WeddingVenueType.RESTAURANT;
    if (url.includes('/bateau-mariage/'))
        return wedding_venues_enum_1.WeddingVenueType.BOAT;
    if (url.includes('/plage/'))
        return wedding_venues_enum_1.WeddingVenueType.BEACH;
    if (url.includes('/chapiteau-mariage/'))
        return wedding_venues_enum_1.WeddingVenueType.MARQUEE;
    if (url.includes('/auberge-mariage/'))
        return wedding_venues_enum_1.WeddingVenueType.INN;
    return wedding_venues_enum_1.WeddingVenueType.DOMAIN;
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
                '.venue-item'
            ] },
        { original: '.storefrontHeading__title', alternatives: [
                'h1',
                '.venue-name',
                '.business-name',
                '.header-title'
            ] },
        { original: '.storefrontHeading__price', alternatives: [
                '.price',
                '.venue-price',
                '.business-price',
                '[data-price]'
            ] },
        { original: '.storefrontHeading__address', alternatives: [
                '.address',
                '.venue-address',
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
async function scrapeListPage(page) {
    const venues = [];
    const ITEMS_PER_PAGE = 24;
    const TOTAL_ITEMS = 11575;
    const TOTAL_PAGES = Math.ceil(TOTAL_ITEMS / ITEMS_PER_PAGE);
    try {
        for (let currentPage = 1; currentPage <= TOTAL_PAGES; currentPage++) {
            const url = `https://www.mariages.net/busc.php?id_grupo=1&showmode=list&NumPage=${currentPage}&userSearch=1&isNearby=0&isOrganicSearch=1&priceType=menu&categoryIds[]=1&categoryIds[]=2&categoryIds[]=3&categoryIds[]=4&categoryIds[]=5&categoryIds[]=29&categoryIds[]=31&categoryIds[]=63&categoryIds[]=47`;
            console.log(`\nNavigation vers la page ${currentPage}/${TOTAL_PAGES}...`);
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
            console.log('- Contient app-lista-empresas:', html.includes('app-lista-empresas'));
            console.log('- Contient listingCard:', html.includes('listingCard'));
            console.log('- Contient vendorTile:', html.includes('vendorTile'));
            console.log('- Contient empresa:', html.includes('empresa'));
            const selectors = [
                '#app-lista-empresas article',
                '.empresa',
                'article[data-tipo]',
                'article.listingCard',
                '.vendorTile',
                'article'
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
                console.log('\nAucune carte trouvée sur cette page, passage à la suivante');
                continue;
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
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                        console.log('\nHTML de la carte:', el.outerHTML);
                        const nameEl = el.querySelector('.vendorTile__title, .app-vendor-tile-title, h2');
                        const ratingEl = el.querySelector('.vendorTile__rating, .rating-badge, .storefront-rating');
                        const reviewsEl = el.querySelector('.rating-counter, .reviewCount, .storefront-reviews-count');
                        const locationEl = el.querySelector('.vendorTile__location, .vendor-location, .storefront-location');
                        const priceContainerEl = el.querySelector('.vendorTileFooter__price');
                        const priceEl = priceContainerEl === null || priceContainerEl === void 0 ? void 0 : priceContainerEl.querySelector('span:last-child');
                        const capacityContainerEl = el.querySelector('.vendorTileFooter__capacity');
                        const capacityEl = capacityContainerEl === null || capacityContainerEl === void 0 ? void 0 : capacityContainerEl.querySelector('span:last-child');
                        const descriptionEl = el.querySelector('.vendorTile__description, .vendor-description');
                        const linkEl = el.querySelector('.vendorTile a[href*="/"]');
                        const typeEl = el.querySelector('.vendorTile__subtitle, .vendor-type');
                        const sliderImages = Array.from(el.querySelectorAll('.vendorTileGallery__image, .vendorTileGallery picture source'))
                            .map(element => {
                            var _a, _b;
                            if (element instanceof HTMLSourceElement) {
                                const srcset = element.getAttribute('data-srcset') || element.getAttribute('srcset');
                                console.log('Source element srcset:', srcset);
                                return (_b = (_a = srcset === null || srcset === void 0 ? void 0 : srcset.split(',')[0]) === null || _a === void 0 ? void 0 : _a.trim()) === null || _b === void 0 ? void 0 : _b.split(' ')[0];
                            }
                            else {
                                const dataSrc = element.getAttribute('data-lazy') || element.getAttribute('data-src');
                                const src = element.getAttribute('src');
                                console.log('Image element:', { dataSrc, src });
                                return dataSrc || src;
                            }
                        })
                            .filter(Boolean);
                        if (sliderImages.length === 0) {
                            console.log('Aucune image trouvée avec les sélecteurs principaux, essai des sélecteurs alternatifs...');
                            const alternativeImages = Array.from(el.querySelectorAll('.vendorTileGallery img[src], .vendorTileGallery img[data-src]'))
                                .map(img => {
                                const src = img.getAttribute('data-src') || img.getAttribute('src');
                                console.log('Image alternative trouvée:', src);
                                return src;
                            })
                                .filter(Boolean);
                            if (alternativeImages.length > 0) {
                                console.log(`${alternativeImages.length} images alternatives trouvées`);
                                sliderImages.push(...alternativeImages);
                            }
                        }
                        console.log(`Total images trouvées: ${sliderImages.length}`);
                        const logElement = (name, el, container = null) => {
                            var _a;
                            console.log(`\nDébug ${name}:`);
                            if (container) {
                                console.log('Container HTML:', container.outerHTML);
                            }
                            if (el) {
                                console.log('Element trouvé:', {
                                    text: (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                                    html: el.outerHTML,
                                    classes: el.className,
                                    attributes: Object.fromEntries(Array.from(el.attributes).map(attr => [attr.name, attr.value]))
                                });
                            }
                            else {
                                console.log('Element non trouvé');
                            }
                        };
                        logElement('name', nameEl);
                        logElement('rating', ratingEl);
                        logElement('reviews', reviewsEl);
                        logElement('location', locationEl);
                        logElement('price', priceEl || null, priceContainerEl || null);
                        logElement('capacity', capacityEl || null, capacityContainerEl || null);
                        logElement('description', descriptionEl);
                        logElement('link', linkEl);
                        logElement('type', typeEl);
                        console.log('\nImages trouvées:', sliderImages);
                        const priceText = ((_a = priceEl === null || priceEl === void 0 ? void 0 : priceEl.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = priceContainerEl === null || priceContainerEl === void 0 ? void 0 : priceContainerEl.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || '';
                        const capacityText = ((_c = capacityEl === null || capacityEl === void 0 ? void 0 : capacityEl.textContent) === null || _c === void 0 ? void 0 : _c.trim()) || ((_d = capacityContainerEl === null || capacityContainerEl === void 0 ? void 0 : capacityContainerEl.textContent) === null || _d === void 0 ? void 0 : _d.trim()) || '';
                        const data = {
                            name: ((_e = nameEl === null || nameEl === void 0 ? void 0 : nameEl.textContent) === null || _e === void 0 ? void 0 : _e.trim()) || '',
                            rating: ((_f = ratingEl === null || ratingEl === void 0 ? void 0 : ratingEl.textContent) === null || _f === void 0 ? void 0 : _f.trim()) || '',
                            reviews: ((_g = reviewsEl === null || reviewsEl === void 0 ? void 0 : reviewsEl.textContent) === null || _g === void 0 ? void 0 : _g.trim().replace(/[()]/g, '')) || '',
                            location: ((_h = locationEl === null || locationEl === void 0 ? void 0 : locationEl.textContent) === null || _h === void 0 ? void 0 : _h.trim()) || '',
                            price: priceText,
                            capacity: capacityText,
                            description: ((_j = descriptionEl === null || descriptionEl === void 0 ? void 0 : descriptionEl.textContent) === null || _j === void 0 ? void 0 : _j.trim()) || '',
                            url: (linkEl === null || linkEl === void 0 ? void 0 : linkEl.href) || '',
                            images: sliderImages,
                            type: ((_k = typeEl === null || typeEl === void 0 ? void 0 : typeEl.textContent) === null || _k === void 0 ? void 0 : _k.trim()) || ''
                        };
                        console.log('\nDonnées extraites:', data);
                        return data;
                    });
                    console.log('\nDonnées extraites:', data);
                    if (data.url) {
                        console.log(`\nExtraction des détails pour ${data.name || 'établissement inconnu'}...`);
                        const [city, region] = data.location.split(',').map((s) => s.trim());
                        let type = determineVenueType(data.url);
                        if (data.type) {
                            switch (data.type.toLowerCase()) {
                                case 'domaine':
                                    type = wedding_venues_enum_1.WeddingVenueType.DOMAIN;
                                    break;
                                case 'auberge':
                                    type = wedding_venues_enum_1.WeddingVenueType.INN;
                                    break;
                                case 'hôtel':
                                    type = wedding_venues_enum_1.WeddingVenueType.HOTEL;
                                    break;
                                case 'restaurant':
                                    type = wedding_venues_enum_1.WeddingVenueType.RESTAURANT;
                                    break;
                                case 'salle':
                                    type = wedding_venues_enum_1.WeddingVenueType.RECEPTION_HALL;
                                    break;
                                case 'château':
                                    type = wedding_venues_enum_1.WeddingVenueType.CASTLE;
                                    break;
                                case 'bateau':
                                    type = wedding_venues_enum_1.WeddingVenueType.BOAT;
                                    break;
                                case 'plage':
                                    type = wedding_venues_enum_1.WeddingVenueType.BEACH;
                                    break;
                                case 'chapiteau':
                                    type = wedding_venues_enum_1.WeddingVenueType.MARQUEE;
                                    break;
                            }
                        }
                        const newPage = await page.context().newPage();
                        try {
                            await newPage.goto(data.url, PAGE_OPTIONS);
                            await newPage.waitForLoadState('networkidle');
                            await newPage.waitForTimeout(2000);
                            const fullDescription = await getFullDescription(newPage);
                            const venue = {
                                url: data.url,
                                name: data.name,
                                type,
                                description: fullDescription || data.description,
                                images: data.images,
                                price: data.price,
                                address: data.location,
                                city: city || '',
                                region: region || '',
                                capacity: data.capacity,
                                rating: `${data.rating} (${data.reviews})`
                            };
                            await saveData([venue]);
                            venues.push(venue);
                            console.log(`\nLieu ajouté et sauvegardé: ${venue.name}`);
                            console.log('Description:', venue.description.substring(0, 200) + '...');
                            console.log(`Images: ${venue.images.length}`);
                        }
                        catch (error) {
                            console.log(`Erreur lors de l'extraction des détails:`, error);
                            const venue = {
                                url: data.url,
                                name: data.name,
                                type: determineVenueType(data.url),
                                description: data.description,
                                images: [],
                                price: data.price,
                                address: data.location,
                                city: city || '',
                                region: region || '',
                                capacity: data.capacity,
                                rating: `${data.rating} (${data.reviews})`
                            };
                            await saveData([venue]);
                            venues.push(venue);
                            console.log(`Lieu ajouté et sauvegardé avec données de base: ${venue.name}`);
                        }
                        finally {
                            await newPage.close();
                        }
                    }
                    if (venues.length % 100 === 0) {
                        console.log(`\n=== ${venues.length} établissements traités sur ${TOTAL_ITEMS} ===`);
                        await saveData(venues);
                    }
                }
                catch (error) {
                    console.log('Erreur lors du traitement de la carte:', error);
                }
            }
            if (currentPage < TOTAL_PAGES) {
                const waitTime = Math.random() * 3000 + 2000;
                console.log(`\nAttente de ${Math.round(waitTime / 1000)}s avant la page suivante...`);
                await page.waitForTimeout(waitTime);
            }
        }
    }
    catch (error) {
        console.log('Erreur lors du scraping:', error);
        await autoDebug(page, error, 'Erreur générale');
    }
    console.log(`\nTotal: ${venues.length} lieux trouvés`);
    return venues;
}
async function saveData(venues) {
    try {
        const outputPath = path.join(process.cwd(), 'data/venues.json');
        let existingData = { venues: [] };
        if (fs.existsSync(outputPath)) {
            try {
                const fileContent = fs.readFileSync(outputPath, 'utf8');
                const parsed = JSON.parse(fileContent);
                existingData = {
                    venues: Array.isArray(parsed.venues) ? parsed.venues :
                        Array.isArray(parsed) ? parsed : []
                };
            }
            catch (error) {
                console.log('Erreur lors de la lecture du fichier existant, création d\'un nouveau fichier');
            }
        }
        const newVenues = venues.filter(newVenue => {
            const exists = existingData.venues.some(existingVenue => existingVenue.name.toLowerCase().trim() === newVenue.name.toLowerCase().trim() &&
                existingVenue.city.toLowerCase().trim() === newVenue.city.toLowerCase().trim());
            if (exists) {
                console.log(`⚠️ Établissement déjà existant, ignoré: ${newVenue.name} à ${newVenue.city}`);
                return false;
            }
            return true;
        });
        if (newVenues.length === 0) {
            console.log('Aucun nouvel établissement à ajouter');
            return;
        }
        existingData.venues.push(...newVenues);
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('Dossier data créé');
        }
        fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2));
        console.log(`Données sauvegardées dans ${outputPath}`);
        console.log(`${newVenues.length} nouveaux établissements ajoutés, total: ${existingData.venues.length}`);
    }
    catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
    }
}
async function main() {
    const browser = await playwright_1.chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--no-sandbox',
            '--disable-setuid-sandbox'
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
        console.log('Démarrage du scraping...');
        console.log('Visite de la page d\'accueil pour initialiser la session...');
        await page.goto('https://www.mariages.net', { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);
        const venues = await scrapeListPage(page);
        await saveData(venues);
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
//# sourceMappingURL=scrape-all.js.map