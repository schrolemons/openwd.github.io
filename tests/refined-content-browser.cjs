'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.TEST_URL||'http://localhost:4010';
const output=path.resolve('.repair-backups/20261003/style-unification/refined');
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const context=await browser.newContext({reducedMotion:'reduce'});
    await context.route('**/browser-sync/**',route=>route.abort());
    await context.addInitScript(()=>{sessionStorage.setItem('isPopupWindow','1');localStorage.setItem('darkmode','false');});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    async function visit(route){
      assert.equal((await page.goto(base+route,{waitUntil:'domcontentloaded'})).status(),200);
      await page.waitForFunction(()=>typeof WorldTheme!=='undefined'&&document.querySelector('.post-block')&&[...document.querySelectorAll('.post-block,.post-header,.post-body')].every(n=>n.classList.contains('animated')&&Number(getComputedStyle(n).opacity)>.99));
      await page.addStyleTag({content:'.fireworks,#__bs_notify__,.pace{visibility:hidden!important}'});
    }
    for(const width of [1440,390,320]){
      await page.setViewportSize({width,height:1000});
      for(const route of ['/light_withme/key_part/','/about/','/posts/16.html','/posts/24.html','/archives/','/tags/']){
        await visit(route);
        for(const dark of [false,true]){
          await page.evaluate(value=>WorldTheme.set(value),dark);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} ${width} ${dark} overflow`);
          if(route.includes('key_part')){
            assert.deepEqual(await page.locator('.world-triad-term').evaluateAll(ns=>ns.map(n=>n.dataset.label)),['感知','创造','记录']);
            assert.equal(await page.locator('.world-triad-index i,.world-triad-index svg,.world-triad-index img,.world-logo-symbol').count(),0);
            assert.equal(await page.locator('.world-logo-detail').count(),3);
            assert.equal(await page.locator('.world-plan-task').count(),2);
            assert.equal(await page.locator('.world-participation-step').count(),2);
            assert.equal(await page.locator('.world-logo-details').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),width<768?1:3);
            if(width!==320){
              for(const part of ['logo','status','participation'])await page.locator('.world-plan-'+part).screenshot({path:path.join(output,`plan-${part}-${width}-${dark?'dark':'light'}.png`)});
            }
          }
          if(route==='/about/'){
            const amount=page.locator('.reward-item-money');
            assert.ok((await amount.textContent()).includes('999999'));
            const contrast=await amount.evaluate(n=>{
              const rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
              const lum=value=>{const c=rgb(value);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
              const probe=document.createElement('span');probe.style.color='var(--world-paper)';n.append(probe);
              const foreground=lum(getComputedStyle(n).color),background=lum(getComputedStyle(probe).color);probe.remove();
              return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
            });
            assert.ok(contrast>=4.5,`amount contrast ${contrast}`);
            if(width!==320)await page.locator('.reward-wrap').screenshot({path:path.join(output,`reward-${width}-${dark?'dark':'light'}.png`)});
          }
          if(route==='/posts/16.html'){
            assert.ok(await page.locator('.world-file-note').count()>0);
            assert.ok(await page.locator('.world-file-note > .world-file-title').evaluateAll(ns=>ns.every(n=>{
              const title=getComputedStyle(n),rule=getComputedStyle(n,'::after');
              return title.borderTopWidth==='0px'&&title.clipPath==='none'&&title.backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(n.parentElement).boxShadow==='none'&&rule.height==='1px'&&rule.borderLeftWidth==='0px'&&rule.borderBottomWidth==='0px';
            })),'plain paper headings with a fine rule, no folded corner or stacked shadow');
            if(width!==320){
              await page.locator('.world-prose-section').nth(1).screenshot({path:path.join(output,`file-${width}-${dark?'dark':'light'}.png`)});
              await page.locator('.world-prose-section').nth(1).locator('.world-file-note').first().screenshot({path:path.join(output,`file-tag-${width}-${dark?'dark':'light'}.png`)});
            }
          }
          if(width===1440&&['/posts/24.html','/archives/','/tags/'].includes(route)){
            const selector=route==='/posts/24.html'?'.guide-article[data-tone] h3 a:not(.headerlink)':route==='/archives/'?'.directory-entry[data-tone] .directory-entry-link':'.directory-tag-preview-link[data-tone]';
            const links=page.locator(selector),colours=new Map();
            for(let index=0;index<await links.count();index++){
              const link=links.nth(index),tone=await link.evaluate(n=>n.closest('[data-tone]').dataset.tone);
              if(colours.has(tone))continue;
              await link.hover();
              const colour=await link.evaluate(n=>{
                const css=getComputedStyle(n),probe=document.createElement('span');probe.style.color=css.getPropertyValue('--directory-accent');n.append(probe);
                const expected=getComputedStyle(probe).color;probe.remove();
                return {actual:css.color,expected,background:css.backgroundColor};
              });
              assert.equal(colour.actual,colour.expected,`${route} ${tone} semantic hover`);
              assert.notEqual(colour.background,'rgba(0, 0, 0, 0)');colours.set(tone,colour.background);
              if(route==='/posts/24.html'&&['amber','green'].includes(tone))await link.locator('xpath=ancestor::article[1]').screenshot({path:path.join(output,`hover-${tone}-${dark?'dark':'light'}.png`)});
            }
            assert.ok(colours.size>=3,`${route} at least three semantic tones`);
            assert.equal(new Set(colours.values()).size,colours.size,`${route} distinct hover backgrounds`);
          }
          if(route==='/posts/16.html'){
            const link=page.locator('.post-nav [data-tone] a').first();
            await link.hover();
            assert.equal(await link.evaluate(n=>getComputedStyle(n).backgroundImage),'none','neighbour article uses semantic hover rather than the generic gold sweep');
            const expected=await link.evaluate(n=>{const probe=document.createElement('span');probe.style.color='var(--directory-accent)';n.append(probe);const value=getComputedStyle(probe).color;probe.remove();return value;});
            assert.equal(await link.evaluate(n=>getComputedStyle(n).color),expected,'neighbour article tone');
          }
        }
        console.log(`PASS ${width} ${route}: both themes, source modules, file titles, semantic hovers`);
      }
    }
    assert.deepEqual(errors,[],'no runtime errors');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
