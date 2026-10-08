'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.TEST_URL||'http://localhost:4010';
const output=path.resolve('.repair-backups/20261003/style-unification/modules');
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const context=await browser.newContext({reducedMotion:'reduce'});
    await context.addInitScript(()=>{sessionStorage.setItem('isPopupWindow','1');localStorage.setItem('darkmode','false');});
    const page=await context.newPage();
    for(const width of [1440,390,320,2335]){
      await page.setViewportSize({width,height:1000});
      for(const [route,layout,count] of [['/light_withme/key_part/','plan',4],['/light_withme/operator/','team',4],['/about/','about',2],['/posts/24.html','guide',13]]){
        await page.goto(base+route,{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>[...document.querySelectorAll('.post-header,.post-body')].every(n=>n.classList.contains('animated')&&Number(getComputedStyle(n).opacity)>.99));
        if(layout==='guide'){
          assert.equal(await page.locator('.guide-era-nav a').count(),count);
          assert.ok(await page.locator('.guide-era-nav a').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).minHeight==='58px'&&n.getBoundingClientRect().height>=57.9&&getComputedStyle(n).borderTopWidth==='1px')));
        }else assert.equal(await page.locator('.world-layout-'+layout).count(),count);
        if(layout==='team'){
          assert.equal(await page.locator('.world-person-card').count(),3);
          assert.equal(await page.locator('.world-person-name').count(),3);
          assert.equal(await page.locator('.world-person-role').count(),3);
          assert.equal(await page.locator('.world-person-meta').count(),2);
          assert.ok((await page.locator('.world-person-meta').first().getAttribute('data-date')).includes('2024-9-1'));
          assert.equal(await page.locator('.world-people-grid').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),width>=992?3:width>=768?2:1);
          const fold=page.locator('.world-person-card').first();
          assert.equal(await fold.evaluate(n=>n.open),false);
          await fold.locator('summary').click();
          assert.equal(await fold.evaluate(n=>n.open),true);
          assert.ok((await fold.textContent()).includes('起源建设者'));
          await fold.locator('summary').click();
          assert.equal(await page.locator('.world-module-grid > .note').count(),2);
          assert.equal(await page.locator('iframe[src*="friend_lists/mosae"]').count(),1);
          const resource=page.locator('.world-module-resource');
          assert.equal(await resource.getAttribute('data-file-kind'),'XLSX');
          assert.equal(await resource.locator('.world-resource-copy h3').textContent(),'管理条目');
          assert.ok((await resource.locator('.world-resource-action > a').getAttribute('href')).endsWith('.xlsx'));
          const heading=await resource.locator('h3').boundingBox(),description=await resource.locator('blockquote').boundingBox();
          assert.ok(Math.abs(heading.x-description.x)<1,'resource title and description align together');
        }
        if(layout==='about'){
          assert.equal(await page.locator('.world-contact-grid > .note').count(),2);
          assert.equal(await page.locator('.world-invitation-card').count(),1);
          assert.equal(await page.locator('.reward-item-content').count(),1);
          assert.ok((await page.locator('.reward-item-content').textContent()).includes('schrolemons'));
          assert.ok(await page.locator('.world-ui-copy').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).textIndent==='0px')));
          assert.ok(parseFloat(await page.locator('.world-invitation-card h3').evaluate(n=>getComputedStyle(n).fontSize))>=24);
        }
        for(const dark of [false,true]){
          await page.evaluate(d=>WorldTheme.set(d),dark);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} ${route} overflow`);
          const grid=page.locator('.world-module-grid').first();
          if(await grid.count())assert.equal(await grid.evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),width<768?1:2);
          const frame=await page.locator('.post-header,.reading-prose,.world-reading-guide,.folder-navigation,.collection-navigation,.comments').evaluateAll(ns=>ns.filter(n=>n.getBoundingClientRect().width>0).map(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right})));
          assert.ok(frame.every(n=>Math.abs(n.left-frame[0].left)<1&&Math.abs(n.right-frame[0].right)<1),`${width} ${route} complete column alignment`);
          if(width!==320){
            await page.addStyleTag({content:'.fireworks,canvas.fireworks,#__bs_notify__,.pace {visibility:hidden !important}'});
            await page.evaluate(()=>scrollTo(0,0));
            await page.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}-${layout}.png`),fullPage:layout!=='guide'});
            if(layout==='team'&&width===1440)await page.locator('.world-team-register').screenshot({path:path.join(output,`team-cards-1440-${dark?'dark':'light'}.png`)});
            if(layout==='team')await page.locator('.world-module-resource').screenshot({path:path.join(output,`resource-${width}-${dark?'dark':'light'}.png`)});
          }
          if(layout==='about'){
            assert.notEqual(await page.locator('.reward-item-money').evaluate(n=>getComputedStyle(n).color),await page.locator('.reward-item-money').evaluate(n=>getComputedStyle(n).backgroundColor));
            assert.equal(await page.locator('.world-qr-trigger').evaluate(n=>getComputedStyle(n,'::after').content),'none');
            const qr=page.locator('.world-qr-trigger'),url=page.url();
            await qr.click();
            const dialog=page.locator('.directory-qr-dialog');
            await dialog.waitFor({state:'visible'});
            assert.equal(page.url(),url,'QR opens without leaving the page');
            assert.equal(await dialog.locator('h2').textContent(),'添加微信');
            assert.equal(await dialog.locator('img').getAttribute('src'),'/images/wechat_channel.png');
            await dialog.locator('img').evaluate(n=>n.decode());
            assert.ok(await dialog.locator('img').evaluate(n=>n.naturalWidth>0),'original QR image loads');
            assert.equal(await dialog.locator('a').getAttribute('href'),await qr.getAttribute('href'));
            const bounds=await dialog.boundingBox();
            assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width,'QR fits viewport');
            if(width!==320)await page.screenshot({path:path.join(output,`wechat-${width}-${dark?'dark':'light'}.png`)});
            await page.keyboard.press('Escape');
            await dialog.waitFor({state:'hidden'});
            assert.ok(await qr.evaluate(n=>n===document.activeElement),'Escape restores focus');
            await qr.click();await dialog.locator('button').click();
            assert.ok(await qr.evaluate(n=>n===document.activeElement),'close button restores focus');
            await qr.click();await page.mouse.click(2,2);
            await dialog.waitFor({state:'hidden'});
          }
        }
        console.log(`PASS ${width} ${route}: content modules, folds/scripts and aligned full column in both themes`);
      }
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
