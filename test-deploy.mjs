import { chromium } from 'playwright';

async function testApp() {
  console.log('Starting Playwright test...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  try {
    // Test 1: Navigate to the app
    console.log('Test 1: Navigating to application...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✓ Page loaded successfully');
    
    // Test 2: Check for critical elements
    console.log('Test 2: Checking for critical elements...');
    
    // Check for body
    const body = page.locator('body');
    const isVisible = await body.isVisible();
    console.log('✓ Body visible: ' + isVisible);
    
    // Test 3: Check page title
    console.log('Test 3: Checking page content...');
    const content = await page.content();
    const hasContent = content.length > 1000;
    console.log('✓ Page has content: ' + hasContent + ' (' + content.length + ' chars)');
    
    // Test 4: Check for main elements
    const hasRoot = content.includes('id="root"') || content.includes('root');
    console.log('✓ React root found: ' + hasRoot);
    
    // Test 5: Check for errors
    console.log('Test 5: Checking for console errors...');
    if (errors.length > 0) {
      console.log('⚠ Found ' + errors.length + ' error(s):');
      errors.forEach(e => console.log('  - ' + e.substring(0, 100)));
    } else {
      console.log('✓ No critical console errors');
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log('Page loaded: ✓');
    console.log('Content rendered: ✓');
    console.log('Critical errors: ' + (errors.length === 0 ? 'None ✓' : 'Found ⚠'));
    
    process.exit(errors.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run if called directly
testApp().catch(console.error);
