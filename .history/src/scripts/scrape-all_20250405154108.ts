/// <reference lib="dom" />
import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from 'playwright';
import { WeddingVenueType } from '../enums/wedding-venues.enum';

// Types
interface VenueData {
  url: string;
  name: string;
  type: WeddingVenueType;
  description: string;
  images: string[];
  price: string;
  address: string;
  city: string;
  region: string;
  capacity: string;
  rating: string;
}

// Types de debug
interface DebugAttempt {
  selector: string;
  error: string;
  html: string;
  timestamp: Date;
}

// Fonction pour déterminer le type d'établissement
function determineVenueType(url: string): WeddingVenueType {
  if (url.includes('/chateau-mariage/')) return WeddingVenueType.CASTLE;
  if (url.includes('/domaine-mariage/')) return WeddingVenueType.DOMAIN;
  if (url.includes('/salle-mariage/')) return WeddingVenueType.RECEPTION_HALL;
  if (url.includes('/hotel-mariage/')) return WeddingVenueType.HOTEL;
  if (url.includes('/restaurant-mariage/')) return WeddingVenueType.RESTAURANT;
  if (url.includes('/bateau-mariage/')) return WeddingVenueType.BOAT;
  if (url.includes('/plage/')) return WeddingVenueType.BEACH;
  if (url.includes('/chapiteau-mariage/')) return WeddingVenueType.MARQUEE;
  if (url.includes('/auberge-mariage/')) return WeddingVenueType.INN;
  return WeddingVenueType.DOMAIN; // Par défaut, on considère que c'est un domaine
}

// Options de la page
const PAGE_OPTIONS = {
  waitUntil: 'networkidle' as const,
  timeout: 120000, // 2 minutes
};

// Options du contexte
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

// Fonction pour analyser et corriger les erreurs automatiquement
async function autoDebug(page: Page, error: Error | string, context: string): Promise<{ fixed: boolean; solution?: string }> {
  console.log('\n=== Débogage Automatique ===');
  console.log(`Contexte: ${context}`);
  console.log(`Erreur: ${error}`);

  const debugAttempts: DebugAttempt[] = [];
  const html = await page.content();

  // Liste des sélecteurs alternatifs à essayer
  const alternativeSelectors = [
    { original: '.app-list-directory-item', alternatives: [
      '.directory-list-item',
      '.listingCard',
      '.vendorTile',
      'article[data-type="business"]',
      '.business-card',
      '.venue-item'
    ]},
    { original: '.storefrontHeading__title', alternatives: [
      'h1',
      '.venue-name',
      '.business-name',
      '.header-title'
    ]},
    { original: '.storefrontHeading__price', alternatives: [
      '.price',
      '.venue-price',
      '.business-price',
      '[data-price]'
    ]},
    { original: '.storefrontHeading__address', alternatives: [
      '.address',
      '.venue-address',
      '.business-address',
      '[data-address]'
    ]}
  ];

  // Vérifier si l'erreur est liée à un sélecteur
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
        } catch (e) {
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

  // Si l'erreur est liée au chargement de la page
  if (error.toString().includes('timeout') || error.toString().includes('navigation')) {
    console.log('\nTentative de correction des problèmes de chargement...');
    try {
      await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(10000);
      return {
        fixed: true,
        solution: 'Page rechargée avec un délai plus long'
      };
    } catch (e) {
      console.log('Échec de la tentative de rechargement:', e);
    }
  }

  // Enregistrer les tentatives de débogage pour analyse
  const debugLog = path.join(__dirname, '../../data/debug_log.json');
  fs.writeFileSync(debugLog, JSON.stringify(debugAttempts, null, 2));
  
  console.log('\n❌ Impossible de corriger automatiquement l\'erreur');
  console.log('Journal de débogage enregistré dans:', debugLog);
  
  return { fixed: false };
}

async function scrapeListPage(page: Page): Promise<string[]> {
  let allLinks: string[] = [];
  const currentPage = 1;
  const totalPages = 1; // DEV MODE: une seule page pour le développement

  console.log(`\nMode développement: scraping limité à ${totalPages} page(s)`);

  try {
    const url = 'https://www.mariages.net/reception/france';
    console.log('Navigation vers:', url);
    
    await page.goto(url, PAGE_OPTIONS).catch(async (error) => {
      const debug = await autoDebug(page, error, 'Navigation vers la page');
      if (!debug.fixed) throw error;
    });

    console.log('Page chargée, attente du contenu...');
    
    await page.waitForLoadState('networkidle');
    console.log('Réseau stable, attente supplémentaire...');
    
    await page.waitForTimeout(5000);
    console.log('Recherche des éléments...');

    // Vérifier si on a des éléments avec différents sélecteurs
    const selectors = [
      '.directory-list-item',
      '.app-directory-list-item',
      '.listingCard',
      '.vendorTile'
    ];

    let foundSelector = null;
    for (const selector of selectors) {
      try {
        const count = await page.$$eval(selector, elements => elements.length);
        console.log(`Sélecteur "${selector}": ${count} éléments trouvés`);
        if (count > 0) {
          foundSelector = selector;
          break;
        }
      } catch (error) {
        const debug = await autoDebug(page, error, `Test du sélecteur ${selector}`);
        if (debug.fixed && debug.solution) {
          foundSelector = debug.solution.split('"')[3]; // Extraire le nouveau sélecteur
          break;
        }
      }
    }

    if (foundSelector) {
      try {
        const links = await page.$$eval(`${foundSelector} a[href*="/"]`, (elements) => {
          return elements
            .map((e) => e.getAttribute('href'))
            .filter((href): href is string => href !== null && href.includes('/'))
            .map(href => {
              if (href.startsWith('http')) return href;
              return `https://www.mariages.net${href}`;
            });
        });

        allLinks = [...new Set(links)];
        console.log(`\n✓ ${allLinks.length} liens extraits avec le sélecteur "${foundSelector}"`);
      } catch (error) {
        const debug = await autoDebug(page, error, 'Extraction des liens');
        if (!debug.fixed) throw error;
      }
    }

    // Si aucun lien trouvé, lancer le débogage
    if (allLinks.length === 0) {
      await autoDebug(page, 'Aucun lien trouvé', 'Vérification finale');
    } else {
      // Afficher les statistiques
      const pageStats = new Map<WeddingVenueType, number>();
      allLinks.forEach(link => {
        const type = determineVenueType(link);
        pageStats.set(type, (pageStats.get(type) || 0) + 1);
      });
      
      console.log(`\nPage ${currentPage}: ${allLinks.length} liens trouvés`);
      pageStats.forEach((count, type) => {
        console.log(`  - ${type}: ${count}`);
      });
    }

  } catch (error) {
    console.log('Erreur lors du scraping:', error);
    await autoDebug(page, error, 'Erreur générale');
  }

  console.log(`\nTotal final: ${allLinks.length} établissements trouvés sur ${totalPages} page(s)`);
  return allLinks;
}

async function scrapeVenuePage(page: Page, url: string): Promise<VenueData | null> {
  try {
    console.log(`\nScraping de ${url}...`);
    
    await page.goto(url, PAGE_OPTIONS).catch(async (error) => {
      const debug = await autoDebug(page, error, 'Navigation vers la page établissement');
      if (!debug.fixed) throw error;
    });

    // Fonction utilitaire pour extraire le texte avec débogage automatique
    const getTextContent = async (selector: string, fieldName: string, defaultValue: string = '') => {
      try {
        const element = await page.waitForSelector(selector, { timeout: 10000 });
        const text = element ? (await element.textContent() || defaultValue) : defaultValue;
        console.log(`${fieldName}: ${text}`);
        return text;
      } catch (error) {
        const debug = await autoDebug(page, error, `Extraction de ${fieldName}`);
        if (debug.fixed && debug.solution) {
          const newSelector = debug.solution.split('"')[3];
          const element = await page.waitForSelector(newSelector, { timeout: 10000 });
          const text = element ? (await element.textContent() || defaultValue) : defaultValue;
          console.log(`${fieldName} (corrigé): ${text}`);
          return text;
        }
        console.log(`Erreur lors de l'extraction de ${fieldName}`);
        return defaultValue;
      }
    };

    // Fonction utilitaire pour extraire les images avec logging
    const getImages = async () => {
      try {
        // Attendre que le slider soit chargé
        await page.waitForSelector('.storefrontMultiGallery', { timeout: 10000 });
        
        // Récupérer toutes les images du slider
        const images = await page.$$eval('.storefrontMultiGallery img', (elements) => {
          return elements
            .map((img) => (img as HTMLImageElement).src)
            .filter(src => src && !src.includes('data:image')) // Filtrer les images en base64 et vides
            .filter(Boolean);
        });

        console.log(`Images trouvées dans le slider: ${images.length}`);
        return images;
      } catch (error) {
        console.log(`Erreur lors de l'extraction des images: ${error}`);
        return [];
      }
    };

    // Extraction des données avec les nouveaux sélecteurs et alternatives
    const name = await getTextContent('h1.storefrontHeading__title', 'Nom');
    const type = determineVenueType(url);
    const description = await getTextContent('#layoutMain > article > div.storefrontContent > div.storefrontSummary > section > div.storefrontDescription__content.app-storefront-description-readMore.truncate-overflow.truncate-overflow--withShadow', 'Description');
    const price = await getTextContent('.storefrontHeading__price', 'Prix');
    const address = await getTextContent('.storefrontHeading__address', 'Adresse');
    const capacity = await getTextContent('#layoutMain > article > aside.storefrontHeadingWrap > header > div.storefrontHeadingFaqs > div:nth-child(2) > span', 'Capacité');
    const rating = await getTextContent('#layoutMain > article > aside.storefrontHeadingWrap > header > div.storefrontHeading__content > div.storefrontHeadingReviews > a:nth-child(1) > span > strong', 'Note');
    const images = await getImages();

    // Extraire la ville et la région de l'adresse
    const addressParts = address.split(',').map(s => s.trim());
    const city = addressParts[0] || '';
    const region = addressParts[addressParts.length - 1] || '';

    const data = {
      url,
      name: name.trim(),
      type: type,
      description: description.trim(),
      images,
      price: price.trim(),
      address: address.trim(),
      city,
      region,
      capacity: capacity.trim(),
      rating: rating.trim(),
    };

    console.log('Données extraites avec succès:', JSON.stringify(data, null, 2));
    return data;

  } catch (error) {
    console.error(`Erreur lors du scraping de ${url}:`, error);
    return null;
  }
}

async function saveData(venues: VenueData[]) {
  const outputPath = path.join(__dirname, '../../data/venues.json');
  fs.writeFileSync(outputPath, JSON.stringify(venues, null, 2));
  console.log('Données sauvegardées dans:', outputPath);
}

async function main() {
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  const context = await browser.newContext({
    ...CONTEXT_OPTIONS,
    bypassCSP: true,
  });
  
  // Modifier les permissions
  await context.grantPermissions(['geolocation']);
  
  // Ajouter des scripts pour masquer l'automatisation
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
  });

  const page = await context.newPage();

  try {
    console.log('Démarrage du scraping...');
    
    // Visiter la page d'accueil pour initialiser la session
    console.log('Visite de la page d\'accueil pour initialiser la session...');
    await page.goto('https://www.mariages.net', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Scraper la liste des établissements
    const links = await scrapeListPage(page);
    
    // Afficher les statistiques par type
    const statsByType = new Map<WeddingVenueType, number>();
    links.forEach(link => {
      const type = determineVenueType(link);
      statsByType.set(type, (statsByType.get(type) || 0) + 1);
    });

    console.log('\n=== Statistiques par type ===');
    statsByType.forEach((count, type) => {
      console.log(`${type}: ${count} établissements`);
    });
    console.log(`\nTotal: ${links.length} établissements trouvés`);
    
    // Scraper les détails de chaque lieu
    const venues: VenueData[] = [];
    for (const link of links) {
      const venueData = await scrapeVenuePage(page, link);
      if (venueData) {
        venues.push(venueData);
      }
      await page.waitForTimeout(5000); // 5 secondes entre chaque requête
    }

    // Sauvegarder les données
    await saveData(venues);
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);