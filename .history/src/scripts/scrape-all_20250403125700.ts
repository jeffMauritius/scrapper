/// <reference lib="dom" />
import { PrismaClient } from '@prisma/client';
import { chromium, devices } from 'playwright';
import { VenueData } from '../types/venue';
import fs from 'fs';
import path from 'path';

const BROWSER_OPTIONS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
};

const CONTEXT_OPTIONS = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  locale: 'fr-FR',
  geolocation: { longitude: 2.3488, latitude: 48.8534 },
  permissions: ['geolocation']
};

const PAGE_OPTIONS = {
  waitUntil: 'networkidle'
};

const SELECTORS = {
  venueLinks: '.app-vendor-tile a',
  venueName: '.appHeading',
  venueType: '.vendorCategories',
  venueDescription: '.vendorDescription',
  venueImages: '.gallery-thumbs img',
  venuePrice: '.vendorPricing',
  venueAddress: '.address',
  venueCapacity: '.vendorCapacity',
  venueRating: '.rating'
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

async function scrapeVenuePage(page: any, url: string) {
  console.log(`Navigation vers: ${url}`);
  
  try {
    await page.goto(url, PAGE_OPTIONS);
    await page.waitForTimeout(2000);

    // Extraire les informations
    const name = await page.$eval(SELECTORS.venueName, (el: any) => el.textContent.trim()).catch(() => '');
    const type = await page.$eval(SELECTORS.venueType, (el: any) => el.textContent.trim()).catch(() => '');
    const description = await page.$eval(SELECTORS.venueDescription, (el: any) => el.textContent.trim()).catch(() => '');
    
    const images = await page.$$eval(SELECTORS.venueImages, (imgs: any[]) => 
      imgs.map(img => img.src)
    ).catch(() => []);

    const price = await page.$eval(SELECTORS.venuePrice, (el: any) => el.textContent.trim()).catch(() => '');
    const address = await page.$eval(SELECTORS.venueAddress, (el: any) => el.textContent.trim()).catch(() => '');
    const capacity = await page.$eval(SELECTORS.venueCapacity, (el: any) => el.textContent.trim()).catch(() => '');
    const rating = await page.$eval(SELECTORS.venueRating, (el: any) => el.textContent.trim()).catch(() => '');

    // Extraire ville et région de l'adresse
    const addressText = address || '';
    const [city = '', region = ''] = (addressText || '').split(',').map((s: string) => s.trim());

    return {
      url,
      name,
      type,
      description,
      images,
      price,
      address,
      city,
      region,
      capacity,
      rating
    };

  } catch (error) {
    console.error(`Erreur lors du scraping de ${url}:`, error);
    return null;
  }
}

async function scrapeListPage(page: any, url: string) {
  console.log(`Navigation vers: ${url}`);
  
  try {
    await page.goto(url, PAGE_OPTIONS);
    
    // Attendre que la page soit chargée
    console.log('Attente du chargement complet...');
    await page.waitForTimeout(5000);

    // Faire défiler pour charger tout le contenu
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);

    // Prendre une capture d'écran pour le débogage
    await page.screenshot({ path: 'debug-list.png' });

    // Trouver tous les liens des lieux
    console.log('Recherche des liens...');
    const links = await page.$$eval(SELECTORS.venueLinks, (elements: any[]) => {
      return elements.map(el => el.href);
    });

    console.log(`${links.length} liens trouvés`);

    // Dédupliquer les liens
    const uniqueLinks = [...new Set(links)];
    console.log(`${uniqueLinks.length} liens uniques`);

    return uniqueLinks;

  } catch (error) {
    console.error('Erreur lors du scraping de la liste:', error);
    return [];
  }
}

async function main() {
  const browser = await chromium.launch(BROWSER_OPTIONS);
  const context = await browser.newContext(CONTEXT_OPTIONS);
  const page = await context.newPage();

  try {
    // URL de départ
    const startUrl = 'https://www.mariages.net/busc.php?id_grupo=1&id_sector=31&showmode=list&NumPage=1&userSearch=1&isNearby=0&priceType=menu';

    // Nettoyer la base de données
    console.log('Nettoyage de la base de données...');
    const dbPath = path.join(__dirname, '../../data/venues.json');
    fs.writeFileSync(dbPath, '[]');

    // Scraper la liste des lieux
    const venueLinks = await scrapeListPage(page, startUrl);
    
    // Scraper chaque lieu
    const venues = [];
    for (const link of venueLinks) {
      const venueData = await scrapeVenuePage(page, link);
      if (venueData) {
        venues.push(venueData);
        // Sauvegarder après chaque lieu
        fs.writeFileSync(dbPath, JSON.stringify(venues, null, 2));
      }
      // Pause aléatoire entre les requêtes
      await page.waitForTimeout(1000 + Math.random() * 2000);
    }

    console.log(`Scraping terminé. ${venues.length} lieux extraits.`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await browser.close();
  }
}

main();