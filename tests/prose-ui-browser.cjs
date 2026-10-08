'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4012';
const db = JSON.parse(fs.readFileSync('db.json','utf8')).models;
const documents = [...db.Post,...db.Page].filter(n=>/\.md$/.test(n.source||''));
const selected = process.env.PROSE_SOURCE_FILTER ? documents.filter(n=>n.source.includes(process.env.PROSE_SOURCE_FILTER)) : documents;
const output = path.resolve('.repair-backups/20261004/prose-ui/previews');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
  await Promise.all([1440,390].map(async width=>{
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
   await context.route('**/browser-sync/**',r=>r.abort());
   await context.addInitScript(()=>{sessionStorage.isPopupWindow='1';localStorage.darkmode='false';});
   const page=await context.newPage();
   let links=0, quotes=0;
   for(const doc of selected){
    const route=doc.source.startsWith('_posts/')?'posts/'+doc.abbrlink+'.html':doc.path;
    await page.goto(base+'/'+route,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof WorldTheme!=='undefined'&&[...document.querySelectorAll('.post-block,.post-body')].every(n=>n.classList.contains('animated')&&Number(getComputedStyle(n).opacity)>.99));
    for(const dark of [false,true]){
     await page.mouse.move(0,0);
     await page.evaluate(d=>WorldTheme.set(d),dark);
     const data=await page.evaluate(()=>{
      const scope=document.querySelector('.reading-prose,.world-reading-guide');
      if(!scope)return {links:[],quotes:[],overflow:document.documentElement.scrollWidth>innerWidth+1};
      const anchors=[...scope.querySelectorAll(':is(p,li,td,dd,blockquote,h1,h2,h3,h4,h5,h6) a')].filter(n=>!n.matches('.btn,.headerlink,.fancybox,.world-qr-trigger,.directory-entry-link,.guide-content-item')&&!n.querySelector('img')&&!n.closest('.world-home,.tab'));
      return {links:anchors.map(n=>({text:n.textContent.slice(0,30),color:getComputedStyle(n).color,weight:Number(getComputedStyle(n).fontWeight)})),quotes:[...scope.querySelectorAll('blockquote')].map(n=>({font:getComputedStyle(n).fontFamily,border:getComputedStyle(n).borderLeftWidth,paragraphs:[...n.querySelectorAll('p,.world-paragraph-line')].map(p=>({align:getComputedStyle(p).textAlign,indent:getComputedStyle(p).textIndent}))})),overflow:document.documentElement.scrollWidth>innerWidth+1};
     });
     assert.equal(data.overflow,false,route+' '+width+' overflow');
     for(const link of data.links){assert.equal(link.color,dark?'rgb(243, 160, 171)':'rgb(163, 52, 69)',route+' default red '+link.text);assert.ok(link.weight>=600,route+' bold '+link.text);}
     for(const quote of data.quotes){assert.match(quote.font,/Noto Serif SC|SimSun/);assert.equal(quote.border,'1px',route+' quote border');for(const p of quote.paragraphs){assert.equal(p.align,'center',route+' quote centered');assert.equal(p.indent,'0px',route+' quote no indent');}}
     links+=data.links.length;quotes+=data.quotes.length;
     const anchor=page.locator(':is(.reading-prose,.world-reading-guide) :is(p,li,td,dd) a:not(.btn):not(.headerlink):not(.fancybox):not(.world-qr-trigger):not(:has(img)):visible').first();
     if(await anchor.count()){
      await anchor.hover();
      await page.waitForTimeout(250);
      const hover=await anchor.evaluate(n=>{
       const s=getComputedStyle(n),canvas=document.createElement('canvas'),c=canvas.getContext('2d');
       const rgb=value=>{c.clearRect(0,0,1,1);c.fillStyle=value;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data].slice(0,3)};
       return {color:rgb(s.color),expected:rgb(s.getPropertyValue('--prose-accent')),background:s.backgroundColor};
      });
      assert.ok(hover.color.every((v,i)=>Math.abs(v-hover.expected[i])<=1),route+' hover follows nearest context '+JSON.stringify(hover));
      assert.notEqual(hover.background,'rgba(0, 0, 0, 0)');
      await anchor.focus();
      await page.waitForTimeout(220);
      assert.equal(await anchor.evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
      await anchor.evaluate(n=>n.blur());
     }
    }
    if((documents.indexOf(doc)+1)%10===0)console.log(`${width}: audited ${documents.indexOf(doc)+1}/${documents.length} source routes`);
   }
   console.log(`PASS ${width}: ${selected.length} Markdown pages, ${links} links and ${quotes} quotes in both themes`);
   for(const size of [width, ...(width===390?[320]:[])]){
    await page.setViewportSize({width:size,height:1000});
    await page.goto(base+'/posts/27.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.post-body').classList.contains('animated'));
    await page.addStyleTag({content:'.fireworks,#__bs_notify__,.pace,.reading-progress-bar,.headband{visibility:hidden!important}'});
    for(const dark of [false,true]){
     await page.evaluate(d=>WorldTheme.set(d),dark);
     const steps=page.locator('.world-content-steps');
     assert.ok(await page.locator('.world-content-section').evaluateAll((ns,d)=>ns.every(n=>getComputedStyle(n).backgroundColor===(d?'rgb(28, 28, 27)':'rgb(252, 251, 248)')),dark));
     assert.ok(await page.locator('.reading-prose > hr').evaluateAll(ns=>ns.every(n=>{const s=getComputedStyle(n);return s.borderTopWidth==='0px'&&getComputedStyle(n,'::after').display==='none'&&n.getBoundingClientRect().height>=24})));
     assert.equal(await steps.count(),2);
     assert.equal(await steps.nth(0).locator('.world-content-step').count(),3);
     assert.equal(await steps.nth(1).locator('.world-content-step').count(),5);
     assert.ok(await page.locator('.world-content-step > h5').evaluateAll(ns=>ns.every(n=>{const s=getComputedStyle(n,'::before');return ['grid','inline-grid'].includes(s.display)&&s.content!=='none'&&parseFloat(s.width)>=30})));
     const natural=page.locator('.world-content-step p.world-natural-paragraph:not(.world-paragraph-lines)').filter({hasNot:page.locator('a')});
     const metrics=await natural.evaluateAll(ns=>ns.filter(n=>!n.closest('blockquote')).map(n=>({indent:parseFloat(getComputedStyle(n).textIndent),size:parseFloat(getComputedStyle(n).fontSize)})));
     assert.ok(metrics.length>0);metrics.forEach(n=>assert.ok(Math.abs(n.indent-2*n.size)<.1));
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
     if(size!==320){
      await page.locator('.world-content-panel').first().locator('blockquote').screenshot({path:path.join(output,`quote-${size}-${dark?'dark':'light'}.png`)});
      await steps.nth(0).locator('.world-content-step').first().screenshot({path:path.join(output,`oc-item-${size}-${dark?'dark':'light'}.png`)});
      await steps.nth(1).screenshot({path:path.join(output,`commission-${size}-${dark?'dark':'light'}.png`)});
     }
    }
    await page.goto(base+'/yinxing_world/commission/mosae.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.post-body').classList.contains('animated'));
    await page.addStyleTag({content:'.fireworks,#__bs_notify__,.pace,.reading-progress-bar,.headband{visibility:hidden!important}'});
    for(const dark of [false,true]){
     await page.evaluate(d=>WorldTheme.set(d),dark);
     const action=page.locator('#btn1-1');
     const resting=await action.boundingBox();
     assert.ok(await action.evaluate(n=>getComputedStyle(n).backgroundColor!=='rgb(255, 215, 0)'));
     await action.hover();
     await page.waitForTimeout(250);
     const hoverBox=await action.boundingBox();
     assert.ok(Math.abs(resting.height-hoverBox.height)<1);
     await action.click();
     await page.locator('.swal-overlay--show-modal').waitFor({state:'visible'});
     assert.ok((await page.locator('.swal-modal').textContent()).includes('You clicked the button!'));
     const modal=await page.locator('.swal-modal').evaluate(n=>({bg:getComputedStyle(n).backgroundColor,width:n.getBoundingClientRect().width,accent:getComputedStyle(n).getPropertyValue('--dialog-accent').trim()}));
     assert.equal(modal.bg,dark?'rgb(28, 28, 27)':'rgb(252, 251, 248)');
     assert.ok(modal.width<=size-30);assert.ok(modal.accent.length);
     if(size!==320)await page.locator('.swal-modal').screenshot({path:path.join(output,`dialog-${size}-${dark?'dark':'light'}.png`)});
     await page.locator('.swal-button').click();
     await page.locator('.swal-overlay--show-modal').waitFor({state:'detached'});
     if(size!==320){await action.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`button-${size}-${dark?'dark':'light'}.png`)});}
    }
    console.log(`PASS ${size}: numbered OC/commission items, natural indentation, original button/dialog behavior and light/dark screenshots`);
   }
   await context.close();
  }));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
