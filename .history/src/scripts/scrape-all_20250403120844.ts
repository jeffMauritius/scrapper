import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import { VenueData } from '../types/venue';

const prisma = new PrismaClient();

async function scrapeVenuePage(page: puppeteer.Page, url: string): Promise<VenueData | null> {
  try {
    console.log(`Tentative de scraping de l'URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0' });
    console.log('Page venue chargée');

    // Attendre que les éléments importants soient chargés
    await page.waitForSelector('.vendorTitle h1, .storefront-header-title', { timeout: 5000 }).catch(() => null);

    // Extraire les informations de base
    const name = await page.$eval('.vendorTitle h1, .storefront-header-title', el => el.textContent?.trim() || '').catch(() => '');
    console.log('Nom trouvé:', name);

    const type = await page.$eval('.venueInfo-tags-item, .storefront-header-tag', el => el.textContent?.trim() || '').catch(() => '');
    console.log('Type trouvé:', type);

    const description = await page.$eval('.vendorDescription, .storefront-description', el => el.textContent?.trim() || '').catch(() => '');
    console.log('Description trouvée:', description ? 'Oui' : 'Non');

    // Extraire les images
    const images = await page.$$eval(
      '.gallery-slider img, .storefront-gallery img, .vendor-gallery img',
      elements => elements.map(el => el.getAttribute('data-src') || el.getAttribute('src'))
        .filter(url => url && !url.includes('blank.gif')) as string[]
    ).catch(() => []);
    console.log(`Nombre d'images trouvées: ${images.length}`);

    // Extraire le prix
    const priceText = await page.$eval('.app-price-lead, .storefront-price', el => el.textContent?.trim() || '').catch(() => '');
    console.log('Texte du prix trouvé:', priceText);
    const priceMatch = priceText.match(/(\d+)/);
    const startingPrice = priceMatch ? parseInt(priceMatch[1]) : 0;
    console.log('Prix de départ:', startingPrice);

    // Extraire l'adresse
    const address = {
      city: await page.$eval('.venue-address, .storefront-address-city', el => el.textContent?.trim() || '').catch(() => ''),
      region: await page.$eval('.venue-region, .storefront-address-region', el => el.textContent?.trim() || '').catch(() => 'Non spécifié'),
      country: 'France'
    };
    console.log('Adresse trouvée:', address);

    // Extraire la capacité
    const capacityText = await page.$eval('.capacity-block, .storefront-capacity', el => el.textContent?.trim() || '').catch(() => '');
    console.log('Texte de capacité trouvé:', capacityText);
    const capacityMatch = capacityText.match(/(\d+)\s*-\s*(\d+)|jusqu'à\s*(\d+)/i);
    const capacity = {
      min: capacityMatch ? parseInt(capacityMatch[1] || '0') : undefined,
      max: capacityMatch ? parseInt(capacityMatch[2] || capacityMatch[3] || '100') : 100
    };
    console.log('Capacité calculée:', capacity);

    // Extraire la note et le nombre d'avis
    const rating = {
      score: parseFloat(await page.$eval('.rating-number, .storefront-rating-score', el => el.textContent?.trim() || '0').catch(() => '0')),
      numberOfReviews: parseInt(await page.$eval('.rating-count, .storefront-rating-count', el => el.textContent?.trim() || '0').catch(() => '0'))
    };
    console.log('Note trouvée:', rating);

    if (!name) {
      console.log('Aucun nom trouvé, page probablement non chargée correctement');
      return null;
    }

    const venueData = {
      type,
      name,
      description,
      price: {
        startingPrice,
        currency: 'EUR'
      },
      address,
      capacity,
      rating,
      images
    };

    console.log('Données du lieu extraites avec succès:', JSON.stringify(venueData, null, 2));
    return venueData;
  } catch (error) {
    console.error(`Erreur détaillée lors du scraping de ${url}:`, error);
    return null;
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
      elements => elements.map(el => el.getAttribute('href')).filter(href => href) as string[]
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
        rating: venueData.rating.score,
        reviewCount: venueData.rating.numberOfReviews,
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
        const venueData = await scrapeVenuePage(page, url);
        
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