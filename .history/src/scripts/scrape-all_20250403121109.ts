/// <reference lib="dom" />
import { PrismaClient } from '@prisma/client';
import * as puppeteer from 'puppeteer';
import { VenueData } from '../types/venue';

const prisma = new PrismaClient();

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
      rating,
      url
    };

  } catch (error) {
    console.error(`Erreur lors du scraping de ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

async function scrapeListPage(page: puppeteer.Page, pageNumber: number): Promise<string[]> {
  const url = `https://www.mariages.net/salle-mariage?page=${pageNumber}`;
  console.log(`Tentative de scraping de la page liste: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle0' });
    console.log('Page liste chargée');

    // Attendre que la liste des lieux soit chargée
    await page.waitForSelector('.vendorTile__title a, .directory-item-title a', { timeout: 5000 }).catch(() => null);

    // Extraire tous les liens
    const venueLinks = await page.$$eval(
      '.vendorTile__title a, .directory-item-title a',
      (elements: HTMLAnchorElement[]) => elements.map((el: HTMLAnchorElement) => el.href).filter((href: string) => href)
    );

    // Convertir les chemins relatifs en URLs absolues
    const absoluteLinks = venueLinks.map(link => 
      link.startsWith('/') ? `https://www.mariages.net${link}` : link
    );

    console.log(`Nombre de liens trouvés sur la page ${pageNumber}: ${absoluteLinks.length}`);
    if (absoluteLinks.length > 0) {
      console.log('Premiers liens trouvés:', absoluteLinks.slice(0, 3));
    }

    return absoluteLinks;
  } catch (error) {
    console.error(`Erreur détaillée lors du scraping de la page ${pageNumber}:`, error);
    return [];
  }
}

async function saveVenueToDatabase(venueData: VenueData) {
  try {
    console.log('Tentative de sauvegarde en base de données pour:', venueData.name);
    
    const establishment = await prisma.establishment.create({
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
        rating: venueData.rating,
        reviewCount: 0,
        featureIds: [],
        amenityIds: [],
        images: {
          create: venueData.images.map((url, index) => ({
            url,
            order: index
          }))
        }
      }
    });

    console.log(`Établissement sauvegardé avec succès: ${establishment.name}`);
    return establishment;
  } catch (error) {
    console.error(`Erreur détaillée lors de la sauvegarde en base de données:`, error);
    return null;
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ]
  });

  try {
    console.log('Démarrage du script de scraping...');
    
    // Nettoyer la base de données
    console.log('Nettoyage de la base de données...');
    await prisma.image.deleteMany({});
    await prisma.establishment.deleteMany({});
    console.log('Base de données nettoyée avec succès');

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    let pageNumber = 1;
    let hasMorePages = true;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (hasMorePages && pageNumber <= 3) { // Limite à 3 pages pour les tests
      console.log(`\n=== Traitement de la page ${pageNumber} ===`);
      
      // Récupérer les liens de la page courante
      const venueLinks = await scrapeListPage(page, pageNumber);
      
      if (venueLinks.length === 0) {
        console.log(`Aucun lien trouvé sur la page ${pageNumber}, arrêt du scraping`);
        hasMorePages = false;
        continue;
      }

      // Traiter chaque lieu
      for (const url of venueLinks) {
        console.log(`\nTraitement du lieu: ${url}`);
        const venueData = await scrapeVenuePage(url);
        
        if (venueData) {
          await saveVenueToDatabase(venueData);
          // Attendre entre chaque venue pour éviter la détection
          await delay(Math.random() * 5000 + 5000);
        }
      }

      pageNumber++;
      // Attendre entre chaque page pour éviter la détection
      await delay(Math.random() * 10000 + 10000);
    }

    console.log('\nScraping terminé avec succès');
  } catch (error) {
    console.error('Erreur lors du scraping:', error);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });