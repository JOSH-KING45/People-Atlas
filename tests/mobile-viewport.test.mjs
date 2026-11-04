import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/fixture.mjs';
test('mobile keyboard layout uses the visible viewport and detects focused keyboard obstruction',()=>{
 const {mobileViewportState}=fixture().load('lib/mobile-viewport.ts');
 assert.deepEqual(mobileViewportState(420,35,800,360,true),{height:420,top:35,keyboard:true});
 assert.equal(mobileViewportState(420,0,800,360,false).keyboard,false);
 assert.equal(mobileViewportState(800,0,800,360,true).keyboard,false);
 assert.equal(mobileViewportState(420,0,800,1440,true).keyboard,false);
 assert.equal(mobileViewportState(420,0,800,768,true).keyboard,true);
});
test('viewport sizing handles orientation changes and clamps invalid offsets',()=>{
 const {mobileViewportState}=fixture().load('lib/mobile-viewport.ts');
 assert.deepEqual(mobileViewportState(360,-10,360,800,true),{height:360,top:0,keyboard:false});
 assert.deepEqual(mobileViewportState(NaN,NaN,600,360,false),{height:600,top:0,keyboard:false});
 assert.equal(mobileViewportState(120,0,360,800,true).keyboard,true);
});
