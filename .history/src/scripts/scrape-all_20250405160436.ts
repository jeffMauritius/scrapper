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

async function getFullDescription(page: Page): Promise<string> {
  try {
    // Attendre que la description soit chargée
    await page.waitForSelector('.storefrontDescription__content', { timeout: 10000 });
    
    // Récupérer la description complète
    const description = await page.$eval(
      '.storefrontDescription__content', 
      el => el.textContent?.trim() || ''
    );

    return description;
  } catch (error) {
    console.log('Erreur lors de la récupération de la description complète:', error);
    return '';
  }
}

async function scrapeListPage(page: Page): Promise<VenueData[]> {
  const venues: VenueData[] = [];
  const currentPage = 1;
  const totalPages = 1;

  try {
    const url = 'https://www.mariages.net/reception/france';
    console.log('Navigation vers:', url);
    
    await page.goto(url, PAGE_OPTIONS).catch(async (error) => {
      const debug = await autoDebug(page, error, 'Navigation vers la page');
      if (!debug.fixed) throw error;
    });

    console.log('Page chargée, attente du contenu...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(5000);

    const cards = await page.$$('.app-catalog-list-directory article');
    console.log(`${cards.length} cartes trouvées`);

    for (const card of cards) {
      try {
        // Extraire toutes les informations de base depuis la carte
        const data = await card.evaluate((el) => {
          const nameEl = el.querySelector('h2.vendorTile__title');
          const ratingEl = el.querySelector('.vendorTile__rating strong');
          const reviewsEl = el.querySelector('.vendorTile__rating .rating-counter');
          const locationEl = el.querySelector('.vendorTile__location');
          const priceEl = el.querySelector('.vendorTile__price');
          const capacityEl = el.querySelector('.vendorTile__capacity');
          const descriptionEl = el.querySelector('.vendorTile__description');
          const linkEl = el.querySelector('a.vendorTileHeader') as HTMLAnchorElement;
          const imageEl = el.querySelector('.vendorTile__image img') as HTMLImageElement;
          const typeEl = el.querySelector('.vendorTile__category');

          return {
            name: nameEl?.textContent?.trim() || '',
            rating: ratingEl?.textContent?.trim() || '',
            reviews: reviewsEl?.textContent?.trim().replace(/[()]/g, '') || '',
            location: locationEl?.textContent?.trim() || '',
            price: priceEl?.textContent?.trim() || '',
            capacity: capacityEl?.textContent?.trim() || '',
            description: descriptionEl?.textContent?.trim() || '',
            url: linkEl?.href || '',
            image: imageEl?.src || '',
            type: typeEl?.textContent?.trim() || ''
          };
        });

        if (data.url) {
          console.log(`\nExtraction des détails pour ${data.name}...`);
          
          // Extraire la ville et la région
          const [city, region] = data.location.split(',').map(s => s.trim());
          
          // Déterminer le type depuis la carte
          let type = determineVenueType(data.url);
          if (data.type) {
            // Mapper le type depuis le texte de la carte vers l'enum
            switch (data.type.toLowerCase()) {
              case 'domaine':
                type = WeddingVenueType.DOMAIN;
                break;
              case 'auberge':
                type = WeddingVenueType.INN;
                break;
              case 'hôtel':
                type = WeddingVenueType.HOTEL;
                break;
              case 'restaurant':
                type = WeddingVenueType.RESTAURANT;
                break;
              case 'salle':
                type = WeddingVenueType.RECEPTION_HALL;
                break;
              case 'château':
                type = WeddingVenueType.CASTLE;
                break;
              case 'bateau':
                type = WeddingVenueType.BOAT;
                break;
              case 'plage':
                type = WeddingVenueType.BEACH;
                break;
              case 'chapiteau':
                type = WeddingVenueType.MARQUEE;
                break;
            }
          }

          // Ouvrir la page détaillée dans un nouvel onglet juste pour la description et les images
          const newPage = await page.context().newPage();
          try {
            await newPage.goto(data.url, PAGE_OPTIONS);
            await newPage.waitForLoadState('networkidle');
            await newPage.waitForTimeout(2000);

            // Récupérer la description complète
            const fullDescription = await getFullDescription(newPage);

            const venue: VenueData = {
              url: data.url,
              name: data.name,
              type,
              description: fullDescription || data.description, // Utiliser la description complète, sinon celle de la carte
              images: [data.image].filter(Boolean), // Utiliser l'image de la carte
              price: data.price,
              address: data.location,
              city: city || '',
              region: region || '',
              capacity: data.capacity,
              rating: `${data.rating} (${data.reviews})`
            };

            venues.push(venue);
            console.log(`\nLieu ajouté: ${venue.name}`);
            console.log('Description:', venue.description.substring(0, 200) + '...');
            console.log(`Images: ${venue.images.length}`);

          } catch (error) {
            console.log(`Erreur lors de l'extraction des détails:`, error);
            // En cas d'erreur, on utilise les données de base de la carte
            const venue: VenueData = {
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
            venues.push(venue);
            console.log(`Lieu ajouté avec données de base: ${venue.name}`);
          } finally {
            await newPage.close();
          }
        }

      } catch (error) {
        console.log('Erreur lors de l\'extraction des données:', error);
      }
    }

  } catch (error) {
    console.log('Erreur lors du scraping:', error);
    await autoDebug(page, error, 'Erreur générale');
  }

  console.log(`\nTotal: ${venues.length} lieux trouvés`);
  return venues;
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

    // Fonction utilitaire pour extraire les images avec débogage automatique
    const getImages = async () => {
      try {
        // Attendre que le slider soit chargé
        await page.waitForSelector('.storefrontMultiGallery', { timeout: 10000 }).catch(async (error) => {
          const debug = await autoDebug(page, error, 'Attente du slider');
          if (!debug.fixed) throw error;
        });
        
        // Récupérer toutes les images du slider
        const images = await page.$$eval('.storefrontMultiGallery img', (elements) => {
          return elements
            .map((img) => (img as HTMLImageElement).src)
            .filter(src => src && !src.includes('data:image'))
            .filter(Boolean);
        }).catch(async (error) => {
          const debug = await autoDebug(page, error, 'Extraction des images');
          if (debug.fixed && debug.solution) {
            const newSelector = debug.solution.split('"')[3];
            return page.$$eval(`${newSelector} img`, (elements) => {
              return elements
                .map((img) => (img as HTMLImageElement).src)
                .filter(src => src && !src.includes('data:image'))
                .filter(Boolean);
            });
          }
          throw error;
        });

        console.log(`Images trouvées: ${images.length}`);
        return images;
      } catch (error) {
        console.log(`Erreur lors de l'extraction des images: ${error}`);
        await autoDebug(page, error, 'Extraction des images (erreur générale)');
        return [];
      }
    };

    // Extraction des données avec débogage automatique
    const name = await getTextContent('h1.storefrontHeading__title', 'Nom');
    const type = determineVenueType(url);
    const description = await getTextContent('#layoutMain > article > div.storefrontContent > div.storefrontSummary > section > div.storefrontDescription__content', 'Description');
    const price = await getTextContent('.storefrontHeading__price', 'Prix');
    const address = await getTextContent('.storefrontHeading__address', 'Adresse');
    const capacity = await getTextContent('.storefrontHeading__capacity', 'Capacité');
    const rating = await getTextContent('.storefrontHeading__rating', 'Note');
    const images = await getImages();

    // Extraire la ville et la région de l'adresse avec gestion d'erreur
    let city = '';
    let region = '';
    try {
      const addressParts = address.split(',').map(s => s.trim());
      city = addressParts[0] || '';
      region = addressParts[addressParts.length - 1] || '';
    } catch (error) {
      console.log('Erreur lors de l\'extraction ville/région:', error);
      await autoDebug(page, error, 'Extraction ville/région');
    }

    const data = {
      url,
      name: name.trim(),
      type,
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
    await autoDebug(page, error, 'Erreur générale scrapeVenuePage');
    return null;
  }
}

async function saveData(venues: VenueData[]) {
  try {
    const outputPath = path.join(__dirname, '../../data/venues.json');
    fs.writeFileSync(outputPath, JSON.stringify(venues, null, 2));
    console.log('Données sauvegardées dans:', outputPath);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Dossier data créé');
      // Réessayer la sauvegarde
      fs.writeFileSync(path.join(dataDir, 'venues.json'), JSON.stringify(venues, null, 2));
      console.log('Données sauvegardées après création du dossier');
    }
  }
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
  }).catch(error => {
    console.error('Erreur lors du lancement du navigateur:', error);
    throw error;
  });

  const context = await browser.newContext({
    ...CONTEXT_OPTIONS,
    bypassCSP: true,
  }).catch(error => {
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
    
    // Visiter la page d'accueil pour initialiser la session
    console.log('Visite de la page d\'accueil pour initialiser la session...');
    await page.goto('https://www.mariages.net', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Scraper directement les lieux
    const venues = await scrapeListPage(page);
    
    // Sauvegarder les données
    await saveData(venues);
  } catch (error) {
    console.error('Erreur:', error);
    await autoDebug(page, error, 'Erreur générale main');
  } finally {
    await browser.close().catch(console.error);
  }
}

main().catch(console.error);