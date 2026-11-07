import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {fixture} from './helpers/fixture.mjs';

const sample={id:'12345678-1234-4234-8234-123456789abc',name:'Test Alex Àbídún',fields:{Age:'21',Birthday:'29 February','Lives in':'Abuja',Interests:'music, coding','Favourite food':'rice'},notes:'Fictional test note.\nEvery original line should remain.'};

test('CSV, XLSX, JSON, DOCX and PDF exports contain the profile and original notes',async(t)=>{
 const f=fixture(),files=f.load('lib/files.ts'),people=f.load('lib/people.ts');
 let blob,filename;
 t.mock.method(URL,'createObjectURL',value=>{blob=value;return'blob:test-download'});
 const oldDocument=globalThis.document;
 globalThis.document={createElement:()=>({set href(v){},set download(v){filename=v},click(){}})};
 t.after(()=>{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument});
 const timeout=setTimeout;t.mock.method(globalThis,'setTimeout',(...args)=>{const timer=timeout(...args);timer.unref?.();return timer});
 t.mock.method(globalThis,'fetch',async url=>{assert.equal(url,'/fonts/DejaVuSans.ttf');return new Response(readFileSync(new URL('../public/fonts/DejaVuSans.ttf',import.meta.url)))});
 const temp=mkdtempSync(join(tmpdir(),'people-atlas-file-test-'));t.after(()=>rmSync(temp,{recursive:true,force:true}));
 for(const format of ['csv','xlsx','json','docx','pdf']){
  await files.exportPeople([sample],format);assert.ok(blob.size>0);assert.ok(filename.endsWith('.'+format));
  if(['csv','xlsx','json'].includes(format)){
   const read=await files.readFile(new File([blob],filename));
   const profiles=read.people||people.fromRows(read.rows||read.sheets[0].rows);
   assert.equal(profiles[0].name,sample.name,format);assert.deepEqual(profiles[0].fields,sample.fields,format);assert.equal(profiles[0].notes,sample.notes,format);
  }else if(format==='docx'){
   const read=await files.readFile(new File([blob],filename));assert.ok(read.text.includes(sample.name));assert.ok(read.text.includes('Favourite food: rice'));assert.ok(read.text.includes(sample.notes));
  }else{
   const path=join(temp,'export.pdf');writeFileSync(path,new Uint8Array(await blob.arrayBuffer()));
   const text=spawnSync('pdftotext',['-layout',path,'-'],{encoding:'utf8'});assert.ifError(text.error);assert.equal(text.status,0,text.stderr);assert.ok(text.stdout.includes(sample.name));assert.ok(text.stdout.includes('Favourite food: rice'));assert.ok(text.stdout.includes('Every original line should remain.'));
  }
 }
});

test('XLSX imports preserve cells beyond the header and catch duplicate headings',async()=>{
 const {readFile}=fixture().load('lib/files.ts');const excel=await import('exceljs');const Workbook=excel.Workbook||excel.default.Workbook;
 for(const duplicate of [false,true]){
  const workbook=new Workbook(),sheet=workbook.addWorksheet('Contacts');sheet.addRow(duplicate?['Name','Age','Age']:['Name','Age']);sheet.addRow(['Alex','21','blue']);
  const file=new File([await workbook.xlsx.writeBuffer()],'contacts.xlsx');
  if(duplicate)await assert.rejects(readFile(file),/duplicate/i);
  else assert.equal((await readFile(file)).sheets[0].rows[0]['Column 3'],'blue');
 }
});

test('invalid JSON profiles and malformed CSV fail with actionable errors',async()=>{
 const {readFile}=fixture().load('lib/files.ts');
 for(const input of ['null','{}','[{"name":"Alex","fields":{"Birthday":{"day":11}}}]'])await assert.rejects(readFile(new File([input],'bad.json')),/JSON|profile|field/i);
 await assert.rejects(readFile(new File(['Name,Age\nAlex,21,extra'],'bad.csv')),/columns|quotation/);
 const imported=await readFile(new File([JSON.stringify([{name:'Alex',fields:{birthday:'11/06/2008',level:200},notes:''}])],'data.json'));
 assert.deepEqual(imported.people[0].fields,{Birthday:'11 June 2008','Grade / level':'200 level'});
});

test('calendar output has valid leap dates, escaped text and UTF-8 line folding',()=>{
 const {calendarEvent,googleCalendarLink,icsText}=fixture().load('lib/calendar.ts');
 const person={...sample,name:'Alex\rBEGIN:VEVENT; '+('Àbídún '.repeat(20))};
 const event=calendarEvent(person,7);assert.match(event.start.date,/-02-29$/);assert.match(event.end.date,/-03-01$/);assert.equal(event.reminders.overrides[0].minutes,10080);
 const text=icsText([person],7);assert.equal(text.split('\r\n').filter(line=>line==='BEGIN:VEVENT').length,1);assert.ok(text.includes('Alex\\nBEGIN:VEVENT\\;'));
 for(const line of text.split('\r\n')){assert.ok(Buffer.byteLength(line)<=75);assert.ok(!line.includes('\r'))}
 const link=new URL(googleCalendarLink(sample));assert.equal(link.origin,'https://calendar.google.com');assert.equal(link.searchParams.get('recur'),'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29');
 assert.ok(!icsText([{...sample,fields:{Birthday:'maybe 15 June'}}]).includes('BEGIN:VEVENT'));
});

test('Google Calendar creation and updates keep stable IDs and report partial failures',async(t)=>{
 const {sendBirthdays}=fixture().load('lib/calendar.ts');const requests=[];
 const mock=t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push({url,options});return options.method?Response.json({id:'test'}):new Response(null,{status:404})});
 assert.equal(await sendBirthdays([sample],'fake-google-token',1),1);assert.equal(requests[1].options.method,'POST');
 const body=JSON.parse(requests[1].options.body);assert.match(body.id,/^[a-v0-9]+$/);assert.ok(!requests[1].options.body.includes(sample.notes));
 requests.length=0;mock.mock.mockImplementation(async(url,options)=>{requests.push({url,options});return Response.json({})});
 assert.equal(await sendBirthdays([sample],'fake-google-token',1),1);assert.equal(requests[1].options.method,'PATCH');assert.ok(requests[1].url.endsWith('/'+body.id));
 mock.mock.mockImplementation(async()=>new Response(null,{status:401}));await assert.rejects(sendBirthdays([sample],'fake-google-token',1),/Saved 0 of 1/);
});

test('vCard imports unfold lines and preserve contact details for review', async () => {
 const {readFile}=fixture().load('lib/files.ts');
 const data=[
  'BEGIN:VCARD','VERSION:4.0','FN:Test Àbídún','item1.TEL;VALUE=uri:tel:+2348012345678',
  'TEL:+2348098765432','EMAIL:test@example.test','ORG:Studio\\; Name;Research',
  'NOTE:Met in Abuja\\nLikes long conver',' sations','PHOTO;ENCODING=b:opaque','END:VCARD',
  'BEGIN:VCARD','VERSION:2.1','N:Okafor;Ada;;;','EMAIL:ada@example.test','END:VCARD',
  'BEGIN:VCARD','FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Ada =C3=','=89ze','END:VCARD'
 ].join('\r\n');
 const {people,contactImport}=await readFile(new File([data],'contacts.VCF'));
 assert.equal(contactImport,true);
 assert.deepEqual(people.map(p=>p.name),['Test Àbídún','Ada Okafor','Ada Éze']);
 assert.deepEqual(people[0].fields,{Workplace:'Studio; Name · Research',Phone:'+2348012345678','Phone 2':'+2348098765432',Email:'test@example.test'});
 assert.equal(people[0].notes,'Met in Abuja\nLikes long conversations');
 await assert.rejects(readFile(new File(['BEGIN:VCARD\nFN:Incomplete'],'bad.vcf')),/END:VCARD/);
 await assert.rejects(readFile(new File(['BEGIN:VCARD\nFN:Test\nEND:VCARD\n'.repeat(201)],'large.vcf')),/200 contacts/);
});

test('phone picker imports only chosen details and retains multiple numbers', () => {
 const {selectedContactDrafts}=fixture().load('lib/contact-import.ts');
 const drafts=selectedContactDrafts([{name:[' Ada '],tel:['+234 100','+234 101','+234 100'],email:['a@example.test'],photo:'ignore'}]);
 assert.equal(drafts[0].name,'Ada');
 assert.deepEqual(drafts[0].fields,{Phone:'+234 100','Phone 2':'+234 101',Email:'a@example.test'});
 assert.deepEqual(fixture().load('lib/people.ts').normalizeFields(drafts[0].fields),drafts[0].fields);
 assert.equal(drafts[0].notes,'');
});
