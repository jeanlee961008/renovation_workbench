import {test,after} from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createSite} from '../lib/site.mjs';
const root=mkdtempSync(join(tmpdir(),'wb-test-'));
mkdirSync(join(root,'files'));mkdirSync(join(root,'assets'));
writeFileSync(join(root,'index.html'),'<!doctype html><title>测试</title>木地板');
writeFileSync(join(root,'files/plan.pdf'),'%PDF-test-fixture');
writeFileSync(join(root,'files/construction.dwg'),Buffer.alloc(1000001));
after(()=>rmSync(root,{recursive:true,force:true}));
// Ephemeral test credentials, never used for deployment.
const password='test-only-password-2026',secret='test-only-session-key-with-32-chars-minimum';
const request=(path,opts={})=>new Request('https://test.local'+path,opts);
const login=site=>site(request('/login',{method:'POST',body:new URLSearchParams({password})}));
async function session(site){const res=await login(site);assert.equal(res.status,303);return res.headers.get('set-cookie').split(';')[0]}
test('missing or short secrets fail closed for pages and files',async()=>{for(const config of [{},{password:'short',secret}]){const s=createSite({root,...config});for(const p of ['/','/files/plan.pdf'])assert.equal((await s(request(p))).status,503)}});
test('unauthenticated direct HTML, PDF, DWG, images and JSON expose no content',async()=>{const s=createSite({root,password,secret});for(const p of ['/','/index.html','/files/plan.pdf','/files/construction.dwg','/assets/content.json','/assets/previews/white-model.jpg']){const res=await s(request(p));assert.equal(res.status,401);assert.match(res.headers.get('content-type'),/text\/html/);assert.match(await res.text(),/访问密码/)}});
test('wrong password, cross-origin form and oversized body denied',async()=>{const s=createSite({root,password,secret});assert.equal((await s(request('/login',{method:'POST',body:'password=wrong'}))).status,401);assert.equal((await s(request('/login',{method:'POST',headers:{origin:'https://other.local'},body:new URLSearchParams({password})}))).status,403);assert.equal((await s(request('/login',{method:'POST',body:'x'.repeat(5000)}))).status,413)});
test('correct login, secure cookie, full page, PDF ranges, HEAD and DWG',async()=>{const s=createSite({root,password,secret});const res=await login(s);const set=res.headers.get('set-cookie');for(const flag of ['HttpOnly','Secure','SameSite=Lax','Max-Age=604800'])assert.ok(set.includes(flag));const cookie=set.split(';')[0];let r=await s(request('/',{headers:{cookie}}));assert.equal(r.status,200);assert.match(await r.text(),/木地板/);r=await s(request('/files/plan.pdf',{headers:{cookie,range:'bytes=0-3'}}));assert.equal(r.status,206);assert.equal(await r.text(),'%PDF');assert.match(r.headers.get('content-range'),/^bytes 0-3\//);r=await s(request('/files/plan.pdf',{method:'HEAD',headers:{cookie}}));assert.equal(r.status,200);assert.equal(await r.text(),'');assert.ok(Number(r.headers.get('content-length'))>0);r=await s(request('/files/construction.dwg',{headers:{cookie}}));assert.equal(r.status,200);assert.ok((await r.arrayBuffer()).byteLength>1000000)});
test('tampered and expired sessions rejected; password and secret changes revoke sessions',async()=>{let clock=Date.now();const s=createSite({root,password,secret,now:()=>clock});const cookie=await session(s);assert.equal((await s(request('/',{headers:{cookie:cookie+'a'}}))).status,401);for(const changed of [{password:password+'changed',secret},{password,secret:secret+'changed'}])assert.equal((await createSite({root,...changed})(request('/',{headers:{cookie}}))).status,401);clock+=8*24*3600*1000;assert.equal((await s(request('/',{headers:{cookie}}))).status,401)});
test('path traversal, unsupported paths, invalid ranges and logout handled',async()=>{const s=createSite({root,password,secret});const cookie=await session(s);for(const p of ['/files/%2e%2e%2fpackage.json','/files/%5c../package.json','/files/%00'])assert.equal((await s(request(p,{headers:{cookie}}))).status,400);assert.equal((await s(request('/package.json',{headers:{cookie}}))).status,404);assert.equal((await s(request('/files/plan.pdf',{headers:{cookie,range:'bytes=999999999-'}}))).status,416);const r=await s(request('/logout',{method:'POST',headers:{cookie}}));assert.equal(r.status,303);assert.match(r.headers.get('set-cookie'),/Max-Age=0/)});
test('repeated wrong guesses rate limited per server instance',async()=>{const s=createSite({root,password,secret});for(let n=0;n<10;n++)assert.equal((await s(request('/login',{method:'POST',body:'password=wrong'}),{clientIp:'test-ip'})).status,401);assert.equal((await s(request('/login',{method:'POST',body:new URLSearchParams({password})}),{clientIp:'test-ip'})).status,429)});
