'use strict';
const cheerio = require('cheerio');
const {prepend}=require('domutils');
const layouts = {
  'light_withme/key_part/index.md': 'plan',
  'light_withme/operator/index.md': 'team',
  'about/index.md': 'about'
};
function labelHeading($, heading, delimiter, labelClass, titleClass, hideDelimiter=false) {
  const title=$(heading),children=title.contents().toArray();
  const textNodes=children.filter(node=>node.type==='text'&&node.data.trim());
  if(textNodes.length!==1)return;
  const target=textNodes[0],text=target.data,cut=text.indexOf(delimiter);
  if(cut<0){
    if(hideDelimiter)$(target).replaceWith($('<span></span>').addClass(titleClass).text(text));
    return;
  }
  title.empty();
  for(const child of children){
    if(child!==target){title.append(child);continue;}
    title.append($('<span></span>').addClass(labelClass).text(text.slice(0,hideDelimiter?cut:cut+1)));
    if(hideDelimiter)title.append($('<span class="world-module-delimiter" aria-hidden="true"></span>').text(text.slice(cut,cut+1)));
    title.append($('<span></span>').addClass(titleClass).text(text.slice(cut+1)));
  }
}
function decorateFileNotes(html) {
  const $=cheerio.load(html,null,false);
  $('.note:not(details)').each((_,node)=>{
    const note=$(node),title=note.children('h1,h2,h3,h4,h5,h6').first();
    if(note.closest('.world-layout-plan,.world-layout-team,.world-layout-about').length) return;
    if(title.length){
      note.addClass('world-file-note');title.addClass('world-file-title');
      if(!title.children('.world-note-heading-copy').length){
        const copy=$('<span class="world-note-heading-copy"></span>');
        copy.append(title.contents());title.append(copy);
      }
    }
  });
  return $.html();
}
function decorateContent(html, source='') {
  const layout=layouts[source.replaceAll('\\','/')];
  if(!layout) return html;
  const $=cheerio.load(html,null,false);
  const sections=$.root().children('.world-prose-section');
  sections.addClass(`world-layout-${layout}`);
  sections.each((index,node)=>{
    const section=$(node);
    section.attr('data-module-index',String(index+1).padStart(2,'0'));
    if(layout==='plan'&&section.find('.photos-page').length) {section.addClass('world-module-hero');return;}
    const headings=section.children('.note').filter((_,note)=>{
      const item=$(note);
      return !item.is('details')&&item.find('h3').length&&(layout==='plan'||item.hasClass('primary'));
    });
    headings.addClass('world-module-heading');
    headings.removeClass('world-file-note').children('.world-file-title').removeClass('world-file-title');
    if(layout==='plan') {
      headings.find('h3').each((_,heading)=>{
        labelHeading($,heading,'-','world-module-eyebrow','world-module-title',true);
      });
      const prose=section.find('.world-natural-paragraph:not(.world-paragraph-lines),.world-paragraph-line').filter((_,line)=>!$(line).closest('.world-module-heading').length);
      prose.each((_,line)=>{
        const item=$(line),text=item.text().trim();
        if(text.startsWith('愿《')) item.addClass('world-plan-wish');
        if(/^[12]\./.test(text)) item.addClass('world-participation-step');
      });
      headings.find('p').filter((_,p)=>$(p).text().trim().startsWith('当前时间点')).addClass('world-status-line world-ui-copy').removeClass('world-natural-paragraph');
      const title=headings.find('.world-module-title').text().trim();
      if(title==='logo设计'&&!section.hasClass('world-plan-logo')){
        section.addClass('world-plan-logo');
        const map=$('<div class="world-triad-index" aria-hidden="true"></div>');
        for(const [label,english] of [['感知','PERCEPTION'],['创造','CREATE'],['记录','RECORD']]){
          map.append($('<span class="world-triad-term"></span>').attr({'data-label':label,'data-english':english}));
        }
        headings.after(map);
        const detail=prose.filter((_,line)=>$(line).text().trim().startsWith('笔周的星星')).first();
        if(detail.length&&detail.contents().toArray().every(node=>node.type==='text')){
          const segments=detail.text().match(/[^；]+；|[^；]+$/g)||[];
          if(segments.length===3){
            detail.empty().addClass('world-logo-details world-ui-copy');
            segments.forEach((text,index)=>detail.append($('<span class="world-logo-detail"></span>').attr('data-number',['12','12','04'][index]).text(text)));
          }
        }
      }
      if(title==='现况'){
        section.addClass('world-plan-status');
        prose.each((index,line)=>$(line).addClass('world-plan-task').attr('data-sequence',String(index+1).padStart(2,'0')));
      }
      if(title==='内容'){
        section.addClass('world-plan-participation');
        section.find('.world-paragraph-line,p:not(.world-paragraph-lines)').filter((_,line)=>$(line).text().trim().startsWith('欢迎访问')).addClass('world-welcome-line world-ui-copy').removeClass('world-natural-paragraph');
        section.find('.world-participation-step').each((index,line)=>{
          const item=$(line).attr('data-step',String(index+1).padStart(2,'0'));
          const first=item.contents().toArray().find(node=>node.type==='text'&&node.data.trim());
          const prefix=first?.data.match(/^\s*[12]\./);
          if(prefix&&!item.children('.world-step-source-index').length){
            prepend(first,$('<span class="world-step-source-index" aria-hidden="true"></span>').text(prefix[0])[0]);first.data=first.data.slice(prefix[0].length);
          }
        });
        section.find('.world-participation-step a').addClass('world-plan-action');
      }
    }
    if(layout==='team') {
      const people=section.children('details.note').filter((_,detail)=>$(detail).children('summary').text().trim().startsWith('协作者档案'));
      if(people.length&&!section.children('.world-people-grid').length) {
        section.addClass('world-team-register').attr('data-people-count',String(people.length).padStart(2,'0'));
        const grid=$('<div class="world-people-grid"></div>');people.first().before(grid);
        people.each((_,detail)=>{
          const person=$(detail),summary=person.children('summary');
          person.addClass('world-person-card');
          const nameLine=summary.children('p').first();
          const nameText=nameLine.length?nameLine.text():summary.text();
          const cut=nameText.indexOf('：'),name=nameText.slice(cut+1).trim();
          if(cut>=0) {
            const nameNode=nameLine.length?nameLine:$('<p></p>');
            nameNode.empty().append($('<span class="world-person-label"></span>').text(nameText.slice(0,cut+1))).append($('<span class="world-person-name"></span>').text(nameText.slice(cut+1)));
            const identity=$('<div class="world-person-identity"></div>');
            if(nameLine.length) nameLine.before(identity);else summary.empty().prepend(identity);
            identity.append(nameNode);
            const seal=$('<span class="world-person-seal" aria-hidden="true"></span>').attr('data-monogram',name.charAt(0).toUpperCase());summary.prepend(seal);
            const role=person.find('p > .world-paragraph-line').first();
            if(role.text().trim().startsWith('本网站的')) {role.removeClass('world-paragraph-line').addClass('world-person-role');identity.append(role);}
            const date=person.find('.world-paragraph-line').filter((_,line)=>$(line).text().trim().startsWith('入职日：')).first();
            if(date.length) {
              const dateText=date.text().trim();date.addClass('world-person-date-source').attr('aria-hidden','true');
              summary.append($('<span class="world-person-meta"></span>').attr({'data-date':dateText,'aria-label':dateText}));
            }
          }
          grid.append(person);
        });
      }
      const methods=section.children('.note').filter((_,note)=>$(note).find('h4').text().trim().startsWith('PART'));
      if(methods.length&&!section.children('.world-module-grid').length) {
        const grid=$('<div class="world-module-grid"></div>');methods.first().before(grid);methods.each((_,method)=>grid.append(method));
        methods.find('h4').each((_,heading)=>{
          labelHeading($,heading,'：','world-step-label','world-step-title');
        });
      }
      const resource=section.children('blockquote').find('a[href]').filter((_,link)=>/\.xlsx?(?:$|\?)/i.test($(link).attr('href')));
      if(resource.length&&!section.children('.world-resource-copy').length){
        const link=resource.first(),description=link.closest('blockquote');
        const copy=$('<div class="world-resource-copy"></div>');
        headings.first().before(copy);
        copy.append(headings).append(description);
        const action=$('<div class="world-resource-action"></div>');
        action.append(link.addClass('world-resource-link'));
        copy.after(action);
        section.addClass('world-module-resource').attr('data-file-kind',/\.xlsx(?:$|\?)/i.test(link.attr('href'))?'XLSX':'XLS');
      }
    }
    if(layout==='about') {
      section.find('a[href]').filter((_,link)=>$(link).text().trim()==='添加微信'&&/\/images\/wechat_channel\.png(?:$|\?)/.test($(link).attr('href'))).each((_,link)=>{
        const trigger=$(link);
        trigger.addClass('world-qr-trigger').attr({'data-qr-src':'/images/wechat_channel.png','data-qr-title':'添加微信','aria-haspopup':'dialog'});
      });
      const notes=section.children('.note.info:not(details)');
      const invitation=notes.filter((_,note)=>$(note).find('h3').text().trim()==='欢迎加入').addClass('world-invitation-card');
      const contacts=notes.not(invitation);
      if(contacts.length&&!section.children('.world-module-grid').length) {
        const grid=$('<div class="world-module-grid world-contact-grid"></div>');contacts.first().before(grid);contacts.each((_,contact)=>grid.append(contact));
        section.addClass('world-module-contacts');
      }
    }
  });
  $('.world-contact-grid p,.world-invitation-card p,.world-layout-about .world-module-heading p,.world-layout-team .world-module-heading p,.world-resource-copy p').addClass('world-ui-copy').removeClass('world-natural-paragraph');
  $('.world-layout-team .world-module-heading p').filter((_,node)=>$(node).text().trim().startsWith('如何成为协作者')).addClass('world-collaboration-entry');
  return $.html();
}
module.exports={decorateContent,decorateFileNotes};
