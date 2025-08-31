/// <reference lib="dom" />
import { PrismaClient } from '@prisma/client';
import * as puppeteer from 'puppeteer';
import { VenueData } from '../types/venue';

async function scrapeVenuePage(url: string): Promise<VenueData | null> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto(url);
    await page.waitForSelector('.venue-details');

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
    await page.goto('https://www.mariages.net/reception');
    await page.waitForSelector('.venue-card');

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
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
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
            images: venueData.images,
            type: venueData.type
          }
        });
        console.log('Lieu créé dans la base de données');
      }
    }

  } catch (error) {
    console.error('Erreur lors du scraping:', error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch(console.error);