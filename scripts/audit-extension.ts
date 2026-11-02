import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('audit-screenshots');
const ARTIFACT_DIR = path.resolve('C:\\Users\\Ridhi Gupta\\.gemini\\antigravity\\brain\\f15c7f59-8116-446f-bc51-6afb6c37c7df');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runAudit() {
  console.log('🚀 Launching Chrome Headless via CDP Pipe for DataLens Full Upgrade Audit...');
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      pipe: true,
      defaultViewport: {
        width: 440,
        height: 850,
        deviceScaleFactor: 2,
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--allow-file-access-from-files',
      ],
    });

    const page = await browser.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('❌ Browser Console Error:', msg.text());
      }
    });

    console.log('📸 1. Auditing Initial Side Panel State...');
    const sidepanelPath = `file:///${path.resolve('dist/sidepanel.html').replace(/\\/g, '/')}`;
    await page.goto(sidepanelPath, { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_initial_state.png') });
    console.log('   Saved: 01_initial_state.png');

    console.log('📸 2. Auditing Dataset Detection, Recommendations & AI Insights...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const scanBtn = btns.find((b) => b.textContent && (b.textContent.includes('Scan Page') || b.textContent.includes('Re-scan')));
      if (scanBtn) scanBtn.click();
    });

    await page.waitForFunction(() => document.querySelectorAll('select').length >= 2, { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_scanned_tables.png') });
    console.log('   Saved: 02_scanned_tables.png');

    console.log('📸 3. Auditing Intelligent Data Cleaning Assistant Modal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cleanBtn = btns.find((b) => b.textContent && b.textContent.includes('Clean Data'));
      if (cleanBtn) cleanBtn.click();
    });

    await page.waitForFunction(() => document.body.innerText.includes('Intelligent Data Cleaning Assistant'), { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_data_cleaning_modal.png') });
    console.log('   Saved: 03_data_cleaning_modal.png');

    // Close cleaning modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const doneBtn = btns.find((b) => b.textContent && b.textContent.trim() === 'Done');
      if (doneBtn) doneBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    console.log('📸 4. Auditing Descriptive Statistics Calculation (Mean)...');
    await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      const funcSelect = Array.from(selects).find((s) => Array.from(s.options).some((o) => o.value === 'MEAN'));
      if (funcSelect) {
        funcSelect.value = 'MEAN';
        funcSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btns = Array.from(document.querySelectorAll('button'));
      const runBtn = btns.find((b) => b.textContent && b.textContent.includes('Analyse Dataset'));
      if (runBtn) runBtn.click();
    });

    await page.waitForFunction(() => document.body.innerText.includes('Current Analysis Result'), { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_descriptive_stats_mean.png') });
    console.log('   Saved: 04_descriptive_stats_mean.png');

    console.log('📸 5. Auditing Interactive Plotly Box Plot Distribution with Outliers...');
    await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      const funcSelect = Array.from(selects).find((s) => Array.from(s.options).some((o) => o.value === 'BOX_PLOT'));
      if (funcSelect) {
        funcSelect.value = 'BOX_PLOT';
        funcSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btns = Array.from(document.querySelectorAll('button'));
      const runBtn = btns.find((b) => b.textContent && b.textContent.includes('Analyse Dataset'));
      if (runBtn) runBtn.click();
    });

    await page.waitForFunction(() => document.querySelector('.js-plotly-plot') !== null, { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_visualisation_boxplot.png') });
    console.log('   Saved: 05_visualisation_boxplot.png');

    console.log('📸 6. Auditing Conversational Data Assistant (Natural Language Q&A)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const aiTabBtn = btns.find((b) => b.textContent && b.textContent.includes('AI Assistant'));
      if (aiTabBtn) aiTabBtn.click();
    });

    await page.waitForFunction(() => document.body.innerText.includes('Conversational Data Assistant'), { timeout: 8000 });
    // Click first suggestion pill
    await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('button'));
      const promptPill = pills.find((b) => b.textContent && b.textContent.includes('average'));
      if (promptPill) promptPill.click();
    });

    await new Promise((r) => setTimeout(r, 1400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_conversational_ai_chat.png') });
    console.log('   Saved: 06_conversational_ai_chat.png');

    console.log('📸 7. Auditing "Compare & Analyse" Feature Modal...');
    // Return to workspace
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const wsBtn = btns.find((b) => b.textContent && b.textContent.includes('Workspace'));
      if (wsBtn) wsBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const compareBtn = btns.find((b) => b.textContent && b.textContent.includes('Compare'));
      if (compareBtn) compareBtn.click();
    });

    await page.waitForFunction(() => document.body.innerText.includes('Compare & Analyse Numerical Columns'), { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_compare_columns_modal.png') });
    console.log('   Saved: 07_compare_columns_modal.png');

    // Close compare modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const doneBtn = btns.find((b) => b.textContent && b.textContent.trim() === 'Done');
      if (doneBtn) doneBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    console.log('📸 8. Auditing Paginated Raw Data Grid View...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gridBtn = btns.find((b) => b.textContent && b.textContent.includes('Data Grid'));
      if (gridBtn) gridBtn.click();
    });

    await page.waitForFunction(() => document.querySelector('table') !== null, { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_paginated_data_grid.png') });
    console.log('   Saved: 08_paginated_data_grid.png');

    // Copy screenshots to Artifact Directory
    console.log('📋 Copying audit screenshots to brain artifact directory...');
    const files = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.endsWith('.png'));
    for (const file of files) {
      const src = path.join(SCREENSHOT_DIR, file);
      const dest = path.join(ARTIFACT_DIR, file);
      fs.copyFileSync(src, dest);
      console.log(`   Copied -> ${dest}`);
    }

    console.log('✅ All 8 Upgrade Audit Screenshots Successfully Captured!');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
