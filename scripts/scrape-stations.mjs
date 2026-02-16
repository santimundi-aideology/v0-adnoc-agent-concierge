import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const REGIONS = [
  { name: 'Abu Dhabi', value: '1ACBB48FA33649FF902E28FB4F8A7F9B' },
  { name: 'Ajman', value: '3CE70824C10348B4856ABC6ABDD9F79F' },
  { name: 'Al Ain', value: 'E19FF525F88645AF9C64C7034879752B' },
  { name: 'Al Dhafra', value: '32F757202DF64113B0707910758D8ECE' },
  { name: 'Dubai', value: '2B990BD6245A41669E6FF7958A5C58BE' },
  { name: 'Fujairah', value: '4E6DD5625DA44F55B54029ED32A0FEA5' },
  { name: 'Ras Al Khaimah', value: '19A460E9DB4E44EAAD151FCCEF6E4264' },
  { name: 'Sharjah', value: '1BC05E8B85E44775BAE0DD8033972666' },
  { name: 'Umm Al Quwain', value: '496E77E593EA4C3785B330FFDAD358BE' },
];

async function scrapeRegion(page, region) {
  const stations = [];

  // Set region in URL and navigate
  const url = `https://www.adnocdistribution.ae/en/find-station?Latitude=24.4539&Longtitude=54.3773&Keyword=&Region=${region.value}&Services=`;
  
  // Listen for the API response
  const apiResponsePromise = page.waitForResponse(
    resp => resp.url().includes('/api/Location/StationFinder'),
    { timeout: 30000 }
  ).catch(() => null);
  
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  // Wait for the page to be ready
  await page.waitForSelector('#btnSearchLocations', { timeout: 15000 });
  await page.waitForTimeout(2000);
  
  // Click the search button using Playwright's click (handles scrolling)
  await page.locator('#btnSearchLocations').click({ force: true });
  
  // Wait for API response
  const apiResponse = await apiResponsePromise;
  
  if (apiResponse) {
    try {
      const text = await apiResponse.text();
      console.log(`  API response: ${apiResponse.status()} (${text.length} chars)`);
      
      if (apiResponse.status() === 200) {
        try {
          const data = JSON.parse(text);
          return { region: region.name, data, raw: null };
        } catch {
          return { region: region.name, data: null, raw: text };
        }
      } else {
        console.log(`  API returned ${apiResponse.status()}`);
      }
    } catch (e) {
      console.log(`  Error reading response: ${e.message}`);
    }
  } else {
    console.log('  No API response captured');
  }

  // Wait for DOM to be populated
  await page.waitForTimeout(5000);

  // Try to extract from DOM - the station list panel
  const domStations = await page.evaluate(() => {
    const results = [];
    
    // Look for station items in the panel
    const panel = document.querySelector('.panel1') || document.querySelector('.find-station__listing-wrapper');
    if (!panel) return results;
    
    // Get all station blocks
    const blocks = panel.querySelectorAll('.row');
    blocks.forEach(block => {
      const nameEl = block.querySelector('h6, h5, strong');
      const addressEl = block.querySelector('p, small, .address');
      const distanceEl = block.querySelector('.badge, .km, [class*="distance"]');
      const serviceEls = block.querySelectorAll('.service-tag, .badge-service');
      
      if (nameEl) {
        const services = [];
        serviceEls.forEach(s => services.push(s.textContent.trim()));
        
        results.push({
          name: nameEl.textContent.trim(),
          address: addressEl?.textContent?.trim() || '',
          distance: distanceEl?.textContent?.trim() || '',
          services,
        });
      }
    });
    
    return results;
  });

  return { region: region.name, data: domStations, raw: null };
}

async function scrapeAllStations() {
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ]
  });
  
  const context = await browser.newContext({
    geolocation: { latitude: 24.4539, longitude: 54.3773 },
    permissions: ['geolocation'],
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });

  // Remove navigator.webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
  });

  const page = await context.newPage();

  // Collect all API response data
  const allRawResponses = [];
  page.on('response', async (response) => {
    if (response.url().includes('/api/Location/StationFinder')) {
      try {
        const text = await response.text();
        allRawResponses.push({
          url: response.url(),
          status: response.status(),
          body: text,
        });
      } catch {}
    }
  });

  // Initial page load - let Akamai do its thing
  console.log('Loading page and waiting for Akamai challenge...');
  await page.goto('https://www.adnocdistribution.ae/en/find-station', { 
    waitUntil: 'networkidle',
    timeout: 60000 
  });
  await page.waitForTimeout(5000);
  
  // Interact naturally - scroll around to look more human
  await page.mouse.move(400, 300);
  await page.waitForTimeout(1000);
  await page.mouse.move(500, 400);
  await page.waitForTimeout(1000);

  // Now try the first search to see if we get through
  console.log('\nAttempting first search (Abu Dhabi)...');
  
  // Select Abu Dhabi region
  await page.selectOption('.options-region', '1ACBB48FA33649FF902E28FB4F8A7F9B');
  await page.waitForTimeout(1000);
  
  // Click search
  await page.locator('#btnSearchLocations').click({ force: true });
  await page.waitForTimeout(8000);

  console.log(`API responses so far: ${allRawResponses.length}`);
  
  if (allRawResponses.length > 0) {
    const lastResp = allRawResponses[allRawResponses.length - 1];
    console.log(`Last response status: ${lastResp.status}, length: ${lastResp.body.length}`);
    console.log(`First 200 chars: ${lastResp.body.substring(0, 200)}`);
  }

  // Check if stations appeared in DOM
  const hasStations = await page.evaluate(() => {
    const panel = document.querySelector('.panel1');
    if (panel) {
      return panel.innerHTML.length;
    }
    // Try other selectors
    const listItems = document.querySelectorAll('.find-station__listing-wrapper h6');
    return listItems.length;
  });
  console.log(`DOM stations content length/count: ${hasStations}`);

  // Get the full page HTML to analyze the structure
  const html = await page.content();
  writeFileSync('scripts/page-after-search.html', html);
  console.log('Saved page HTML after search');

  // Try extracting station data from the page
  const extractedStations = await page.evaluate(() => {
    const stations = [];
    
    // Try to find stations in the DOM using various selectors
    const allText = document.querySelector('.panel1')?.innerHTML || 
                    document.querySelector('.find-station__listing-wrapper')?.innerHTML || '';
    
    // Look for station number patterns like "(XXX)" which appear in station names
    const stationPattern = /([^<]+)\s*\((\d+)\)/g;
    let match;
    while ((match = stationPattern.exec(allText)) !== null) {
      stations.push({ name: match[1].trim(), number: match[2] });
    }
    
    // Also get the full HTML of the station list area
    return {
      stations,
      html: allText.substring(0, 5000),
      bodyClasses: document.body.className,
    };
  });

  console.log(`\nExtracted ${extractedStations.stations.length} stations from DOM pattern matching`);
  console.log(`Body classes: ${extractedStations.bodyClasses}`);
  if (extractedStations.html) {
    console.log(`\nStation HTML preview:\n${extractedStations.html.substring(0, 500)}`);
  }

  // Save raw responses
  writeFileSync('scripts/api-responses.json', JSON.stringify(allRawResponses, null, 2));
  writeFileSync('scripts/extracted-stations.json', JSON.stringify(extractedStations, null, 2));
  
  await browser.close();
}

scrapeAllStations().catch(console.error);
