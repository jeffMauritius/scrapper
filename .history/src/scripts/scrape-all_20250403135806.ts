/// <reference lib="dom" />
import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from 'playwright';

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
  headless: false
};

// Options du contexte
const CONTEXT_OPTIONS = {
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  locale: 'fr-FR',
  geolocation: { longitude: 2.3488, latitude: 48.8534 },
  extraHTTPHeaders: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  }
};

// Options de la page
const PAGE_OPTIONS = {
  waitUntil: 'networkidle' as const,
  timeout: 60000,
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

async function scrapeListPage(page: Page): Promise<string[]> {
  console.log('Navigation vers:', page.url());
  console.log('Attente du chargement complet...');
  
  // Attendre que la page soit chargée
  await page.waitForSelector(SELECTORS.venueLinks);
  
  // Trouver tous les liens de lieux
  const elements = await page.$$(SELECTORS.venueLinks);
  console.log(`Nombre d'éléments trouvés: ${elements.length}`);

  // Extraire les URLs
  const links = await page.$$eval(SELECTORS.venueLinks, (elements) => {
    return elements
      .map((e) => e.getAttribute('href'))
      .filter((href): href is string => href !== null)
      .map(href => {
        if (href.startsWith('http')) return href;
        return `https://www.mariages.net${href}`;
      });
  });

  // Filtrer les liens nuls et dédupliquer
  const uniqueLinks = [...new Set(links.filter((link): link is string => link !== null))];
  console.log(`Total de ${uniqueLinks.length} liens uniques trouvés`);

  return uniqueLinks;
}

async function scrapeVenuePage(page: Page, url: string): Promise<VenueData | null> {
  try {
    console.log(`Scraping de ${url}...`);
    await page.goto(url, PAGE_OPTIONS);

    // Fonction utilitaire pour extraire le texte avec fallback
    const getTextContent = async (selector: string, defaultValue: string = '') => {
      try {
        const element = await page.waitForSelector(selector, { timeout: 5000 });
        return element ? (await element.textContent() || defaultValue) : defaultValue;
      } catch {
        return defaultValue;
      }
    };

    // Fonction utilitaire pour extraire les images
    const getImages = async (selector: string) => {
      try {
        const images = await page.$$eval(selector, (elements) =>
          elements.map((img) => img.getAttribute('src')).filter((src): src is string => src !== null)
        );
        return images;
      } catch {
        return [];
      }
    };

    // Extraction des données avec fallback
    const name = await getTextContent('.appHeading, .storefront-header-title, h1');
    const type = await getTextContent('.app-emp-info-category, .storefront-header-info');
    const description = await getTextContent('.app-emp-description, .storefront-description');
    const price = await getTextContent('.app-emp-info-price, .storefront-header-price');
    const address = await getTextContent('.app-emp-info-address, .storefront-header-address');
    const capacity = await getTextContent('.app-emp-info-capacity, .storefront-header-capacity');
    const rating = await getTextContent('.app-emp-info-rating, .storefront-header-rating');
    const images = await getImages('.app-emp-gallery img, .storefront-gallery img');

    // Extraire la ville et la région de l'adresse
    const [city = '', region = ''] = address.split(',').map(s => s.trim());

    return {
      url,
      name: name.trim(),
      type: type.trim(),
      description: description.trim(),
      images,
      price: price.trim(),
      address: address.trim(),
      city,
      region,
      capacity: capacity.trim(),
      rating: rating.trim(),
    };
  } catch (error) {
    console.error(`Erreur lors du scraping de ${url}:`, error);
    return null;
  }
}

async function main() {
  console.log('Nettoyage de la base de données...');
  
  const browser = await chromium.launch(BROWSER_OPTIONS);
  const context = await browser.newContext(CONTEXT_OPTIONS);
  const page = await context.newPage();
  
  try {
    await page.goto('https://www.mariages.net/busc.php?id_grupo=1&id_sector=31&showmode=list&NumPage=1&userSearch=1&isNearby=0&priceType=menu', PAGE_OPTIONS);
    
    const venueLinks = await scrapeListPage(page);
    console.log(`Total de ${venueLinks.length} liens uniques trouvés`);
    
    const venues: VenueData[] = [];
    
    for (const url of venueLinks) {
      const venueData = await scrapeVenuePage(page, url);
      if (venueData) {
        venues.push(venueData);
      }
    }
    
    // Sauvegarder les données
    const outputPath = path.join(process.cwd(), 'data', 'venues.json');
    fs.writeFileSync(outputPath, JSON.stringify(venues, null, 2));
    console.log('Données sauvegardées dans:', outputPath);
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);