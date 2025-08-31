"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference lib="dom" />
var fs = require("fs");
var path = require("path");
var playwright_1 = require("playwright");
var wedding_venues_enum_1 = require("../enums/wedding-venues.enum");
// Fonction pour déterminer le type d'établissement
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
    return wedding_venues_enum_1.WeddingVenueType.DOMAIN; // Par défaut, on considère que c'est un domaine
}
// Options de la page
var PAGE_OPTIONS = {
    waitUntil: 'networkidle',
    timeout: 120000, // 2 minutes
};
// Options du contexte
var CONTEXT_OPTIONS = {
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
// Fonction pour analyser et corriger les erreurs automatiquement
function autoDebug(page, error, context) {
    return __awaiter(this, void 0, void 0, function () {
        var debugAttempts, html, alternativeSelectors, _i, alternativeSelectors_1, selectorGroup, _a, _b, altSelector, elements, e_1, e_2, debugLog;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('\n=== Débogage Automatique ===');
                    console.log("Contexte: ".concat(context));
                    console.log("Erreur: ".concat(error));
                    debugAttempts = [];
                    return [4 /*yield*/, page.content()];
                case 1:
                    html = _c.sent();
                    alternativeSelectors = [
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
                    _i = 0, alternativeSelectors_1 = alternativeSelectors;
                    _c.label = 2;
                case 2:
                    if (!(_i < alternativeSelectors_1.length)) return [3 /*break*/, 9];
                    selectorGroup = alternativeSelectors_1[_i];
                    if (!error.toString().includes(selectorGroup.original)) return [3 /*break*/, 8];
                    console.log("\nTentative de correction pour le s\u00E9lecteur \"".concat(selectorGroup.original, "\"..."));
                    _a = 0, _b = selectorGroup.alternatives;
                    _c.label = 3;
                case 3:
                    if (!(_a < _b.length)) return [3 /*break*/, 8];
                    altSelector = _b[_a];
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, page.$$(altSelector)];
                case 5:
                    elements = _c.sent();
                    if (elements.length > 0) {
                        console.log("\u2713 S\u00E9lecteur alternatif trouv\u00E9: \"".concat(altSelector, "\" (").concat(elements.length, " \u00E9l\u00E9ments)"));
                        return [2 /*return*/, {
                                fixed: true,
                                solution: "Remplacer \"".concat(selectorGroup.original, "\" par \"").concat(altSelector, "\"")
                            }];
                    }
                    debugAttempts.push({
                        selector: altSelector,
                        error: 'Aucun élément trouvé',
                        html: html.substring(0, 500),
                        timestamp: new Date()
                    });
                    return [3 /*break*/, 7];
                case 6:
                    e_1 = _c.sent();
                    debugAttempts.push({
                        selector: altSelector,
                        error: e_1.toString(),
                        html: html.substring(0, 500),
                        timestamp: new Date()
                    });
                    return [3 /*break*/, 7];
                case 7:
                    _a++;
                    return [3 /*break*/, 3];
                case 8:
                    _i++;
                    return [3 /*break*/, 2];
                case 9:
                    if (!(error.toString().includes('timeout') || error.toString().includes('navigation'))) return [3 /*break*/, 14];
                    console.log('\nTentative de correction des problèmes de chargement...');
                    _c.label = 10;
                case 10:
                    _c.trys.push([10, 13, , 14]);
                    return [4 /*yield*/, page.reload({ waitUntil: 'networkidle', timeout: 60000 })];
                case 11:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(10000)];
                case 12:
                    _c.sent();
                    return [2 /*return*/, {
                            fixed: true,
                            solution: 'Page rechargée avec un délai plus long'
                        }];
                case 13:
                    e_2 = _c.sent();
                    console.log('Échec de la tentative de rechargement:', e_2);
                    return [3 /*break*/, 14];
                case 14:
                    debugLog = path.join(__dirname, '../../data/debug_log.json');
                    fs.writeFileSync(debugLog, JSON.stringify(debugAttempts, null, 2));
                    console.log('\n❌ Impossible de corriger automatiquement l\'erreur');
                    console.log('Journal de débogage enregistré dans:', debugLog);
                    return [2 /*return*/, { fixed: false }];
            }
        });
    });
}
function getFullDescription(page) {
    return __awaiter(this, void 0, void 0, function () {
        var description, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    // Attendre que la description soit chargée
                    return [4 /*yield*/, page.waitForSelector('.storefrontDescription__content', { timeout: 10000 })];
                case 1:
                    // Attendre que la description soit chargée
                    _a.sent();
                    return [4 /*yield*/, page.$eval('.storefrontDescription__content', function (el) { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; })];
                case 2:
                    description = _a.sent();
                    return [2 /*return*/, description];
                case 3:
                    error_1 = _a.sent();
                    console.log('Erreur lors de la récupération de la description complète:', error_1);
                    return [2 /*return*/, ''];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function scrapeListPage(page) {
    return __awaiter(this, void 0, void 0, function () {
        var venues, ITEMS_PER_PAGE, TOTAL_ITEMS, TOTAL_PAGES, currentPage, url, html, selectors, cards, _i, selectors_1, selector, error_2, i, card, isAttached, data, _a, city, region, type, newPage, fullDescription, venue, error_3, venue, error_4, waitTime, error_5;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    venues = [];
                    ITEMS_PER_PAGE = 24;
                    TOTAL_ITEMS = 11575;
                    TOTAL_PAGES = Math.ceil(TOTAL_ITEMS / ITEMS_PER_PAGE);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 38, , 40]);
                    currentPage = 1;
                    _b.label = 2;
                case 2:
                    if (!(currentPage <= TOTAL_PAGES)) return [3 /*break*/, 37];
                    url = "https://www.mariages.net/busc.php?id_grupo=1&showmode=list&NumPage=".concat(currentPage, "&userSearch=1&isNearby=0&isOrganicSearch=1&priceType=menu&categoryIds[]=1&categoryIds[]=2&categoryIds[]=3&categoryIds[]=4&categoryIds[]=5&categoryIds[]=29&categoryIds[]=31&categoryIds[]=63&categoryIds[]=47");
                    console.log("\nNavigation vers la page ".concat(currentPage, "/").concat(TOTAL_PAGES, "..."));
                    return [4 /*yield*/, page.goto(url, PAGE_OPTIONS).catch(function (error) { return __awaiter(_this, void 0, void 0, function () {
                            var debug;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, autoDebug(page, error, 'Navigation vers la page')];
                                    case 1:
                                        debug = _a.sent();
                                        if (!debug.fixed)
                                            throw error;
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 3:
                    _b.sent();
                    console.log('Page chargée, attente du contenu...');
                    return [4 /*yield*/, page.waitForLoadState('networkidle', { timeout: 30000 })];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, page.waitForTimeout(5000)];
                case 5:
                    _b.sent();
                    return [4 /*yield*/, page.content()];
                case 6:
                    html = _b.sent();
                    console.log('\nAnalyse de la structure de la page:');
                    console.log('- Contient app-lista-empresas:', html.includes('app-lista-empresas'));
                    console.log('- Contient listingCard:', html.includes('listingCard'));
                    console.log('- Contient vendorTile:', html.includes('vendorTile'));
                    console.log('- Contient empresa:', html.includes('empresa'));
                    selectors = [
                        '#app-lista-empresas article',
                        '.empresa',
                        'article[data-tipo]',
                        'article.listingCard',
                        '.vendorTile',
                        'article'
                    ];
                    cards = [];
                    _i = 0, selectors_1 = selectors;
                    _b.label = 7;
                case 7:
                    if (!(_i < selectors_1.length)) return [3 /*break*/, 13];
                    selector = selectors_1[_i];
                    _b.label = 8;
                case 8:
                    _b.trys.push([8, 11, , 12]);
                    return [4 /*yield*/, page.waitForSelector(selector, { timeout: 5000 })];
                case 9:
                    _b.sent();
                    return [4 /*yield*/, page.$$(selector)];
                case 10:
                    cards = _b.sent();
                    if (cards.length > 0) {
                        console.log("\nS\u00E9lecteur trouv\u00E9: ".concat(selector, " (").concat(cards.length, " cartes)"));
                        return [3 /*break*/, 13];
                    }
                    return [3 /*break*/, 12];
                case 11:
                    error_2 = _b.sent();
                    console.log("S\u00E9lecteur ".concat(selector, " non trouv\u00E9"));
                    return [3 /*break*/, 12];
                case 12:
                    _i++;
                    return [3 /*break*/, 7];
                case 13:
                    if (cards.length === 0) {
                        console.log('\nAucune carte trouvée sur cette page, passage à la suivante');
                        return [3 /*break*/, 36];
                    }
                    console.log("\nTraitement des ".concat(cards.length, " cartes de la page ").concat(currentPage, "..."));
                    i = 0;
                    _b.label = 14;
                case 14:
                    if (!(i < cards.length)) return [3 /*break*/, 34];
                    card = cards[i];
                    _b.label = 15;
                case 15:
                    _b.trys.push([15, 32, , 33]);
                    console.log("\nTraitement de la carte ".concat(i + 1, "/").concat(cards.length, " (page ").concat(currentPage, "/").concat(TOTAL_PAGES, ")..."));
                    return [4 /*yield*/, card.evaluate(function (el) { return el.isConnected; })];
                case 16:
                    isAttached = _b.sent();
                    if (!isAttached) {
                        console.log('Carte non attachée au DOM, on passe à la suivante');
                        return [3 /*break*/, 33];
                    }
                    return [4 /*yield*/, card.evaluate(function (el) {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                            // Afficher le HTML complet de la carte pour déboguer
                            console.log('\nHTML de la carte:', el.outerHTML);
                            // Essayer différents sélecteurs pour chaque élément
                            var nameEl = el.querySelector('.vendorTile__title, .app-vendor-tile-title, h2');
                            var ratingEl = el.querySelector('.vendorTile__rating, .rating-badge, .storefront-rating');
                            var reviewsEl = el.querySelector('.rating-counter, .reviewCount, .storefront-reviews-count');
                            var locationEl = el.querySelector('.vendorTile__location, .vendor-location, .storefront-location');
                            // Nouveaux sélecteurs pour le prix et la capacité
                            var priceContainerEl = el.querySelector('.vendorTileFooter__price');
                            var priceEl = priceContainerEl === null || priceContainerEl === void 0 ? void 0 : priceContainerEl.querySelector('span:last-child');
                            var capacityContainerEl = el.querySelector('.vendorTileFooter__capacity');
                            var capacityEl = capacityContainerEl === null || capacityContainerEl === void 0 ? void 0 : capacityContainerEl.querySelector('span:last-child');
                            var descriptionEl = el.querySelector('.vendorTile__description, .vendor-description');
                            var linkEl = el.querySelector('.vendorTile a[href*="/"]');
                            var typeEl = el.querySelector('.vendorTile__subtitle, .vendor-type');
                            // Récupérer toutes les images du slider
                            var sliderImages = Array.from(el.querySelectorAll('.vendorTileGallery__image, .vendorTileGallery picture source'))
                                .map(function (element) {
                                var _a, _b;
                                if (element instanceof HTMLSourceElement) {
                                    var srcset = element.getAttribute('data-srcset') || element.getAttribute('srcset');
                                    console.log('Source element srcset:', srcset);
                                    return (_b = (_a = srcset === null || srcset === void 0 ? void 0 : srcset.split(',')[0]) === null || _a === void 0 ? void 0 : _a.trim()) === null || _b === void 0 ? void 0 : _b.split(' ')[0];
                                }
                                else {
                                    var dataSrc = element.getAttribute('data-lazy') || element.getAttribute('data-src');
                                    var src = element.getAttribute('src');
                                    console.log('Image element:', { dataSrc: dataSrc, src: src });
                                    return dataSrc || src;
                                }
                            })
                                .filter(Boolean);
                            // Vérifier si on a trouvé des images, sinon essayer d'autres sélecteurs
                            if (sliderImages.length === 0) {
                                console.log('Aucune image trouvée avec les sélecteurs principaux, essai des sélecteurs alternatifs...');
                                var alternativeImages = Array.from(el.querySelectorAll('.vendorTileGallery img[src], .vendorTileGallery img[data-src]'))
                                    .map(function (img) {
                                    var src = img.getAttribute('data-src') || img.getAttribute('src');
                                    console.log('Image alternative trouvée:', src);
                                    return src;
                                })
                                    .filter(Boolean);
                                if (alternativeImages.length > 0) {
                                    console.log("".concat(alternativeImages.length, " images alternatives trouv\u00E9es"));
                                    sliderImages.push.apply(sliderImages, alternativeImages);
                                }
                            }
                            console.log("Total images trouv\u00E9es: ".concat(sliderImages.length));
                            // Logger chaque élément pour déboguer avec plus de détails
                            var logElement = function (name, el, container) {
                                var _a;
                                if (container === void 0) { container = null; }
                                console.log("\nD\u00E9bug ".concat(name, ":"));
                                if (container) {
                                    console.log('Container HTML:', container.outerHTML);
                                }
                                if (el) {
                                    console.log('Element trouvé:', {
                                        text: (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                                        html: el.outerHTML,
                                        classes: el.className,
                                        attributes: Object.fromEntries(Array.from(el.attributes).map(function (attr) { return [attr.name, attr.value]; }))
                                    });
                                }
                                else {
                                    console.log('Element non trouvé');
                                }
                            };
                            // Logger tous les éléments avec leurs attributs
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
                            // Extraire le prix et la capacité depuis le texte
                            var priceText = ((_a = priceEl === null || priceEl === void 0 ? void 0 : priceEl.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = priceContainerEl === null || priceContainerEl === void 0 ? void 0 : priceContainerEl.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || '';
                            var capacityText = ((_c = capacityEl === null || capacityEl === void 0 ? void 0 : capacityEl.textContent) === null || _c === void 0 ? void 0 : _c.trim()) || ((_d = capacityContainerEl === null || capacityContainerEl === void 0 ? void 0 : capacityContainerEl.textContent) === null || _d === void 0 ? void 0 : _d.trim()) || '';
                            var data = {
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
                        })];
                case 17:
                    data = _b.sent();
                    console.log('\nDonnées extraites:', data);
                    if (!data.url) return [3 /*break*/, 29];
                    console.log("\nExtraction des d\u00E9tails pour ".concat(data.name || 'établissement inconnu', "..."));
                    _a = data.location.split(',').map(function (s) { return s.trim(); }), city = _a[0], region = _a[1];
                    type = determineVenueType(data.url);
                    if (data.type) {
                        // Mapper le type depuis le texte de la carte vers l'enum
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
                    return [4 /*yield*/, page.context().newPage()];
                case 18:
                    newPage = _b.sent();
                    _b.label = 19;
                case 19:
                    _b.trys.push([19, 25, 27, 29]);
                    return [4 /*yield*/, newPage.goto(data.url, PAGE_OPTIONS)];
                case 20:
                    _b.sent();
                    return [4 /*yield*/, newPage.waitForLoadState('networkidle')];
                case 21:
                    _b.sent();
                    return [4 /*yield*/, newPage.waitForTimeout(2000)];
                case 22:
                    _b.sent();
                    return [4 /*yield*/, getFullDescription(newPage)];
                case 23:
                    fullDescription = _b.sent();
                    venue = {
                        url: data.url,
                        name: data.name,
                        type: type,
                        description: fullDescription || data.description,
                        images: data.images,
                        price: data.price,
                        address: data.location,
                        city: city || '',
                        region: region || '',
                        capacity: data.capacity,
                        rating: "".concat(data.rating, " (").concat(data.reviews, ")")
                    };
                    // Sauvegarder immédiatement après chaque établissement
                    return [4 /*yield*/, saveData([venue])];
                case 24:
                    // Sauvegarder immédiatement après chaque établissement
                    _b.sent();
                    venues.push(venue);
                    console.log("\nLieu ajout\u00E9 et sauvegard\u00E9: ".concat(venue.name));
                    console.log('Description:', venue.description.substring(0, 200) + '...');
                    console.log("Images: ".concat(venue.images.length));
                    return [3 /*break*/, 29];
                case 25:
                    error_3 = _b.sent();
                    console.log("Erreur lors de l'extraction des d\u00E9tails:", error_3);
                    venue = {
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
                        rating: "".concat(data.rating, " (").concat(data.reviews, ")")
                    };
                    // Sauvegarder immédiatement même en cas d'erreur
                    return [4 /*yield*/, saveData([venue])];
                case 26:
                    // Sauvegarder immédiatement même en cas d'erreur
                    _b.sent();
                    venues.push(venue);
                    console.log("Lieu ajout\u00E9 et sauvegard\u00E9 avec donn\u00E9es de base: ".concat(venue.name));
                    return [3 /*break*/, 29];
                case 27: return [4 /*yield*/, newPage.close()];
                case 28:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 29:
                    if (!(venues.length % 100 === 0)) return [3 /*break*/, 31];
                    console.log("\n=== ".concat(venues.length, " \u00E9tablissements trait\u00E9s sur ").concat(TOTAL_ITEMS, " ==="));
                    // Sauvegarder régulièrement les données
                    return [4 /*yield*/, saveData(venues)];
                case 30:
                    // Sauvegarder régulièrement les données
                    _b.sent();
                    _b.label = 31;
                case 31: return [3 /*break*/, 33];
                case 32:
                    error_4 = _b.sent();
                    console.log('Erreur lors du traitement de la carte:', error_4);
                    return [3 /*break*/, 33];
                case 33:
                    i++;
                    return [3 /*break*/, 14];
                case 34:
                    if (!(currentPage < TOTAL_PAGES)) return [3 /*break*/, 36];
                    waitTime = Math.random() * 3000 + 2000;
                    console.log("\nAttente de ".concat(Math.round(waitTime / 1000), "s avant la page suivante..."));
                    return [4 /*yield*/, page.waitForTimeout(waitTime)];
                case 35:
                    _b.sent();
                    _b.label = 36;
                case 36:
                    currentPage++;
                    return [3 /*break*/, 2];
                case 37: return [3 /*break*/, 40];
                case 38:
                    error_5 = _b.sent();
                    console.log('Erreur lors du scraping:', error_5);
                    return [4 /*yield*/, autoDebug(page, error_5, 'Erreur générale')];
                case 39:
                    _b.sent();
                    return [3 /*break*/, 40];
                case 40:
                    console.log("\nTotal: ".concat(venues.length, " lieux trouv\u00E9s"));
                    return [2 /*return*/, venues];
            }
        });
    });
}
function saveData(venues) {
    return __awaiter(this, void 0, void 0, function () {
        var outputPath, existingData_1, fileContent, parsed, newVenues, dataDir;
        var _a;
        return __generator(this, function (_b) {
            try {
                outputPath = path.join(process.cwd(), 'data/venues.json');
                existingData_1 = { venues: [] };
                if (fs.existsSync(outputPath)) {
                    try {
                        fileContent = fs.readFileSync(outputPath, 'utf8');
                        parsed = JSON.parse(fileContent);
                        existingData_1 = {
                            venues: Array.isArray(parsed.venues) ? parsed.venues :
                                Array.isArray(parsed) ? parsed : []
                        };
                    }
                    catch (error) {
                        console.log('Erreur lors de la lecture du fichier existant, création d\'un nouveau fichier');
                    }
                }
                newVenues = venues.filter(function (newVenue) {
                    // Vérifier si l'établissement existe déjà (même nom et même ville)
                    var exists = existingData_1.venues.some(function (existingVenue) {
                        return existingVenue.name.toLowerCase().trim() === newVenue.name.toLowerCase().trim() &&
                            existingVenue.city.toLowerCase().trim() === newVenue.city.toLowerCase().trim();
                    });
                    if (exists) {
                        console.log("\u26A0\uFE0F \u00C9tablissement d\u00E9j\u00E0 existant, ignor\u00E9: ".concat(newVenue.name, " \u00E0 ").concat(newVenue.city));
                        return false;
                    }
                    return true;
                });
                if (newVenues.length === 0) {
                    console.log('Aucun nouvel établissement à ajouter');
                    return [2 /*return*/];
                }
                // Ajouter les nouvelles données
                (_a = existingData_1.venues).push.apply(_a, newVenues);
                dataDir = path.join(process.cwd(), 'data');
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                    console.log('Dossier data créé');
                }
                // Sauvegarder toutes les données
                fs.writeFileSync(outputPath, JSON.stringify(existingData_1, null, 2));
                console.log("Donn\u00E9es sauvegard\u00E9es dans ".concat(outputPath));
                console.log("".concat(newVenues.length, " nouveaux \u00E9tablissements ajout\u00E9s, total: ").concat(existingData_1.venues.length));
            }
            catch (error) {
                console.error('Erreur lors de la sauvegarde:', error);
            }
            return [2 /*return*/];
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var browser, context, page, venues, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, playwright_1.chromium.launch({
                        headless: false,
                        args: [
                            '--disable-blink-features=AutomationControlled',
                            '--disable-features=IsolateOrigins,site-per-process',
                            '--no-sandbox',
                            '--disable-setuid-sandbox'
                        ]
                    }).catch(function (error) {
                        console.error('Erreur lors du lancement du navigateur:', error);
                        throw error;
                    })];
                case 1:
                    browser = _a.sent();
                    return [4 /*yield*/, browser.newContext(__assign(__assign({}, CONTEXT_OPTIONS), { bypassCSP: true })).catch(function (error) {
                            console.error('Erreur lors de la création du contexte:', error);
                            throw error;
                        })];
                case 2:
                    context = _a.sent();
                    return [4 /*yield*/, context.grantPermissions(['geolocation'])];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, context.addInitScript(function () {
                            Object.defineProperty(navigator, 'webdriver', { get: function () { return false; } });
                            Object.defineProperty(navigator, 'plugins', { get: function () { return [1, 2, 3, 4, 5]; } });
                            Object.defineProperty(navigator, 'languages', { get: function () { return ['fr-FR', 'fr', 'en-US', 'en']; } });
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, context.newPage().catch(function (error) {
                            console.error('Erreur lors de la création de la page:', error);
                            throw error;
                        })];
                case 5:
                    page = _a.sent();
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 11, 13, 15]);
                    console.log('Démarrage du scraping...');
                    // Visiter la page d'accueil pour initialiser la session
                    console.log('Visite de la page d\'accueil pour initialiser la session...');
                    return [4 /*yield*/, page.goto('https://www.mariages.net', { waitUntil: 'networkidle' })];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(5000)];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, scrapeListPage(page)];
                case 9:
                    venues = _a.sent();
                    // Sauvegarder les données
                    return [4 /*yield*/, saveData(venues)];
                case 10:
                    // Sauvegarder les données
                    _a.sent();
                    return [3 /*break*/, 15];
                case 11:
                    error_6 = _a.sent();
                    console.error('Erreur:', error_6);
                    return [4 /*yield*/, autoDebug(page, error_6, 'Erreur générale main')];
                case 12:
                    _a.sent();
                    return [3 /*break*/, 15];
                case 13: return [4 /*yield*/, browser.close().catch(console.error)];
                case 14:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 15: return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
