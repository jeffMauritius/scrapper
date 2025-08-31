/// <reference lib="dom" />
import { PrismaClient } from '@prisma/client';
import * as puppeteer from 'puppeteer';
import { VenueData } from '../types/venue';

const PUPPETEER_OPTIONS = {
  headless: false,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920x1080',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process,site-isolation-for-policy',
    '--disable-blink-features=AutomationControlled',
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-spki-list',
    '--allow-running-insecure-content',
    '--disable-notifications',
    '--disable-popup-blocking',
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--no-default-browser-check',
    '--no-first-run',
    '--password-store=basic',
    '--use-mock-keychain',
    '--force-webrtc-ip-handling-policy=default_public_interface_only',
    '--disable-site-isolation-trials',
    '--disable-features=site-per-process',
    '--disable-features=TranslateUI',
    '--disable-features=BlinkGenPropertyTrees',
    '--disable-features=IsolateOrigins',
    '--disable-features=LazyFrameLoading',
    '--disable-features=AutomationControlled',
    '--disable-features=AutofillShowTypePredictions',
    '--disable-features=AutofillShowManualFallbackInSidebar',
    '--disable-features=AutofillServerCommunication',
    '--disable-features=AutofillEnableAccountWalletStorage',
    '--disable-features=AutofillEnableGoogleIssuedCard',
    '--disable-features=AutofillProfileOrderByFrecency',
    '--disable-features=AutofillSaveCardInfoBar',
    '--disable-features=AutofillShowSaveCardBubbleFooter',
    '--disable-features=AutofillShowSaveCardInfoBar',
    '--disable-features=AutofillShowTypePredictions',
    '--disable-features=AutofillVirtualCard',
    '--disable-features=PasswordGeneration',
    '--disable-features=PasswordManagerSettingsRedesign',
    '--disable-features=PasswordExport',
    '--disable-features=PasswordImport',
    '--disable-features=PasswordsAccountStorage',
    '--disable-features=PasswordGenerationEngagement',
    '--disable-features=PasswordGenerationRequiresFormManager',
    '--disable-features=PasswordManagerRedesign',
    '--disable-features=PasswordStrengthIndicator',
    '--disable-features=PasswordScriptsFetching',
    '--disable-features=PasswordScriptsFiltering',
    '--disable-features=PasswordScriptsInBubble',
    '--disable-features=PasswordScriptsInSettings',
    '--disable-features=PasswordScriptsInSidebar',
    '--disable-features=PasswordScriptsInToolbar',
    '--disable-features=PasswordScriptsInTouchToFill',
    '--disable-features=PasswordScriptsInVirtualKeyboard',
    '--disable-features=PasswordScriptsInWebUI',
    '--disable-features=PasswordScriptsInWebUISettings',
    '--disable-features=PasswordScriptsInWebUIToolbar',
    '--disable-features=PasswordScriptsInWebUITouchToFill',
    '--disable-features=PasswordScriptsInWebUIVirtualKeyboard'
  ],
  defaultViewport: {
    width: 1920,
    height: 1080
  }
};

const PAGE_OPTIONS = {
  waitUntil: ['networkidle0', 'domcontentloaded'],
  timeout: 30000
} as const;

const COMMON_SELECTORS = {
  name: ['.vendorTitle h1', '.storefront-header-title', '.app-title', '.vendor-name', '.establishment-name', '.vendorBoxHeading'],
  type: ['.venueInfo-tags-item', '.storefront-header-tag', '.app-type', '.vendor-type', '.establishment-type', '.vendorBoxSubtitle'],
  description: ['.vendorDescription', '.storefront-description', '.app-description', '.vendor-description', '.establishment-description', '.vendorBoxContent'],
  images: ['.gallery-slider img', '.storefront-gallery img', '.vendor-gallery img', '.vendor-images img', '.establishment-images img', '.vendorBoxImage img'],
  price: ['.app-price-lead', '.storefront-price', '.app-price', '.vendor-price', '.establishment-price', '.vendorBoxPrice'],
  address: ['.venue-address', '.storefront-address', '.app-address', '.vendor-address', '.establishment-address', '.vendorBoxLocation'],
  capacity: ['.capacity-block', '.storefront-capacity', '.app-capacity', '.vendor-capacity', '.establishment-capacity'],
  rating: ['.rating-number', '.storefront-rating-score', '.app-rating', '.vendor-rating', '.establishment-rating', '.vendorBoxRating'],
  venueLinks: '.vendorBox a'
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function setupPage(page: puppeteer.Page) {
  // Définir un User-Agent réaliste
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // Activer JavaScript
  await page.setJavaScriptEnabled(true);

  // Intercepter les requêtes de ressources inutiles
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
  });

  // Ajouter des en-têtes personnalisés
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'max-age=0',
    'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document'
  });

  // Masquer la détection de Puppeteer
  await page.evaluateOnNewDocument(() => {
    // Supprimer les variables qui révèlent Puppeteer
    delete (window as any).navigator.webdriver;
    
    // Émuler des propriétés de navigateur normales
    const proto = Object.getPrototypeOf(navigator);
    delete (proto as any).webdriver;
    Object.setPrototypeOf(navigator, proto);

    // Ajouter des propriétés de plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Ajouter des propriétés de languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['fr-FR', 'fr', 'en-US', 'en'],
    });

    // Émuler un WebGL normal
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter: any) {
      if (parameter === 37445) {
        return 'Intel Open Source Technology Center';
      }
      if (parameter === 37446) {
        return 'Mesa DRI Intel(R) Iris(R) Plus Graphics (ICL GT2)';
      }
      return getParameter.apply(this, [parameter]);
    };
  });
}

async function waitForSelectorWithFallback(page: puppeteer.Page, selectors: string[]): Promise<string> {
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      return selector;
    } catch (error) {
      console.log(`Sélecteur ${selector} non trouvé, essai suivant...`);
    }
  }
  throw new Error(`Aucun sélecteur trouvé parmi : ${selectors.join(', ')}`);
}

async function simulateHumanBehavior(page: puppeteer.Page) {
  // Scroll aléatoire
  await page.evaluate(() => {
    const scrollAmount = Math.floor(Math.random() * 100);
    window.scrollBy(0, scrollAmount);
  });

  // Mouvement de souris aléatoire
  const x = Math.floor(Math.random() * 500);
  const y = Math.floor(Math.random() * 500);
  await page.mouse.move(x, y);
  
  // Pause aléatoire
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
}

async function scrapeVenuePage(url: string): Promise<VenueData | null> {
  const browser = await puppeteer.launch(PUPPETEER_OPTIONS);
  const page = await browser.newPage();
  
  try {
    await setupPage(page);
    await page.goto(url, PAGE_OPTIONS);
    await simulateHumanBehavior(page);

    // Extraire les données avec fallback
    const nameSelector = await waitForSelectorWithFallback(page, COMMON_SELECTORS.name);
    const name = await page.$eval(nameSelector, (el: Element) => el.textContent?.trim() || '');
    console.log('Name:', name);

    const typeSelector = await waitForSelectorWithFallback(page, COMMON_SELECTORS.type);
    const type = await page.$eval(typeSelector, (el: Element) => el.textContent?.trim() || '');
    console.log('Type:', type);

    const descriptionSelector = await waitForSelectorWithFallback(page, COMMON_SELECTORS.description);
    const description = await page.$eval(descriptionSelector, (el: Element) => el.textContent?.trim() || '');
    console.log('Description:', description);

    const imagesSelector = await waitForSelectorWithFallback(page, COMMON_SELECTORS.images);
    const images = await page.$$eval(imagesSelector, (elements: Element[]) => 
      elements.map(el => (el as HTMLImageElement).getAttribute('data-src') || (el as HTMLImageElement).src)
        .filter((url): url is string => url !== null && !url.includes('blank.gif'))
    );
    console.log('Images:', images);

    const priceSelector = await waitForSelectorWithFallback(page, COMMON_SELECTORS.price);
    const priceText = await page.$eval(priceSelector, (el: Element) => el.textContent?.trim() || '');
    const priceMatch = priceText.match(/(\d+)/);
    const startingPrice = priceMatch ? parseInt(priceMatch[1]) : 0;
    console.log('Price:', startingPrice);

    const addressSelector = await waitForSelectorWithFallback(page, COMMON_SELECTORS.address);
    const addressText = await page.$eval(addressSelector, (el: Element) => el.textContent?.trim() || '');
    const [city = '', region = ''] = addressText.split(',').map(s => s.trim());
    const address = {
      city,
      region,
      country: 'France'
    };
    console.log('Address:', address);

    const capacitySelector = await waitForSelectorWithFallback(page, COMMON_SELECTORS.capacity);
    const capacityText = await page.$eval(capacitySelector, (el: Element) => el.textContent?.trim() || '');
    const capacityMatch = capacityText.match(/(\d+)\s*-\s*(\d+)|jusqu'à\s*(\d+)/i);
    const capacity = {
      min: capacityMatch ? parseInt(capacityMatch[1] || '0') : undefined,
      max: capacityMatch ? parseInt(capacityMatch[2] || capacityMatch[3] || '100') : 100
    };
    console.log('Capacity:', capacity);

    const ratingSelector = await waitForSelectorWithFallback(page, COMMON_SELECTORS.rating);
    const ratingText = await page.$eval(ratingSelector, (el: Element) => el.textContent?.trim() || '0');
    const ratingValue = parseFloat(ratingText) || 0;
    const rating = {
      score: ratingValue,
      numberOfReviews: 0
    };
    console.log('Rating:', rating);

    return {
      name,
      type,
      description,
      images,
      price: {
        startingPrice,
        currency: 'EUR'
      },
      address,
      capacity,
      rating
    };

  } catch (error) {
    console.error(`Erreur lors du scraping de ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

async function scrapeRegionPage(page: puppeteer.Page, url: string): Promise<string[]> {
  let retries = 3;
  while (retries > 0) {
    try {
      console.log(`Navigation vers la page de région: ${url} (essai ${4 - retries}/3)`);
      await page.goto(url, PAGE_OPTIONS);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));

      // Simuler un comportement humain
      await page.evaluate(() => {
        window.scrollTo(0, Math.random() * 500);
      });
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

      // Prendre une capture d'écran pour debug
      await page.screenshot({ path: `debug-region-${Date.now()}.png`, fullPage: true });
      
      const venueSelectors = [
        '.directory-list-item a',
        '.app-venue-card a',
        '.vendor-card a',
        '.establishment-card a',
        '.venue-list-item a',
        'a[data-track-c="DirectoryList"]',
        '.listItemWrapper a',
        'a[href*="/salle/"]'
      ];
      
      for (const selector of venueSelectors) {
        try {
          console.log(`Essai du sélecteur de lieu: ${selector}`);
          const venueLinks = await page.$$eval(
            selector,
            (elements: Element[]) => {
              return elements
                .filter((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement)
                .map(el => el.href)
                .filter(href => href && href.includes('/salle/'));
            }
          );
          
          if (venueLinks.length > 0) {
            console.log(`${venueLinks.length} liens de lieux trouvés avec le sélecteur ${selector}`);
            return venueLinks;
          }
        } catch (error) {
          console.log(`Erreur avec le sélecteur ${selector}:`, error);
        }
      }

      // Si on arrive ici, aucun lien n'a été trouvé
      console.log('Aucun lien trouvé sur cette page');
      return [];

    } catch (error) {
      console.error(`Erreur lors de l'essai ${4 - retries}/3:`, error);
      retries--;
      if (retries > 0) {
        console.log(`Nouvelle tentative dans 5 secondes...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  console.error(`Échec après 3 tentatives pour la page ${url}`);
  return [];
}

async function scrapeListPage(page: puppeteer.Page, url: string): Promise<string[]> {
  try {
    console.log('Navigation vers:', url);
    await page.goto(url, PAGE_OPTIONS);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Récupérer les liens des régions
    const regionLinks = await page.$$eval(
      'a[href*="/reception/"]',
      (elements: Element[]) => {
        return elements
          .filter((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement)
          .map(el => el.href)
          .filter(href => href && href.includes('/reception/') && !href.includes('busc.php'));
      }
    );
    
    console.log(`${regionLinks.length} liens de régions trouvés`);
    
    // Scraper chaque page de région
    const allVenueLinks: string[] = [];
    for (const regionUrl of regionLinks) {
      console.log(`\nTraitement de la région: ${regionUrl}`);
      const venueLinks = await scrapeRegionPage(page, regionUrl);
      allVenueLinks.push(...venueLinks);
      
      // Attendre entre chaque région pour éviter d'être bloqué
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));
    }
    
    console.log(`Total de ${allVenueLinks.length} liens de lieux trouvés`);
    return allVenueLinks;
  } catch (error) {
    console.error('Error scraping list page:', error);
    return [];
  }
}

async function main() {
  const prisma = new PrismaClient();
  const browser = await puppeteer.launch(PUPPETEER_OPTIONS);
  const page = await browser.newPage();

  try {
    await setupPage(page);
    await prisma.establishment.deleteMany();
    console.log('Base de données nettoyée');

    const venueLinks = await scrapeListPage(page, 'https://www.mariages.net/busc.php?id_grupo=1&showmode=list&NumPage=1&userSearch=1&isNearby=0&categoryIds%5B%5D=1&categoryIds%5B%5D=2&categoryIds%5B%5D=3&categoryIds%5B%5D=4&categoryIds%5B%5D=5&categoryIds%5B%5D=29&categoryIds%5B%5D=31&categoryIds%5B%5D=63&categoryIds%5B%5D=47');
    console.log(`${venueLinks.length} liens de lieux trouvés`);

    for (const url of venueLinks) {
      console.log(`\nTraitement du lieu: ${url}`);
      const venueData = await scrapeVenuePage(url);
      
      if (venueData) {
        await prisma.establishment.create({
          data: {
            type: venueData.type,
            name: venueData.name,
            description: venueData.description,
            startingPrice: venueData.price.startingPrice,
            currency: venueData.price.currency,
            city: venueData.address.city,
            region: venueData.address.region,
            country: venueData.address.country,
            minCapacity: venueData.capacity.min || null,
            maxCapacity: venueData.capacity.max || 100,
            rating: venueData.rating.score,
            reviewCount: venueData.rating.numberOfReviews,
            featureIds: [],
            amenityIds: [],
            images: {
              create: venueData.images.map((url, index) => ({
                url,
                type: 'IMAGE',
                order: index
              }))
            }
          }
        });
        console.log('Lieu créé dans la base de données');
      }

      // Ajouter un délai aléatoire entre chaque venue
      await delay(Math.random() * 5000 + 2000);
    }

  } catch (error) {
    console.error('Erreur lors du scraping:', error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch(console.error);