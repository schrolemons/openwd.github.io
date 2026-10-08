'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const output=path.resolve('.repair-backups/20261003/style-unification/plan-links');fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const context=await browser.newContext({reducedMotion:'reduce'});
    await context.route('**/browser-sync/**',route=>route.abort());
    await context.addInitScript(()=>{sessionStorage.setItem('isPopupWindow','1');localStorage.setItem('darkmode','false');});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    async function visit(route){
      assert.equal((await page.goto((process.env.TEST_URL||'http://localhost:4010')+route,{waitUntil:'domcontentloaded'})).status(),200);
      await page.waitForFunction(()=>typeof WorldTheme!=='undefined'&&document.querySelector('.post-header')&&document.querySelector('.post-body')&&[...document.querySelectorAll('.post-header,.post-body')].every(n=>n.classList.contains('animated')&&Number(getComputedStyle(n).opacity)>.99));
      await page.addStyleTag({content:'.fireworks,#__bs_notify__,.pace{visibility:hidden!important}'});
    }
    async function verifyLink(link){
      await page.mouse.move(0,0);await link.evaluate(n=>n.blur());
      const before=await link.evaluate(n=>({href:n.getAttribute('href'),colour:getComputedStyle(n).color,rect:[n.getBoundingClientRect().width,n.getBoundingClientRect().height]}));
      await link.hover();
      const hover=await link.evaluate(n=>{const css=getComputedStyle(n);return {colour:css.color,background:css.backgroundColor,border:css.borderBottomWidth,style:css.borderBottomStyle,rect:[n.getBoundingClientRect().width,n.getBoundingClientRect().height]};});
      assert.notEqual(hover.colour,before.colour,'hover changes the text colour');
      assert.notEqual(hover.background,'rgba(0, 0, 0, 0)','hover adds a colour surface');
      assert.equal(hover.border,'1px');assert.equal(hover.style,'solid','underline stays visible');
      assert.deepEqual(hover.rect,before.rect,'hover does not shift the line layout');
      assert.equal(await link.getAttribute('href'),before.href);
      await page.mouse.move(0,0);await page.keyboard.press('Tab');await link.focus();
      assert.ok(await link.evaluate(n=>n.matches(':focus-visible')),'keyboard gets the same visible response');
      assert.equal(await link.evaluate(n=>getComputedStyle(n).color),hover.colour);
      await link.evaluate(n=>n.blur());
    }
    for(const width of [1440,1092,390,320]){
      await page.setViewportSize({width,height:1000});
      await visit('/light_withme/key_part/');
      for(const dark of [false,true]){
        await page.evaluate(value=>WorldTheme.set(value),dark);
        const headings=await page.locator('.world-layout-plan .world-module-heading h3').evaluateAll(ns=>ns.map(n=>{
          const prefix=n.querySelector('.world-module-eyebrow'),title=n.querySelector('.world-module-title');
          return {title:title?.textContent,prefix:prefix?.textContent,hidden:prefix?getComputedStyle(n.querySelector('.world-module-delimiter')).display:null,left:prefix?title.getBoundingClientRect().left-prefix.getBoundingClientRect().right:null,delta:prefix?Math.abs(title.getBoundingClientRect().top-prefix.getBoundingClientRect().top):null};
        }));
        assert.equal(headings.length,3);
        assert.deepEqual(headings.map(n=>n.title),['logo设计','现况','内容']);
        assert.ok(headings.every(n=>!n.prefix||(!n.prefix.endsWith('-')&&n.hidden==='none'&&n.left>=10&&n.delta<18)),'contextual headings use one line; concise source headings need no prefix');
        const task=page.locator('.world-plan-task').first();
        const paper=await task.evaluate(n=>{const probe=document.createElement('i');probe.style.color='var(--world-paper)';n.append(probe);const colour=getComputedStyle(probe).color;probe.remove();return colour;});
        assert.equal(await task.evaluate(n=>getComputedStyle(n).backgroundColor),paper,'task 01 has no green wash');
        const cards=await page.locator('.world-plan-task,.world-participation-step').evaluateAll(ns=>ns.map(n=>({background:getComputedStyle(n).backgroundColor,radius:getComputedStyle(n).borderRadius,padding:getComputedStyle(n).paddingTop,indexPosition:getComputedStyle(n,'::before').position})));
        assert.ok(cards.every(card=>card.background===paper&&card.radius==='8px'&&card.indexPosition==='absolute'&&(width>=768||card.padding==='58px')),`task and participation cards keep consistent paper, corners, and independent number placement: ${JSON.stringify(cards)}`);
        const welcome=page.locator('.world-welcome-line'),status=page.locator('.world-status-line');
        assert.equal(await welcome.count(),1);
        assert.equal(await welcome.evaluate(n=>getComputedStyle(n).backgroundColor),await status.evaluate(n=>getComputedStyle(n).backgroundColor),'welcome and status share the coloured notice');
        assert.equal(await welcome.evaluate(n=>getComputedStyle(n).textIndent),'0px');
        assert.equal(await welcome.evaluate(n=>getComputedStyle(n).borderTopWidth),'1px');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await verifyLink(page.locator('.world-plan-action').filter({hasText:'选择方式'}));
        if(width!==320)for(const name of ['status','participation'])await page.locator('.world-plan-'+name).screenshot({path:path.join(output,`${name}-${width}-${dark?'dark':'light'}.png`)});
        const link=page.locator('.world-plan-action').filter({hasText:'光与流辰'});await link.hover();
        if(width!==320)await page.locator('.world-plan-participation').screenshot({path:path.join(output,`link-hover-${width}-${dark?'dark':'light'}.png`)});
      }
      for(const [route,selector] of [['/about/','.world-invitation-card p a'],['/posts/97.html','.reading-prose p a:not(.headerlink)'],['/light_withme/operator/','.world-collaboration-entry a']]){
        await visit(route);
        for(const dark of [false,true]){await page.evaluate(value=>WorldTheme.set(value),dark);await verifyLink(page.locator(selector).first());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
      }
      console.log(`PASS ${width}: horizontal headings, task 01 paper, welcome notice, hover/focus colour surfaces in both themes on four pages`);
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
