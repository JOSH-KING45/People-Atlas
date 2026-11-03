import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './helpers/fixture.mjs';
const people=fixture().load('lib/people.ts');

test('profile IDs remain valid when the browser lacks crypto.randomUUID',t=>{
 const descriptor=Object.getOwnPropertyDescriptor(crypto,'randomUUID');
 Object.defineProperty(crypto,'randomUUID',{value:undefined,configurable:true});
 t.after(()=>{if(descriptor)Object.defineProperty(crypto,'randomUUID',descriptor);else delete crypto.randomUUID});
 const ids=Array.from({length:4},()=>people.newPersonId());
 for(const id of ids)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.equal(new Set(ids).size,4);
});

test('birthdays accept exact supported dates and leave uncertainty unresolved',()=>{
 for(const [input,expected] of [['11 June 2008',{month:6,day:11,year:2008}],['June 11th, 2008',{month:6,day:11,year:2008}],['29 February',{month:2,day:29,year:undefined}],['2008-06-11',{month:6,day:11,year:2008}],['11/06/2008',{month:6,day:11,year:2008}],['11 Sept.',{month:9,day:11,year:undefined}]])assert.deepEqual(people.birthdayParts(input),expected,input);
 for(const input of ['maybe 15 June','15 June or 20 May','15 May?','31 April','29 February 2025','00/12/2008','June 11 2008 2009'])assert.equal(people.birthdayParts(input),null,input);
 assert.equal(people.normalizeFields({Birthday:'maybe 15 June'}).Birthday,'maybe 15 June');
});

test('field normalization preserves custom keys and conflicting aliases',()=>{
 assert.equal(people.keyName('constructor'),'Constructor');
 assert.deepEqual(people.normalizeFields({constructor:'Building design',Age:'20',age:'21','Lives in':' Abuja ',Empty:'  '}),{Constructor:'Building design',Age:'20; 21','Lives in':'Abuja'});
 for(const value of ['', ' ', '-1','200','21.5','unknown'])assert.equal(people.ageOf({fields:{Age:value}}),undefined);
 assert.equal(people.ageOf({fields:{Age:'21'}}),21);
});

test('spreadsheet name mapping and identifiers preserve every column',()=>{
 const row={Name:'Alex',Nickname:'Lex',Id:'Student-23',Version:'2026','Created at':'11 June',Age:'21'};
 const [person]=people.fromRows([row],'Nickname');
 assert.equal(person.name,'Lex');
 assert.equal(person.fields['Name (original column)'],'Alex');
 assert.equal(person.fields.Id,'Student-23');assert.equal(person.fields.Version,'2026');assert.equal(person.fields['Created at'],'11 June');
 assert.equal(person.fields.Age,'21');assert.match(person.notes,/Name: Alex/);
});

test('sheet grids preserve headerless columns and reject duplicate headers',()=>{
 assert.deepEqual(people.rowsFromGrid([['Name','Age'],['Alex','21','blue']]),[{Name:'Alex',Age:'21','Column 3':'blue'}]);
 assert.throws(()=>people.rowsFromGrid([['Name','Age',' Age '],['Alex','20','21']]),/duplicate/i);
});

test('built-in extraction preserves people, custom details and a name after other labels',()=>{
 const sample=people.parseText(people.example);assert.equal(sample.length,2);assert.equal(sample[0].name,'Tobi Adeyemi');assert.equal(sample[0].fields['Lives in'],'Abuja');assert.equal(sample[1].fields['Favourite colour'],'blue');
 const [person,...extra]=people.parseText('Age: 20\nName: Alex\nBirthday: 11 June');assert.equal(extra.length,0);assert.equal(person.name,'Alex');assert.equal(person.fields.Age,'20');
 const [uncertain]=people.parseText('Alex is 21. His birthday is maybe 15 June.');assert.equal(uncertain.fields.Birthday,'maybe 15 June');assert.equal(people.nextBirthday(uncertain),null);
});

test('folders group details consistently and leap-day birthdays remain valid',()=>{
 const profiles=people.fromRows([{Name:'Alex','Lives in':'Abuja',Interests:'music, MUSIC and coding',Birthday:'29 February'},{Name:'Zara','Lives in':'abuja',Interests:'coding'}]);
 assert.equal(people.groupsFor(profiles,'Lives in')[0].people.length,2);
 assert.equal(people.groupsFor(profiles,'Interests').find(g=>g.label.toLowerCase()==='music').people.length,1);
 const next=people.nextBirthday(profiles[0]);assert.equal(next.date.getMonth(),1);assert.equal(next.date.getDate(),29);assert.ok(next.days>=0);
 assert.ok(people.dimensions(profiles).includes('Interests'));
});

test('age completes birthdays before, on and after the birthday without replacing explicit years',()=>{
 const today=new Date(2026,8,16,12);
 assert.equal(people.addBirthYear({Age:'22',Birthday:'15 October'},today).Birthday,'15 October 2003');
 assert.equal(people.addBirthYear({Age:'22',Birthday:'11 June'},today).Birthday,'11 June 2004');
 assert.equal(people.addBirthYear({Age:'22',Birthday:'16 September'},today).Birthday,'16 September 2004');
 assert.equal(people.addBirthYear({Age:'22',Birthday:'11 June 2001'},today).Birthday,'11 June 2001');
 assert.deepEqual(people.addBirthYear({Age:'22','Birth year':'2000'},today),{Age:'22','Birth year':'2000'});
 assert.equal(people.addBirthYear({Age:'22'},today)['Estimated birth year'],'2004');
 for(const Age of ['', '-1','22.5','200','unknown'])assert.equal(people.addBirthYear({Age},today)['Estimated birth year'],undefined);
 assert.equal(people.addBirthYear({Age:'22',Birthday:'29 February'},today).Birthday,'29 February 2004');
 assert.equal(people.addBirthYear({Age:'21',Birthday:'29 February'},today).Birthday,'29 February');
});

test('plain text and spreadsheets add a calculated year while preserving source notes',()=>{
 const [note]=people.parseText('Name: Alex\nAge: 22\nBirthday: 15 October');
 assert.equal(people.birthdayParts(note.fields.Birthday).year,people.birthdayParts(people.addBirthYear({Age:'22',Birthday:'15 October'}).Birthday).year);
 assert.equal(note.notes,'Name: Alex\nAge: 22\nBirthday: 15 October');
 const [row]=people.fromRows([{Name:'Alex',Age:'22'}]);
 assert.equal(row.fields['Estimated birth year'],String(new Date().getFullYear()-22));
});
