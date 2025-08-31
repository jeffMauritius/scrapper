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
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-blink-features=AutomationControlled',
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-spki-list',
    '--proxy-server=socks5://127.0.0.1:9050'  // Utiliser Tor comme proxy
  ],
  defaultViewport: {
    width: 1920,
    height: 1080
  }
};

const PAGE_OPTIONS = {
  waitUntil: 'networkidle0' as const,
  timeout: 60000
};

const COMMON_SELECTORS = {
  name: ['.vendorTitle h1', '.storefront-header-title', '.app-title', '.vendor-name', '.establishment-name'],
  type: ['.venueInfo-tags-item', '.storefront-header-tag', '.app-type', '.vendor-type', '.establishment-type'],
  description: ['.vendorDescription', '.storefront-description', '.app-description', '.vendor-description', '.establishment-description'],
  images: ['.gallery-slider img', '.storefront-gallery img', '.vendor-gallery img', '.vendor-images img', '.establishment-images img'],
  price: ['.app-price-lead', '.storefront-price', '.app-price', '.vendor-price', '.establishment-price'],
  address: ['.venue-address', '.storefront-address', '.app-address', '.vendor-address', '.establishment-address'],
  capacity: ['.capacity-block', '.storefront-capacity', '.app-capacity', '.vendor-capacity', '.establishment-capacity'],
  rating: ['.rating-number', '.storefront-rating-score', '.app-rating', '.vendor-rating', '.establishment-rating']
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
    const newProto = navigator.__proto__;
    delete newProto.webdriver;
    navigator.__proto__ = newProto;

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
  // Simuler des mouvements de souris aléatoires
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(
      Math.floor(Math.random() * 1000),
      Math.floor(Math.random() * 1000),
      { steps: Math.floor(Math.random() * 10) + 5 }
    );
    await delay(Math.random() * 1000 + 500);
  }

  // Simuler du défilement
  await page.mouse.wheel({ deltaY: Math.random() * 500 });
  await delay(Math.random() * 1000 + 500);

  // Simuler des clics aléatoires sur la page
  const elements = await page.$$('a, button, input');
  if (elements.length > 0) {
    const randomElement = elements[Math.floor(Math.random() * elements.length)];
    const box = await randomElement.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await delay(Math.random() * 500 + 200);
    }
  }
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

async function scrapeListPage(page: puppeteer.Page): Promise<string[]> {
  try {
    await page.goto('https://www.mariages.net/reception', PAGE_OPTIONS);
    await simulateHumanBehavior(page);

    // Attendre que la page soit chargée
    const listSelectors = [
      '.directory-list-item',
      '.app-venue-card',
      '.vendor-card',
      '.establishment-card',
      '.venue-list-item'
    ];

    for (const selector of listSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        console.log(`Sélecteur trouvé : ${selector}`);

        const links = await page.$$eval(`${selector} a`, (elements: Element[]) => 
          elements.map(el => (el as HTMLAnchorElement).href)
            .filter((url): url is string => url !== null && url.includes('/reception/'))
        );

        if (links.length > 0) {
          console.log(`${links.length} liens trouvés sur la page`);
          return links;
        }
      } catch (error) {
        console.log(`Sélecteur ${selector} non trouvé, essai suivant...`);
      }
    }

    throw new Error('Aucun sélecteur de liste trouvé');
  } catch (error) {
    console.error('Erreur lors du scraping de la page de liste:', error);
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

    const venueLinks = await scrapeListPage(page);
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