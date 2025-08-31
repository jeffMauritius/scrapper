/// <reference lib="dom" />
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface VenueData {
  url: string;
  name: string;
  type: string;
  description: string;
  images: string[];
  price: string;
  address: string;
  city: string;
  region: string;
  capacity: string;
  rating: string;
}

// Options du navigateur
const BROWSER_OPTIONS = {
  headless: false,
  args: [
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-sandbox',
    '--window-size=1920,1080',
  ],
};

// Options du contexte
const CONTEXT_OPTIONS = {
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  locale: 'fr-FR',
  geolocation: { latitude: 48.8566, longitude: 2.3522 },
  extraHTTPHeaders: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  },
};

// Options de la page
const PAGE_OPTIONS = {
  waitUntil: 'networkidle',
};

// Sélecteurs communs
const SELECTORS = {
  venueLinks: '.app-vendor-tile a',
  venueName: '.appHeading, .storefront-header-title, h1',
  venueType: '.app-emp-info-category, .storefront-header-info',
  venueDescription: '.app-emp-description, .storefront-description',
  venueImages: '.app-emp-gallery img, .storefront-gallery img',
  venuePrice: '.app-emp-info-price, .storefront-header-price',
  venueAddress: '.app-emp-info-address, .storefront-header-address',
  venueCapacity: '.app-emp-info-capacity, .storefront-header-capacity',
  venueRating: '.app-emp-info-rating, .storefront-header-rating'
};

async function scrapeVenuePage(page: any, url: string): Promise<VenueData> {
  await page.goto(url, PAGE_OPTIONS);
  
  const name = await page.$eval(SELECTORS.venueName, (el: HTMLElement) => el.textContent?.trim() || '');
  const type = await page.$eval(SELECTORS.venueType, (el: HTMLElement) => el.textContent?.trim() || '');
  const description = await page.$eval(SELECTORS.venueDescription, (el: HTMLElement) => el.textContent?.trim() || '');
  const images = await page.$$eval(SELECTORS.venueImages, (els: HTMLImageElement[]) => els.map(el => el.src));
  const price = await page.$eval(SELECTORS.venuePrice, (el: HTMLElement) => el.textContent?.trim() || '');
  const addressText = await page.$eval(SELECTORS.venueAddress, (el: HTMLElement) => el.textContent?.trim() || '');
  const [city = '', region = ''] = (addressText || '').split(',').map((s: string) => s.trim());
  const capacity = await page.$eval(SELECTORS.venueCapacity, (el: HTMLElement) => el.textContent?.trim() || '');
  const rating = await page.$eval(SELECTORS.venueRating, (el: HTMLElement) => el.textContent?.trim() || '');

  return {
    url,
    name,
    type,
    description,
    images,
    price,
    address: addressText,
    city,
    region,
    capacity,
    rating,
  };
}

async function scrapeListPage(page: any, url: string): Promise<string[]> {
  await page.goto(url, { 
    ...PAGE_OPTIONS,
    waitUntil: 'domcontentloaded'
  });
  console.log('Navigation vers:', url);
  console.log('Attente du chargement complet...');
  
  // Attendre plus longtemps pour le chargement initial
  await page.waitForTimeout(15000);
  
  // Faire défiler progressivement
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(2000);
  }
  
  await page.screenshot({ path: 'debug-list.png' });
  
  const allLinks: string[] = [];
  
  for (const selector of SELECTORS.venueLinks) {
    console.log(`Test du sélecteur: ${selector}`);
    const elements = await page.$$(selector);
    console.log(`${elements.length} éléments trouvés`);
    
    for (const element of elements) {
      const href = await element.getAttribute('href');
      if (href && href.length > 0) {
        allLinks.push(href);
      }
    }
  }
  
  const uniqueLinks = [...new Set(allLinks)];
  console.log(`Nombre total de liens trouvés: ${allLinks.length}`);
  console.log(`Nombre de liens uniques: ${uniqueLinks.length}`);
  
  // Afficher le HTML pour le débogage
  const html = await page.content();
  console.log('HTML de la page:');
  console.log(html);
  
  return uniqueLinks;
}

async function main() {
  const browser = await chromium.launch(BROWSER_OPTIONS);
  const context = await browser.newContext(CONTEXT_OPTIONS);
  const page = await context.newPage();

  try {
    console.log('Nettoyage de la base de données...');
    
    const url = 'https://www.mariages.net/busc.php?id_grupo=1&id_sector=31&showmode=list&NumPage=1&userSearch=1&isNearby=0&priceType=menu';
    const venueLinks = await scrapeListPage(page, url);
    console.log(`Total de ${venueLinks.length} liens uniques trouvés`);

    const venues: VenueData[] = [];
    for (const link of venueLinks) {
      try {
        const venueData = await scrapeVenuePage(page, link);
        venues.push(venueData);
        console.log(`Données extraites pour: ${venueData.name}`);
      } catch (error) {
        console.error(`Erreur lors du scraping de ${link}:`, error);
      }
    }

    const outputPath = path.join(__dirname, '../../data/venues.json');
    fs.writeFileSync(outputPath, JSON.stringify(venues, null, 2));
    console.log(`Données sauvegardées dans: ${outputPath}`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);