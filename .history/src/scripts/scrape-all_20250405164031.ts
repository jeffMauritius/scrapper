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

  try {
    const url = 'https://www.mariages.net/busc.php?id_grupo=1&showmode=list&NumPage=1&userSearch=1&isNearby=0&isOrganicSearch=1&priceType=menu&categoryIds[]=1&categoryIds[]=2&categoryIds[]=3&categoryIds[]=4&categoryIds[]=5&categoryIds[]=29&categoryIds[]=31&categoryIds[]=63&categoryIds[]=47';
    console.log('Navigation vers:', url);
    
    await page.goto(url, PAGE_OPTIONS).catch(async (error) => {
      const debug = await autoDebug(page, error, 'Navigation vers la page');
      if (!debug.fixed) throw error;
    });

    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('Page chargée, attente du contenu...');
    
    // Attendre plus longtemps et vérifier le contenu
    await page.waitForTimeout(10000);
    
    // Vérifier le HTML pour déboguer
    const html = await page.content();
    console.log('\nAnalyse de la structure de la page:');
    console.log('- Contient app-lista-empresas:', html.includes('app-lista-empresas'));
    console.log('- Contient listingCard:', html.includes('listingCard'));
    console.log('- Contient vendorTile:', html.includes('vendorTile'));
    console.log('- Contient empresa:', html.includes('empresa'));
    
    // Essayer différents sélecteurs
    const selectors = [
      '#app-lista-empresas article',
      '.empresa',
      'article[data-tipo]',
      'article.listingCard',
      '.vendorTile',
      'article'
    ];

    let cards: Array<any> = [];
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        cards = await page.$$(selector);
        if (cards.length > 0) {
          console.log(`\nSélecteur trouvé: ${selector} (${cards.length} cartes)`);
          
          // Vérifier la structure d'une carte
          const cardHtml = await cards[0].evaluate((el: Element) => el.outerHTML);
          console.log('\nStructure de la première carte:');
          console.log(cardHtml);
          
          break;
        }
      } catch (error) {
        console.log(`Sélecteur ${selector} non trouvé`);
      }
    }

    if (cards.length === 0) {
      console.log('\nAucun sélecteur n\'a fonctionné. Contenu de la page:');
      console.log(html.substring(0, 1000));
      throw new Error('Impossible de trouver les cartes');
    }

    console.log(`\nTraitement de toutes les ${cards.length} cartes...`);

    // Traiter toutes les cartes
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      try {
        console.log(`\nTraitement de la carte ${i + 1}/${cards.length}...`);
        
        // Vérifier que la carte est valide
        const isAttached = await card.evaluate((el: Element) => el.isConnected);
        if (!isAttached) {
          console.log('Carte non attachée au DOM, on passe à la suivante');
          continue;
        }

        // Extraire toutes les informations de base depuis la carte
        const data = await card.evaluate((el: Element) => {
          // Afficher le HTML complet de la carte pour déboguer
          console.log('\nHTML de la carte:', el.outerHTML);

          // Essayer différents sélecteurs pour chaque élément
          const nameEl = el.querySelector('.vendorTile__title, .app-vendor-tile-title, h2');
          const ratingEl = el.querySelector('.vendorTile__rating, .rating-badge, .storefront-rating');
          const reviewsEl = el.querySelector('.rating-counter, .reviewCount, .storefront-reviews-count');
          const locationEl = el.querySelector('.vendorTile__location, .vendor-location, .storefront-location');
          
          // Nouveaux sélecteurs pour le prix et la capacité
          const priceContainerEl = el.querySelector('.vendorTileFooter__price');
          const priceEl = priceContainerEl?.querySelector('span:last-child');
          
          const capacityContainerEl = el.querySelector('.vendorTileFooter__capacity');
          const capacityEl = capacityContainerEl?.querySelector('span:last-child');
          
          const descriptionEl = el.querySelector('.vendorTile__description, .vendor-description');
          const linkEl = el.querySelector('.vendorTile a[href*="/"]') as HTMLAnchorElement;
          const typeEl = el.querySelector('.vendorTile__subtitle, .vendor-type');

          // Récupérer toutes les images du slider
          const sliderImages = Array.from(el.querySelectorAll('.vendorTileGallery__image, .vendorTileGallery picture source'))
            .map(element => {
              if (element instanceof HTMLSourceElement) {
                const srcset = element.getAttribute('data-srcset') || element.getAttribute('srcset');
                console.log('Source element srcset:', srcset);
                return srcset?.split(',')[0]?.trim()?.split(' ')[0];
              } else {
                const dataSrc = element.getAttribute('data-lazy') || element.getAttribute('data-src');
                const src = element.getAttribute('src');
                console.log('Image element:', { dataSrc, src });
                return dataSrc || src;
              }
            })
            .filter(Boolean);

          // Vérifier si on a trouvé des images, sinon essayer d'autres sélecteurs
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

          // Logger chaque élément pour déboguer avec plus de détails
          const logElement = (name: string, el: Element | null, container: Element | null = null) => {
            console.log(`\nDébug ${name}:`);
            if (container) {
              console.log('Container HTML:', container.outerHTML);
            }
            if (el) {
              console.log('Element trouvé:', {
                text: el.textContent?.trim(),
                html: el.outerHTML,
                classes: el.className,
                attributes: Object.fromEntries(
                  Array.from(el.attributes).map(attr => [attr.name, attr.value])
                )
              });
            } else {
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
          const priceText = priceEl?.textContent?.trim() || priceContainerEl?.textContent?.trim() || '';
          const capacityText = capacityEl?.textContent?.trim() || capacityContainerEl?.textContent?.trim() || '';

          const data = {
            name: nameEl?.textContent?.trim() || '',
            rating: ratingEl?.textContent?.trim() || '',
            reviews: reviewsEl?.textContent?.trim().replace(/[()]/g, '') || '',
            location: locationEl?.textContent?.trim() || '',
            price: priceText,
            capacity: capacityText,
            description: descriptionEl?.textContent?.trim() || '',
            url: linkEl?.href || '',
            images: sliderImages,
            type: typeEl?.textContent?.trim() || ''
          };

          console.log('\nDonnées extraites:', data);
          return data;
        });

        console.log('\nDonnées extraites:', data);

        if (data.url) {
          console.log(`\nExtraction des détails pour ${data.name || 'établissement inconnu'}...`);
          
          // Extraire la ville et la région
          const [city, region] = data.location.split(',').map((s: string) => s.trim());
          
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
              images: data.images,
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