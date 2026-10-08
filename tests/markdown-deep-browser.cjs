'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const db=JSON.parse(fs.readFileSync('db.json','utf8')).models;
const documents=[...db.Post,...db.Page].filter(n=>/\.md$/.test(n.source||'')).sort((a,b)=>a.source.localeCompare(b.source));
const selected=process.env.MARKDOWN_SOURCE_FILTER?documents.filter(n=>n.source.includes(process.env.MARKDOWN_SOURCE_FILTER)):documents;
const output=path.resolve('.repair-backups/20261003/style-unification/markdown-deep');
fs.mkdirSync(output,{recursive:true});
const base=process.env.TEST_URL||'http://localhost:4010';
(async()=>{
  assert.equal(documents.length,50,'recursive Markdown inventory');
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const records=[];
  const issues=[];
  try{
    await Promise.all([1440,390].map(async width=>{
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      await context.addInitScript(()=>{sessionStorage.setItem('isPopupWindow','1');localStorage.setItem('darkmode','false');});
      const page=await context.newPage();
      for(const doc of selected){
        const index=documents.indexOf(doc);
        const route=doc.source.startsWith('_posts/')?'posts/'+doc.abbrlink+'.html':doc.path;
        assert.equal((await page.goto(base+'/'+route,{waitUntil:'domcontentloaded'})).status(),200,route);
        await page.waitForFunction(()=>[...document.querySelectorAll('.post-block,.post-body,.post-header')].every(n=>n.classList.contains('animated')&&+getComputedStyle(n).opacity>.99));
        // Reveal original disclosures for checking their complete prose, without changing saved state.
        await page.locator('.post-body details').evaluateAll(ns=>ns.forEach(n=>n.open=true));
        for(const dark of [false,true]){
          await page.evaluate(d=>WorldTheme.set(d),dark);
          const result=await page.evaluate(()=>{
            const root=document.querySelector('.post-body')||document.querySelector('.content-directory'),css=n=>getComputedStyle(n);
            const visible=n=>!!n.getClientRects().length&&n.getBoundingClientRect().width>1&&css(n).visibility!=='hidden';
            const firstGlyph=n=>{
              const walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);let text;
              while(text=walker.nextNode())if(text.textContent.trim()&&!text.parentElement.closest('script,style,.world-person-date-source')&&visible(text.parentElement)){
                const offset=text.textContent.search(/\S/),range=document.createRange();range.setStart(text,offset);range.setEnd(text,offset+1);
                let inset=0;for(let inline=text.parentElement;inline;inline=inline.parentElement){inset+=parseFloat(css(inline).paddingLeft)+parseFloat(css(inline).borderLeftWidth);if(inline===n)break;}
                return range.getBoundingClientRect().left-n.getBoundingClientRect().left-inset;
              }
              return null;
            };
            const opaque=n=>{
              for(let p=n;p&&p!==document.body;p=p.parentElement){
                const s=css(p),color=s.backgroundColor,match=color.match(/rgba?\(([^)]+)\)/);
                if(match&&(match[1].split(',').length===3||Number(match[1].split(',')[3])>=.98))return true;
                // Chromium serializes opaque color-mix() surfaces as CSS Color 4, not rgb().
                if(/^(color|lab|lch|oklab|oklch)\(/.test(color)&&(!color.includes('/')||parseFloat(color.split('/')[1])>=.98))return true;
                // Directory gradients mix two fully opaque site surfaces.
                if(s.backgroundImage.includes('gradient')&&!s.backgroundImage.includes('rgba'))return true;
                if(p.matches('.home-hero')&&s.backgroundImage.includes('background.jpg'))return true;
              }return false;
            };
            const paragraphs=[...document.querySelectorAll('.reading-prose .world-natural-paragraph:not(.world-paragraph-lines),.reading-prose .world-paragraph-line')].filter(n=>visible(n)&&!n.closest('.world-ui-copy,.world-person-date-source,blockquote')).map(n=>({text:n.textContent.slice(0,45),delta:firstGlyph(n),size:parseFloat(css(n).fontSize),indent:css(n).textIndent,flush:!!n.closest('blockquote')||n.matches('.world-entry-paragraph,.world-entry-paragraph > .world-paragraph-line')||n.matches('.world-file-note > .world-natural-paragraph,.world-file-note > .world-paragraph-lines > .world-paragraph-line')}));
            const uncovered=[...document.querySelectorAll('.reading-prose p')].filter(n=>visible(n)&&n.textContent.trim()&&!n.closest('li,td,th,summary,.photos-item,.world-ui-copy,.world-person-identity')&&!n.classList.contains('world-natural-paragraph')&&!n.classList.contains('world-media-paragraph')&&!n.closest('[data-reading-style="poetry"]')).map(n=>n.textContent.slice(0,60));
            const exposed=[];
            if(root){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let t;while(t=walker.nextNode())if(t.textContent.trim()&&!t.parentElement.closest('script,style,.world-person-date-source,svg')&&visible(t.parentElement)&&!opaque(t.parentElement))exposed.push(t.textContent.trim().slice(0,55));}
            const header=document.querySelector('.post-header,.directory-header,.home-hero'),footer=document.querySelector('.post-footer'),body=root?.getBoundingClientRect();
            const clone=root?.cloneNode(true);clone?.querySelectorAll('script,style,[aria-hidden="true"]').forEach(n=>n.remove());
            return {paragraphs,uncovered,exposed,overflow:document.documentElement.scrollWidth>innerWidth+1,
              links:[...document.querySelectorAll('.reading-prose .world-natural-paragraph a,.reading-prose .world-ui-copy a')].filter(n=>!n.matches('.btn,.fancybox,.world-qr-trigger')&&!n.querySelector('img')).map(n=>({text:n.textContent,color:css(n).color,weight:+css(n).fontWeight})),
              metadata:[...document.querySelectorAll('.world-meta')].map(n=>({font:css(n).fontFamily,size:css(n).fontSize,indent:css(n).textIndent,align:css(n).justifyContent,text:n.textContent.replace(/\s+/g,' ').trim()})),
              breadcrumbs:[...document.querySelectorAll('.directory-breadcrumb,.breadcrumb')].map(n=>!!n.closest('.post-header,.directory-header')),
              ui:[...document.querySelectorAll('.world-ui-copy,.world-ui-copy>.world-paragraph-line')].filter(visible).map(n=>css(n).textIndent),
              header:header?{left:header.getBoundingClientRect().left,right:header.getBoundingClientRect().right,bg:css(header).backgroundColor}:null,
              footer:footer?{left:footer.getBoundingClientRect().left,right:footer.getBoundingClientRect().right,bg:css(footer).backgroundColor}:null,
              lastText:clone?.textContent.replace(/\s+/g,' ').trim().slice(-350),body:body?{left:body.left,right:body.right}:null,
              asset:document.querySelector('link[href*="main.css"]')?.getAttribute('href')};
          });
          const key=`${doc.source} ${width} ${dark?'dark':'light'}`;
          try {
          assert.equal(result.overflow,false,key+' overflow');
          assert.deepEqual(result.exposed,[],key+' unbacked body text');
          assert.deepEqual(result.uncovered,[],key+' unclassified prose');
          result.paragraphs.forEach(p=>{const expected=p.flush?0:2*p.size;if(p.delta!==null)assert.ok(Math.abs(p.delta-expected)<1,`${key}: actual first glyph ${p.delta} expected ${expected}: ${p.text}`);});
          result.metadata.forEach(m=>{assert.equal(m.size,'12px',key+' metadata size');assert.equal(m.align,'flex-start',key+' metadata alignment');assert.equal(m.indent,'0px',key+' metadata indent');});
          result.ui.forEach(indent=>assert.equal(indent,'0px',key+' UI indent'));
          result.links.forEach(link=>{assert.equal(link.color,dark?'rgb(243, 160, 171)':'rgb(163, 52, 69)',key+' red prose link: '+link.text);assert.ok(link.weight>=600,key+' emphasized prose link');});
          assert.ok(result.breadcrumbs.every(Boolean),key+' breadcrumb inside header');
          assert.match(result.asset,/main\.css\?v=[a-f0-9]{12}$/,'CSS content version');
          if(result.footer&&result.header){assert.ok(Math.abs(result.footer.left-result.header.left)<1&&Math.abs(result.footer.right-result.header.right)<1,key+' footer aligned');assert.notEqual(result.footer.bg,'rgba(0, 0, 0, 0)',key+' footer paper');}
          } catch(error) { issues.push(error.message);console.error('ISSUE '+error.message); }
          const prefix=`${String(index+1).padStart(2,'0')}-${width}-${dark?'dark':'light'}`;
          await page.addStyleTag({content:'.fireworks,#__bs_notify__,.pace{visibility:hidden!important}'});
          await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,prefix+'-top.png')});
          const content=await page.locator('.post-body').count()?page.locator('.post-body'):page.locator('.content-directory');
          if(await content.count())await content.evaluate(n=>{const last=[...n.children].reverse().find(e=>e.getBoundingClientRect().height>0);(last||n).scrollIntoView({block:'end'});});
          await page.screenshot({path:path.join(output,prefix+'-end.png')});
          records.push({source:doc.source,route,width,dark,...result});
        }
        console.log(`PASS ${width} ${doc.source}: actual paragraph glyphs, surfaces, header and ending in both themes`);
      }
      await context.close();
    }));
    fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(records,null,2));
    fs.writeFileSync(path.join(output,'issues.json'),JSON.stringify(issues,null,2));
    assert.deepEqual(issues,[],'every Markdown top, prose and ending passes');
    console.log(`PASS ${documents.length} Markdown sources / ${records.length} theme and viewport checks; top/end screenshots saved.`);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
