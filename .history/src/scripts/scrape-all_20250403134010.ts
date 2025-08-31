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

async function scrapeListPage(page: Page): Promise<string[]> {
  console.log('Navigation vers:', page.url());
  console.log('Attente du chargement complet...');
  
  // Attendre que la page soit chargée
  await page.waitForSelector(SELECTORS.venueLinks);
  
  // Trouver tous les liens de lieux
  const elements = await page.$$(SELECTORS.venueLinks);
  console.log(`Nombre d'éléments trouvés: ${elements.length}`);

  // Extraire les URLs
  const links = await Promise.all(
    elements.map(async (el) => {
      const href = await el.evaluate(e => e.getAttribute('href'));
      return href ? `https://www.mariages.net${href}` : null;
    })
  );

  // Filtrer les liens nuls et dédupliquer
  const uniqueLinks = [...new Set(links.filter(link => link !== null))];
  console.log(`Total de ${uniqueLinks.length} liens uniques trouvés`);

  return uniqueLinks;
}

async function main() {
  const browser = await chromium.launch(BROWSER_OPTIONS);
  const context = await browser.newContext(CONTEXT_OPTIONS);
  const page = await context.newPage();

  try {
    console.log('Nettoyage de la base de données...');
    
    const url = 'https://www.mariages.net/busc.php?id_grupo=1&id_sector=31&showmode=list&NumPage=1&userSearch=1&isNearby=0&priceType=menu';
    const venueLinks = await scrapeListPage(page);
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