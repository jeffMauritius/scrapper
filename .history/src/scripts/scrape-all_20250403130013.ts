/// <reference lib="dom" />
import { chromium, devices } from 'playwright';
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
  headless: true,
  args: [
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-sandbox',
  ],
};

// Options du contexte
const CONTEXT_OPTIONS = {
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  locale: 'fr-FR',
  geolocation: { latitude: 48.8566, longitude: 2.3522 },
};

// Options de la page
const PAGE_OPTIONS = {
  waitUntil: 'networkidle',
};

// Sélecteurs communs
const SELECTORS = {
  venueLinks: '.app-vendor-tile a',
  venueName: '.appHeading',
  venueType: '.vendorType',
  venueDescription: '.vendorDescription',
  venueImages: '.gallery img',
  venuePrice: '.priceRange',
  venueAddress: '.address',
  venueCapacity: '.capacity',
  venueRating: '.rating',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForSelectorWithFallback(page: any, selector: string, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    console.log(`Sélecteur ${selector} non trouvé`);
    return false;
  }
}

async function simulateHumanBehavior(page: any) {
  // Faire défiler la page de manière aléatoire
  await page.evaluate(() => {
    window.scrollTo({
      top: Math.random() * document.body.scrollHeight,
      behavior: 'smooth'
    });
  });
  
  // Attendre un délai aléatoire
  await page.waitForTimeout(1000 + Math.random() * 2000);
}

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
  await page.goto(url, PAGE_OPTIONS);
  console.log('Navigation vers:', url);
  console.log('Attente du chargement complet...');
  
  await page.waitForTimeout(10000);
  
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'debug-list.png' });
  
  const elements = await page.$$(SELECTORS.venueLinks);
  const links: string[] = [];
  
  for (const element of elements) {
    const href = await element.getAttribute('href');
    if (href && href.length > 0) {
      links.push(href);
    }
  }
  
  console.log(`Nombre de liens trouvés: ${links.length}`);
  return [...new Set(links)];
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