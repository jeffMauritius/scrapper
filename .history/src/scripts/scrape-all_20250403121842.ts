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
    '--window-size=1920x1080'
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
}

async function scrapeVenuePage(url: string): Promise<VenueData | null> {
  const browser = await puppeteer.launch(PUPPETEER_OPTIONS);
  const page = await browser.newPage();
  
  try {
    await setupPage(page);
    await page.goto(url, PAGE_OPTIONS);
    await page.waitForSelector('.venue-details', { timeout: 10000 });

    // Ajouter un délai aléatoire
    await page.waitForTimeout(Math.random() * 2000 + 1000);

    // Extraire les données
    const name = await page.$eval('.venue-name', (el: Element) => el.textContent?.trim() || '');
    console.log('Name:', name);

    const type = await page.$eval('.venue-type', (el: Element) => el.textContent?.trim() || '');
    console.log('Type:', type);

    const description = await page.$eval('.venue-description', (el: Element) => el.textContent?.trim() || '');
    console.log('Description:', description);

    const images = await page.$$eval('.venue-images img', (elements: Element[]) => 
      elements.map(el => (el as HTMLImageElement).src)
        .filter((url): url is string => url !== null && !url.includes('blank.gif'))
    );
    console.log('Images:', images);

    const priceText = await page.$eval('.venue-price', (el: Element) => el.textContent?.trim() || '');
    const startingPrice = parseInt(priceText as string, 10) || 0;
    console.log('Price:', startingPrice);

    const addressText = await page.$eval('.venue-address', (el: Element) => el.textContent?.trim() || '');
    const [city = '', region = ''] = addressText.split(',').map(s => s.trim());
    const address = {
      city,
      region,
      country: 'France'
    };
    console.log('Address:', address);

    const capacityText = await page.$eval('.venue-capacity', (el: Element) => el.textContent?.trim() || '');
    const capacityValue = parseInt(capacityText as string, 10) || 0;
    const capacity = {
      min: Math.floor(capacityValue * 0.8),
      max: capacityValue
    };
    console.log('Capacity:', capacity);

    const ratingText = await page.$eval('.venue-rating', (el: Element) => el.textContent?.trim() || '0');
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
    await page.waitForSelector('.venue-card', { timeout: 10000 });

    // Ajouter un délai aléatoire
    await page.waitForTimeout(Math.random() * 2000 + 1000);

    const links = await page.$$eval('.venue-card a', (elements: Element[]) => 
      elements.map(el => (el as HTMLAnchorElement).href)
        .filter((url): url is string => url !== null)
    );

    console.log(`${links.length} liens trouvés sur la page`);
    return links;
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
      await page.waitForTimeout(Math.random() * 5000 + 2000);
    }

  } catch (error) {
    console.error('Erreur lors du scraping:', error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch(console.error);