/// <reference lib="dom" />
import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from 'playwright';
import { VendorType } from '../enums/vendors.enum';

// Types
interface VendorData {
  url: string;
  name: string;
  type: VendorType;
  description: string;
  images: string[];
  price: string;
  address: string;
  city: string;
  region: string;
  rating: string;
  services: string[];
}

// Types de debug
interface DebugAttempt {
  selector: string;
  error: string;
  html: string;
  timestamp: Date;
}

// Fonction pour déterminer le type de prestataire
function determineVendorType(url: string): VendorType {
  if (url.includes('/photo-mariage/')) return VendorType.PHOTOGRAPHER;
  if (url.includes('/video-mariage/')) return VendorType.VIDEOGRAPHER;
  if (url.includes('/musique-mariage/')) return VendorType.MUSIC;
  if (url.includes('/traiteur-mariage/')) return VendorType.CATERER;
  if (url.includes('/fleurs-mariage/')) return VendorType.FLORIST;
  if (url.includes('/decoration-mariage/')) return VendorType.DECORATION;
  if (url.includes('/animation-mariage/')) return VendorType.ENTERTAINMENT;
  if (url.includes('/voiture-mariage/')) return VendorType.TRANSPORT;
  if (url.includes('/bijoux-mariage/')) return VendorType.JEWELRY;
  if (url.includes('/robe-mariage/')) return VendorType.DRESS;
  if (url.includes('/costume-mariage/')) return VendorType.SUIT;
  if (url.includes('/beaute-mariage/')) return VendorType.BEAUTY;
  return VendorType.OTHER;
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
      '.vendor-item'
    ]},
    { original: '.storefrontHeading__title', alternatives: [
      'h1',
      '.vendor-name',
      '.business-name',
      '.header-title'
    ]},
    { original: '.storefrontHeading__price', alternatives: [
      '.price',
      '.vendor-price',
      '.business-price',
      '[data-price]'
    ]},
    { original: '.storefrontHeading__address', alternatives: [
      '.address',
      '.vendor-address',
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

async function getVendorServices(page: Page): Promise<string[]> {
  try {
    // Attendre que les services soient chargés
    await page.waitForSelector('.storefrontServices__list', { timeout: 10000 });
    
    // Récupérer tous les services
    const services = await page.$$eval(
      '.storefrontServices__item',
      items => items.map(item => item.textContent?.trim() || '')
    );

    return services.filter(service => service !== '');
  } catch (error) {
    console.log('Erreur lors de la récupération des services:', error);
    return [];
  }
}

async function scrapeListPage(page: Page): Promise<VendorData[]> {
  const vendors: VendorData[] = [];
  const ITEMS_PER_PAGE = 24;
  const TOTAL_ITEMS = 14566; // À ajuster selon le nombre réel de vidéographes
  const TOTAL_PAGES = Math.ceil(TOTAL_ITEMS / ITEMS_PER_PAGE);
  let totalProcessed = 0;

  try {
    // Commencer depuis le début pour les vidéographes
    for (let currentPage = 1; currentPage <= TOTAL_PAGES; currentPage++) {
      const url = `https://www.mariages.net/busc.php?id_grupo=2&id_sector=9&isNearby=0&NumPage=${currentPage}`;
      console.log(`\n=== Page ${currentPage}/${TOTAL_PAGES} (${Math.round((currentPage/TOTAL_PAGES) * 100)}%) ===`);
      console.log(`Scraping des vidéographes - page ${currentPage}`);
      console.log(`Total traité: ${totalProcessed} vidéographes`);
      
      await page.goto(url, PAGE_OPTIONS).catch(async (error) => {
        const debug = await autoDebug(page, error, 'Navigation vers la page');
        if (!debug.fixed) throw error;
      });

      console.log('Page chargée, attente du contenu...');
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.waitForTimeout(5000);

      // Vérifier le HTML pour déboguer
      const html = await page.content();
      console.log('\nAnalyse de la structure de la page:');
      console.log('- Contient storefront-list:', html.includes('storefront-list'));
      console.log('- Contient directory-list-item:', html.includes('directory-list-item'));
      console.log('- Contient vendorTile:', html.includes('vendorTile'));
      
      // Nouveaux sélecteurs spécifiques aux vidéographes
      const selectors = [
        '.storefront-list .directory-list-item',
        '.app-directory-list article',
        '.vendorTile',
        '.directory-item',
        '[data-list-type="Catalog"] article',
        '.listingCard'
      ];

      let cards: Array<any> = [];
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          cards = await page.$$(selector);
          if (cards.length > 0) {
            console.log(`\nSélecteur trouvé: ${selector} (${cards.length} cartes)`);
            break;
          }
        } catch (error) {
          console.log(`Sélecteur ${selector} non trouvé`);
        }
      }

      if (cards.length === 0) {
        // Attendre un peu plus et réessayer une dernière fois avec un sélecteur plus générique
        await page.waitForTimeout(10000);
        try {
          cards = await page.$$('article');
          if (cards.length > 0) {
            console.log(`\nSélecteur de secours trouvé: article (${cards.length} cartes)`);
          }
        } catch (error) {
          console.log('Aucun sélecteur de secours trouvé');
        }

        if (cards.length === 0) {
          console.log('\nAucune carte trouvée sur cette page, passage à la suivante');
          continue;
        }
      }

      console.log(`\nTraitement des ${cards.length} cartes de la page ${currentPage}...`);

      // Traiter toutes les cartes de la page
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        try {
          console.log(`\nTraitement de la carte ${i + 1}/${cards.length} (page ${currentPage}/${TOTAL_PAGES})...`);
          
          // Vérifier que la carte est valide
          const isAttached = await card.evaluate((el: Element) => el.isConnected);
          if (!isAttached) {
            console.log('Carte non attachée au DOM, on passe à la suivante');
            continue;
          }

          // Extraire toutes les informations de base depuis la carte
          const data = await card.evaluate((el: Element) => {
            // Nouveaux sélecteurs pour les vidéographes
            const nameEl = el.querySelector('.storefront-name, .vendorTile__title, .businessCard__title, h3');
            const ratingEl = el.querySelector('.storefront-rating, .vendorTile__rating, .businessCard__rating');
            const reviewsEl = el.querySelector('.storefront-reviews-count, .rating-counter, .businessCard__reviews');
            const locationEl = el.querySelector('.storefront-location, .vendorTile__location, .businessCard__location');
            const priceEl = el.querySelector('.storefront-price, .vendorTile__price, .businessCard__price');
            const descriptionEl = el.querySelector('.storefront-description, .vendorTile__description, .businessCard__description');
            const linkEl = el.querySelector('a[href*="/video-mariage/"]') as HTMLAnchorElement;

            // Essayer tous les sélecteurs possibles pour les images
            const imageSelectors = [
              '.vendorTileGallery__image',
              '.vendorTileGallery picture source[data-srcset]',
              '.vendorTileGallery img[data-src]',
              '.vendorTileGallery img[src]'
            ];

            console.log('\nRecherche des images avec les sélecteurs:', imageSelectors);
            
            let sliderImages: string[] = [];
            
            for (const selector of imageSelectors) {
              const elements = el.querySelectorAll(selector);
              console.log(`\nSélecteur ${selector}: ${elements.length} éléments trouvés`);
              
              elements.forEach((element) => {
                let imageUrl = '';
                
                if (element instanceof HTMLSourceElement) {
                  const srcset = element.getAttribute('data-srcset') || element.getAttribute('srcset');
                  if (srcset) {
                    imageUrl = srcset.split(',')[0].trim().split(' ')[0];
                  }
                } else if (element instanceof HTMLImageElement) {
                  imageUrl = element.getAttribute('data-src') || element.getAttribute('src') || '';
                }
                
                if (imageUrl && !sliderImages.includes(imageUrl) && imageUrl.includes('mariages.net')) {
                  sliderImages.push(imageUrl);
                }
              });
              
              if (sliderImages.length > 0) break;
            }

            return {
              name: nameEl?.textContent?.trim() || '',
              rating: ratingEl?.textContent?.trim() || '',
              reviews: reviewsEl?.textContent?.trim().replace(/[()]/g, '') || '',
              location: locationEl?.textContent?.trim() || '',
              price: priceEl?.textContent?.trim() || '',
              description: descriptionEl?.textContent?.trim() || '',
              url: linkEl?.href || '',
              images: sliderImages,
              type: 'videographer'
            };
          });

          if (data.url) {
            // Extraire la ville et la région
            const [city, region] = data.location.split(',').map((s: string) => s.trim());
            
            // Ouvrir la page détaillée dans un nouvel onglet
            const newPage = await page.context().newPage();
            try {
              await newPage.goto(data.url, PAGE_OPTIONS);
              await newPage.waitForLoadState('networkidle');
              await newPage.waitForTimeout(2000);

              // Récupérer la description complète et les services
              const fullDescription = await getFullDescription(newPage);
              const services = await getVendorServices(newPage);

              const vendor: VendorData = {
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

              // Ajouter des logs détaillés
              console.log('\n=== Données extraites pour le vidéographe ===');
              console.log('Nom:', vendor.name);
              console.log('URL:', vendor.url);
              console.log('Images trouvées:', vendor.images);
              console.log('Description:', vendor.description.substring(0, 100) + '...');
              console.log('Prix:', vendor.price);
              console.log('Adresse:', vendor.address);
              console.log('Ville:', vendor.city);
              console.log('Région:', vendor.region);
              console.log('Note:', vendor.rating);
              console.log('Services:', vendor.services);
              console.log('==========================================\n');

              // Sauvegarder immédiatement après chaque vidéographe
              await saveData([vendor]);
              vendors.push(vendor);
              totalProcessed++;
              console.log(`\nVidéographe ajouté et sauvegardé: ${vendor.name}`);
              console.log('Services:', vendor.services);

            } catch (error) {
              console.log(`Erreur lors de l'extraction des détails:`, error);
              // En cas d'erreur, on utilise les données de base de la carte
              const vendor: VendorData = {
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
              console.log(`Vidéographe ajouté avec données de base: ${vendor.name}`);
            } finally {
              await newPage.close();
            }
          }

          // Sauvegarder régulièrement et afficher la progression
          if (totalProcessed % 50 === 0) {
            console.log(`\n=== ${totalProcessed}/${TOTAL_ITEMS} vidéographes traités (${Math.round((totalProcessed/TOTAL_ITEMS) * 100)}%) ===`);
            await saveData(vendors);
          }
        } catch (error) {
          console.log('Erreur lors du traitement de la carte:', error);
        }
      }

      // Attendre un peu entre chaque page pour éviter d'être bloqué
      if (currentPage < TOTAL_PAGES) {
        const waitTime = Math.random() * 5000 + 3000; // Entre 3 et 8 secondes
        console.log(`\nAttente de ${Math.round(waitTime/1000)}s avant la page suivante...`);
        await page.waitForTimeout(waitTime);
      }
    }

  } catch (error) {
    console.log('Erreur lors du scraping:', error);
    await autoDebug(page, error, 'Erreur générale');
  }

  console.log(`\nTotal final: ${vendors.length} vidéographes trouvés`);
  return vendors;
}

async function saveData(vendors: VendorData[]) {
  try {
    const outputPath = path.join(process.cwd(), 'data/photographers.json');
    
    // Lire les données existantes
    let existingData = { vendors: [] as VendorData[] };
    if (fs.existsSync(outputPath)) {
      try {
        console.log('\nLecture du fichier existant:', outputPath);
        const fileContent = fs.readFileSync(outputPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        existingData = {
          vendors: Array.isArray(parsed.vendors) ? parsed.vendors : 
                  Array.isArray(parsed) ? parsed : []
        };
        console.log('Données existantes chargées:', existingData.vendors.length, 'photographes');
      } catch (error) {
        console.log('Erreur lors de la lecture du fichier existant, création d\'un nouveau fichier');
      }
    }

    // Filtrer les nouveaux photographes pour éviter les doublons
    const newVendors = vendors.filter(newVendor => {
      const exists = existingData.vendors.some(existingVendor => 
        existingVendor.name.toLowerCase().trim() === newVendor.name.toLowerCase().trim() &&
        existingVendor.city.toLowerCase().trim() === newVendor.city.toLowerCase().trim()
      );

      if (exists) {
        console.log(`⚠️ Photographe déjà existant, ignoré: ${newVendor.name} à ${newVendor.city}`);
        return false;
      }
      console.log(`✓ Nouveau photographe à ajouter: ${newVendor.name} à ${newVendor.city}`);
      console.log('Images:', newVendor.images);
      return true;
    });

    if (newVendors.length === 0) {
      console.log('Aucun nouveau photographe à ajouter');
      return;
    }

    // Ajouter les nouvelles données
    existingData.vendors.push(...newVendors);
    
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Dossier data créé');
    }

    // Sauvegarder toutes les données
    fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2));
    console.log(`\nDonnées sauvegardées dans ${outputPath}`);
    console.log(`${newVendors.length} nouveaux photographes ajoutés, total: ${existingData.vendors.length}`);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
  }
}

async function main() {
  const browser = await chromium.launch({ 
    headless: true, // Mode headless activé
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu' // Désactive l'accélération GPU pour plus de stabilité en headless
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
    console.log('Démarrage du scraping des photographes...');
    
    // Visiter la page d'accueil pour initialiser la session
    console.log('Visite de la page d\'accueil des photographes pour initialiser la session...');
    await page.goto('https://www.mariages.net/photo-mariage', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Scraper les photographes
    const vendors = await scrapeListPage(page);
    
    // Sauvegarder les données
    await saveData(vendors);
  } catch (error) {
    console.error('Erreur:', error);
    await autoDebug(page, error, 'Erreur générale main');
  } finally {
    await browser.close().catch(console.error);
  }
}

main().catch(console.error); 