import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const env = {GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret'};
const origin = 'https://auth.example.workers.dev';
const make = (path, options) => new Request(origin+path,options);
test('auth rejects other sites and requests only public repository scope',async()=>{
  assert.equal((await worker.fetch(make('/auth?provider=github&site_id=attacker.example'),env)).status,400);
  const r=await worker.fetch(make('/auth?provider=github&site_id=vote.chenterce.info'),env);
  assert.equal(r.status,302);
  const target=new URL(r.headers.get('location'));
  assert.equal(target.origin,'https://github.com');assert.equal(target.searchParams.get('scope'),'public_repo');
  assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
  assert.equal(r.headers.get('cache-control'),'no-store');
});
test('callback rejects missing or mismatched state before contacting GitHub',async()=>{
  assert.equal((await worker.fetch(make('/callback?code=fake'),env)).status,400);
  assert.equal((await worker.fetch(make('/callback?code=fake&state='+'a'.repeat(64),{headers:{cookie:'__Host-savevote-oauth='+'b'.repeat(64)}}),env)).status,400);
});
test('callback sends credentials only to the configured origin after verifying repo write access',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>++calls===1?Response.json({access_token:'fake-token'}):Response.json({permissions:{push:true}});
  try {
    const state='a'.repeat(64);
    const r=await worker.fetch(make('/callback?code=fake&state='+state,{headers:{cookie:'__Host-savevote-oauth='+state}}),env);
    const html=await r.text();assert.equal(calls,2);
    assert.match(html,/authorization:github:success/);assert.match(html,/event.origin !== target/);assert.match(html,/event.source !== window.opener/);assert.match(html,/https:\/\/vote.chenterce.info/);
    assert.match(r.headers.get('set-cookie'),/Max-Age=0/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  } finally {globalThis.fetch=original;}
});
test('read-only users do not receive an access token',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>++calls===1?Response.json({access_token:'fake-token'}):Response.json({permissions:{push:false}});
  try {
    const state='b'.repeat(64);
    const r=await worker.fetch(make('/callback?code=fake&state='+state,{headers:{cookie:'__Host-savevote-oauth='+state}}),env);
    const html=await r.text();assert.match(html,/authorization:github:error/);assert.ok(!html.includes('fake-token'));
  } finally {globalThis.fetch=original;}
});
