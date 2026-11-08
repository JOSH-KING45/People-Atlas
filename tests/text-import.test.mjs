import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './helpers/fixture.mjs';

const {NOTE_LIMIT,TEXT_IMPORT_LIMIT,isWhatsAppText,splitExtractionText,collectBatchDrafts}=fixture().load('lib/text-import.ts');

test('long WhatsApp exports preserve Android and iOS message boundaries and text',()=>{
 for(const header of ['08/11/2026, 9:15 am - Ada:', '\u200e[08/11/2026, 09:15:32] Ada:']){
  const message=header+' First line\r\n'+('a'.repeat(1000))+'\r\n';
  const text=message.repeat(Math.floor(TEXT_IMPORT_LIMIT/message.length));
  assert.equal(isWhatsAppText(text),true);
  const batches=splitExtractionText(text,true);
  assert.ok(batches.length>1);
  assert.equal(batches.join(''),text);
  assert.ok(batches.every(batch=>batch.startsWith(header)&&batch.endsWith('\r\n')&&batch.length<=30_000));
 }
});

test('ordinary notes keep the existing request path and long files are split safely',()=>{
 const note='First note\n\nSecond note';
 assert.equal(isWhatsAppText(note),false);
 assert.deepEqual(splitExtractionText(note,false),[note]);
 const long='a'.repeat(29_999)+'🙂'+'b'.repeat(NOTE_LIMIT);
 const batches=splitExtractionText(long,false);
 assert.equal(batches[0].length,29_999);
 assert.equal(batches.join(''),long);
 assert.ok(batches.every(batch=>batch.length<=30_000));
});

test('combined review removes identical results and keeps different same-name evidence',()=>{
 const first={id:'1',name:'Ada',fields:{City:'Abuja',Hobby:'Reading'},notes:'First source'};
 const repeated={...first,id:'2',fields:{Hobby:'Reading',City:'Abuja'}};
 const separate={...first,id:'3',notes:'Second source'};
 assert.deepEqual(collectBatchDrafts([first,repeated,separate]),[first,separate]);
});
