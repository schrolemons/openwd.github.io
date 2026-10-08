'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4010';
const output = path.resolve('.repair-backups/20261003/style-unification/typography');
fs.mkdirSync(output, {recursive:true});
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const context = await browser.newContext({reducedMotion:'reduce'});
    await context.addInitScript(() => {sessionStorage.setItem('isPopupWindow','1'); localStorage.setItem('darkmode','false');});
    const page = await context.newPage();
    let paragraphs=0, bold=0, code=0;
    for (const width of [1440,390,320]) {
      await page.setViewportSize({width,height:1000});
      for (const route of ['/posts/7.html','/posts/15.html','/posts/18.html','/about/','/posts/24.html']) {
        await page.goto(base+route,{waitUntil:'domcontentloaded'});
        await page.waitForFunction(() => [...document.querySelectorAll('.post-body,.post-header')].every(n=>n.classList.contains('animated') && Number(getComputedStyle(n).opacity)>.99));
        for (const dark of [false,true]) {
          await page.evaluate(dark=>WorldTheme.set(dark),dark);
          const data=await page.evaluate(() => {
            const style=n=>getComputedStyle(n);
            const prose=document.querySelector('.reading-prose') || document.querySelector('.world-reading-guide');
            return {
              paragraphs:[...prose.querySelectorAll('.world-natural-paragraph:not(.world-paragraph-lines),.world-paragraph-line')].filter(n=>!n.closest('.world-ui-copy')).map(n=>({indent:parseFloat(style(n).textIndent),size:parseFloat(style(n).fontSize),flush:!!n.closest('blockquote')||n.matches('.world-entry-paragraph,.world-entry-paragraph > .world-paragraph-line')||n.matches('.world-file-note > .world-natural-paragraph,.world-file-note > .world-paragraph-lines > .world-paragraph-line')})),
              bold:[...prose.querySelectorAll('.world-natural-paragraph strong')].map(n=>({font:style(n).fontFamily,parentFont:style(n.parentElement).fontFamily,size:style(n).fontSize,parentSize:style(n.parentElement).fontSize,weight:style(n).fontWeight})),
              code:[...prose.querySelectorAll('p code,li code')].map(n=>({font:style(n).fontFamily,size:parseFloat(style(n).fontSize),parentSize:parseFloat(style(n.parentElement).fontSize)})),
              media:[...prose.querySelectorAll('.world-media-paragraph,.photos-item>p')].map(n=>style(n).textAlign),
              glyph:document.querySelector('.world-theme-toggle').textContent.trim(),
              mark:!!document.querySelector('.world-theme-mark'),
              header:document.querySelector('.post-header').getBoundingClientRect().width,
              body:prose.getBoundingClientRect().width
            };
          });
          data.paragraphs.forEach(n=>assert.ok(Math.abs(n.indent-(n.flush?0:2*n.size))<.1,`${route} chapter text aligns left, other natural paragraphs retain indentation`));
          data.bold.forEach(n=>{assert.equal(n.font,n.parentFont);assert.equal(n.size,n.parentSize);assert.equal(n.weight,'700');});
          data.code.forEach(n=>{assert.match(n.font,/Cascadia Code|Consolas/);assert.ok(Math.abs(n.size/n.parentSize-.9)<.01);});
          data.media.forEach(n=>assert.equal(n,'center'));
          assert.equal(data.glyph,''); assert.equal(data.mark,true);
          assert.ok(Math.abs(data.header-data.body)<1,`${route} header/reading width`);
          paragraphs+=data.paragraphs.length;bold+=data.bold.length;code+=data.code.length;
          if(route==='/posts/7.html') await page.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}-leiyun.png`)});
        }
      }
    }
    assert.ok(paragraphs>0&&bold>0&&code>0,'real source covers paragraphs, bold and inline code');
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(base+'/posts/7.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>[...document.querySelectorAll('.post-body,.post-header')].every(n=>n.classList.contains('animated') && Number(getComputedStyle(n).opacity)>.99));
    for(const dark of [false,true]) {
      await page.evaluate(d=>WorldTheme.set(d),dark);
      for(const selector of ['.sidebar-nav-toc','.post-toc .nav .active-current > a','.menu-item a']) {
        const control=page.locator(selector).first();
        await control.hover();
        await page.waitForFunction(selector=>{
          const node=document.querySelector(selector),probe=document.createElement('span');
          probe.style.color='var(--world-ink)';document.body.append(probe);
          const match=getComputedStyle(node).color===getComputedStyle(probe).color;probe.remove();return match;
        },selector);
        if(selector==='.menu-item a') {
          const palette=await control.evaluate(n=>{const probe=document.createElement('span');probe.style.background='var(--world-hover)';document.body.append(probe);const result=[getComputedStyle(n).backgroundColor,getComputedStyle(probe).backgroundColor];probe.remove();return result;});
          assert.equal(palette[0],palette[1],'navigation hover uses neutral blue-grey');
        }
      }
    }
    console.log(`PASS ${paragraphs} paragraph indents, ${bold} bold runs, ${code} inline code runs, aligned headers, centred media and abstract theme controls across three widths and both themes.`);
    console.log('PASS neutral navigation and current/sidebar table-of-contents hover in both themes.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
