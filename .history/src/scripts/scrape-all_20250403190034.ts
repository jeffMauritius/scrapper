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

// Options de la page
const PAGE_OPTIONS = {
  waitUntil: 'networkidle' as const,
  timeout: 120000, // 2 minutes
};

// Options du contexte
const CONTEXT_OPTIONS = {
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  geolocation: { longitude: 2.3488, latitude: 48.8534 },
  locale: 'fr-FR',
  extraHTTPHeaders: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
};

async function scrapeListPage(page: Page, baseUrl: string): Promise<string[]> {
  console.log('Navigation vers:', baseUrl);
  await page.goto(baseUrl, PAGE_OPTIONS);
  console.log('Attente du chargement complet...');

  // Attendre que les éléments soient chargés
  await page.waitForSelector('a[href*="/chateau-mariage/"]', { timeout: 60000 });
  
  // Extraire les URLs
  const links = await page.$$eval('a[href*="/chateau-mariage/"]', (elements) => {
    return elements
      .map((e) => e.getAttribute('href'))
      .filter((href): href is string => href !== null)
      .map(href => {
        if (href.startsWith('http')) return href;
        return `https://www.mariages.net${href}`;
      });
  });

  // Filtrer les liens nuls et dédupliquer
  const uniqueLinks = [...new Set(links)];
  console.log(`Nombre d'éléments trouvés: ${uniqueLinks.length}`);
  console.log(`Total de ${uniqueLinks.length} liens uniques trouvés`);

  return uniqueLinks;
}

async function scrapeVenuePage(page: Page, url: string): Promise<VenueData | null> {
  try {
    console.log(`\nScraping de ${url}...`);
    await page.goto(url, PAGE_OPTIONS);

    // Fonction utilitaire pour extraire le texte avec fallback et logging
    const getTextContent = async (selector: string, fieldName: string, defaultValue: string = '') => {
      try {
        const element = await page.waitForSelector(selector, { timeout: 10000 }); // 10 secondes
        const text = element ? (await element.textContent() || defaultValue) : defaultValue;
        console.log(`${fieldName}: ${text}`);
        return text;
      } catch (error) {
        console.log(`Erreur lors de l'extraction de ${fieldName} avec le sélecteur ${selector}`);
        return defaultValue;
      }
    };

    // Fonction utilitaire pour extraire les images avec logging
    const getImages = async (selector: string) => {
      try {
        const images = await page.$$eval(selector, (elements) =>
          elements.map((img) => (img as HTMLImageElement).src).filter(Boolean)
        );
        console.log(`Images trouvées: ${images.length}`);
        return images;
      } catch (error) {
        console.log(`Erreur lors de l'extraction des images avec le sélecteur ${selector}`);
        return [];
      }
    };

    // Extraction des données avec les nouveaux sélecteurs et alternatives
    const name = await getTextContent('h1.storefrontHeading__title', 'Nom');
    const type = await getTextContent('.storefrontHeading__type', 'Type');
    const description = await getTextContent('.storefrontDescription__text', 'Description');
    const price = await getTextContent('.storefrontHeading__price', 'Prix');
    const address = await getTextContent('.app-heading-quick-link', 'Adresse');
    const capacity = await getTextContent('.storefrontFeatures__item--capacity', 'Capacité');
    const rating = await getTextContent('.storefrontHeading__rating', 'Note');
    const images = await getImages('.gallery-slider__image');

    // Extraire la ville et la région de l'adresse
    const addressParts = address.split(',').map(s => s.trim());
    const city = addressParts[0] || '';
    const region = addressParts[addressParts.length - 1] || '';

    const data = {
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

    console.log('Données extraites avec succès:', JSON.stringify(data, null, 2));
    return data;

  } catch (error) {
    console.error(`Erreur lors du scraping de ${url}:`, error);
    return null;
  }
}

async function saveData(venues: VenueData[]) {
  const outputPath = path.join(__dirname, '../../data/venues.json');
  fs.writeFileSync(outputPath, JSON.stringify(venues, null, 2));
  console.log('Données sauvegardées dans:', outputPath);
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext(CONTEXT_OPTIONS);
  const page = await context.newPage();

  try {
    console.log('Nettoyage de la base de données...');
    const baseUrl = 'https://www.mariages.net/busc.php?id_grupo=1&id_sector=31&showmode=list&NumPage=1&userSearch=1&isNearby=0&priceType=menu';
    
    // Scraper la première page uniquement
    console.log(`Navigation vers: ${baseUrl}`);
    const links = await scrapeListPage(page, baseUrl);
    console.log(`Total de ${links.length} liens uniques trouvés`);

    // Ne prendre que les 3 premiers châteaux
    const firstThreeLinks = links.slice(0, 3);
    console.log('Test sur les 3 premiers châteaux:', firstThreeLinks);

    // Scraper les détails de chaque lieu
    const venues: VenueData[] = [];
    for (const link of firstThreeLinks) {
      const venueData = await scrapeVenuePage(page, link);
      if (venueData) {
        venues.push(venueData);
      }
      // Attendre plus longtemps entre chaque requête pour éviter d'être bloqué
      await page.waitForTimeout(5000); // 5 secondes
    }

    // Sauvegarder les données
    await saveData(venues);
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);