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
const playwright_1 = require("playwright");
const wedding_venues_enum_1 = require("../enums/wedding-venues.enum");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const LOCK_FILE = path.join(__dirname, 'playwright.lock');
async function checkPlaywrightLock() {
    try {
        if (fs.existsSync(LOCK_FILE)) {
            const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
            const now = Date.now();
            if (now - lockData.timestamp < 3600000) {
                return true;
            }
        }
        return false;
    }
    catch (error) {
        return false;
    }
}
async function createPlaywrightLock() {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ timestamp: Date.now() }));
}
async function removePlaywrightLock() {
    if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE);
    }
}
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
    },
    ignoreHTTPSErrors: true,
    javaScriptEnabled: true,
};
async function main() {
    const isLocked = await checkPlaywrightLock();
    if (isLocked) {
        console.log('⚠️ Une autre instance de Playwright est déjà en cours d\'exécution.');
        console.log('Veuillez attendre que l\'autre script soit terminé ou supprimer le fichier playwright.lock s\'il est obsolète.');
        return;
    }
    await createPlaywrightLock();
    const browser = await playwright_1.chromium.launch({ headless: false });
    const context = await browser.newContext(CONTEXT_OPTIONS);
    const page = await context.newPage();
    try {
        await page.goto('https://www.mariages.net/busc.php?id_grupo=1&showmode=list&NumPage=1', {
            waitUntil: 'networkidle',
            timeout: 60000,
        });
        try {
            await page.click('#didomi-notice-agree-button');
            await page.waitForTimeout(1000);
        }
        catch (e) {
            console.log('Pas de popup de cookies ou déjà accepté');
        }
        const venueUrls = await page.$$eval('.app-list-directory-item a.gtm-business-list-link', (links) => links.slice(0, 5).map((link) => link.href));
        const contacts = [];
        for (const [index, url] of venueUrls.entries()) {
            console.log(`\nVisite de l'établissement ${index + 1}/5: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(2000);
            try {
                await page.click('.app-business-contact-button');
                await page.waitForTimeout(1000);
                const contactData = {
                    name: await page.$eval('.storefrontHeading__title', (el) => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; }),
                    type: url.includes('/chateau-mariage/') ? wedding_venues_enum_1.WeddingVenueType.CASTLE : wedding_venues_enum_1.WeddingVenueType.DOMAIN,
                    email: await page.$eval('.app-business-contact-email', (el) => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || 'Non disponible'; }),
                    phone: await page.$eval('.app-business-contact-phone', (el) => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || 'Non disponible'; }),
                    contactPerson: await page.$eval('.app-business-contact-name', (el) => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || 'Non disponible'; }),
                    url
                };
                contacts.push(contactData);
                console.log('✅ Informations récupérées avec succès');
            }
            catch (error) {
                console.log('❌ Erreur lors de la récupération des informations:', error);
                contacts.push({
                    name: await page.$eval('.storefrontHeading__title', (el) => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; }),
                    type: url.includes('/chateau-mariage/') ? wedding_venues_enum_1.WeddingVenueType.CASTLE : wedding_venues_enum_1.WeddingVenueType.DOMAIN,
                    email: 'Non disponible',
                    phone: 'Non disponible',
                    contactPerson: 'Non disponible',
                    url
                });
            }
            await page.waitForTimeout(Math.random() * 2000 + 1000);
        }
        console.log('\n=== Résultats ===');
        contacts.forEach((contact, index) => {
            console.log(`\n${index + 1}. ${contact.name} (${contact.type})`);
            console.log(`   Contact: ${contact.contactPerson}`);
            console.log(`   Email: ${contact.email}`);
            console.log(`   Téléphone: ${contact.phone}`);
            console.log(`   URL: ${contact.url}`);
        });
    }
    catch (error) {
        console.error('Erreur principale:', error);
    }
    finally {
        await browser.close();
        await removePlaywrightLock();
    }
}
main().catch(console.error);
//# sourceMappingURL=get-contacts.js.map