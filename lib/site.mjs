import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {realpath,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {resolve,relative,extname,sep} from 'node:path';
const cookieName='wb_session', ttl=7*24*3600;
const common={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'"};
const hash=s=>createHash('sha256').update(s).digest();
const equal=(a,b)=>timingSafeEqual(hash(a),hash(b));
const types={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.pdf':'application/pdf','.dwg':'application/octet-stream'};
const loginPage=error=>`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>私密工作台 · 访问验证</title><style>*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#f2f5fa;font:14px/1.8 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#14213b;padding:24px}.card{background:white;border:1px solid #e9edf5;border-radius:22px;padding:36px;max-width:390px;width:100%;box-shadow:0 15px 55px #23345608}.icon{background:#eaf1ff;color:#2563eb;width:46px;height:46px;display:grid;place-items:center;border-radius:14px;font-size:25px}h1{font-size:23px;margin:20px 0 7px}p{color:#5d6d85;font-size:12px;margin:0 0 24px}label{font-size:12px;color:#45556f}input,button{width:100%;font:inherit;border-radius:9px;padding:12px 14px}input{border:1px solid #dfe5f1;margin:8px 0 14px;outline-color:#6876ec}button{background:#2563eb;border:0;color:white;cursor:pointer}.error{color:#bd6373;font-size:12px;min-height:20px}.hint{font-size:10px;color:#5d6d85;margin-top:20px;line-height:1.9}</style><main class="card"><div class="icon">⌂</div><h1>欢迎回到装修工作台</h1><p>这是一个私密空间，请输入访问密码。</p><form method="post" action="/login"><label for="password">访问密码</label><input id="password" name="password" type="password" required maxlength="512" autocomplete="current-password" placeholder="请输入分享者提供的密码"><div class="error" role="status">${error||''}</div><button type="submit">进入工作台 →</button></form><div class="hint">此设备登录有效期为 7 天。使用公共设备时，请在查看后退出。</div></main></html>`;
export function createSite({root,password,secret,secureCookies=true,now=()=>Date.now()}){
 const configured=typeof password==='string'&&password.length>=12&&typeof secret==='string'&&secret.length>=32;
 const key=configured?createHmac('sha256',secret).update(password).digest():Buffer.alloc(32);
 const sign=payload=>createHmac('sha256',key).update(payload).digest('base64url');
 const response=(body,status=200,headers={})=>new Response(body,{status,headers:{...common,...headers}});
 const html=(body,status=200,headers={})=>response(body,status,{'Content-Type':'text/html; charset=utf-8',...headers});
 const cookie=(value,maxAge)=>`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookies?'; Secure':''}`;
 const attempts=new Map();
 function authenticated(req){
  const value=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(!value||value.length>500)return false;
  const parts=value.split('.');if(parts.length!==2||!equal(sign(parts[0]),parts[1]))return false;
  try{const v=JSON.parse(Buffer.from(parts[0],'base64url').toString());return v.v===1&&Number.isInteger(v.exp)&&v.exp>Math.floor(now()/1000)&&v.exp<=Math.floor(now()/1000)+ttl;}catch{return false}
 }
 return async function handle(req,{clientIp='unknown'}={}){
  if(!configured)return html('<h1>私密站点尚未配置</h1><p>请管理员设置访问密码和会话密钥后重新部署。</p>',503);
  const url=new URL(req.url);
  if(url.pathname==='/health'&&req.method==='GET')return response('ok',200,{'Content-Type':'text/plain'});
  if(req.method==='POST'){
   const origin=req.headers.get('origin');if(origin&&origin!==url.origin)return response('禁止跨站提交',403);
   if(url.pathname==='/logout')return response(null,303,{'Location':'/login','Set-Cookie':cookie('',0)});
   if(url.pathname!=='/login')return response('不支持此操作',405,{'Allow':'GET, HEAD'});
   const time=now();for(const [ip,v] of attempts){if(v.until<=time)attempts.delete(ip)}
   const previous=attempts.get(clientIp);if(previous?.count>=10)return html(loginPage('尝试次数过多，请 15 分钟后重试。'),429,{'Retry-After':String(Math.ceil((previous.until-time)/1000))});
   if(Number(req.headers.get('content-length')||0)>4096)return response('请求过大',413);
   const reader=req.body?.getReader();const chunks=[];let size=0;
   if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return response('请求过大',413)}chunks.push(value)}}
   const supplied=new URLSearchParams(Buffer.concat(chunks).toString()).get('password')||'';
   if(!equal(supplied,password)){
    if(attempts.size>=5000&&!attempts.has(clientIp))return response('请稍后重试',429);
    attempts.set(clientIp,{count:(previous?.count||0)+1,until:previous?.until||time+15*60*1000});return html(loginPage('密码不正确，请重试。'),401);
   }
   attempts.delete(clientIp);const payload=Buffer.from(JSON.stringify({v:1,exp:Math.floor(time/1000)+ttl})).toString('base64url');
   return response(null,303,{'Location':'/','Set-Cookie':cookie(payload+'.'+sign(payload),ttl)});
  }
  if(!['GET','HEAD'].includes(req.method))return response('不支持此操作',405,{'Allow':'GET, HEAD'});
  if(url.pathname==='/login')return html(req.method==='HEAD'?null:loginPage());
  if(!authenticated(req))return html(req.method==='HEAD'?null:loginPage(),401);
  let path;try{path=decodeURIComponent(url.pathname)}catch{return response('路径无效',400)}
  if(path.includes('\\')||path.includes('\0')||path.split('/').some(x=>x==='..'||x==='.'||x.startsWith('.')))return response('路径无效',400);
  path=path==='/'?'index.html':path.slice(1);
  if(path!=='index.html'&&!path.startsWith('assets/')&&!path.startsWith('files/'))return response('未找到文件',404);
  try{
   const base=await realpath(root);const target=await realpath(resolve(base,path));const rel=relative(base,target);
   if(rel.startsWith('..'+sep)||rel==='..'||rel.startsWith(sep))return response('未找到文件',404);
   const info=await stat(target);if(!info.isFile())return response('未找到文件',404);
   const size=info.size;const stream=(start=0,end=size-1)=>size===0?null:Readable.toWeb(createReadStream(target,{start,end}));const headers={'Content-Type':types[extname(target).toLowerCase()]||'application/octet-stream','Accept-Ranges':'bytes'};
   const range=req.headers.get('range');
   if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);let start,end;
    if(!m||(!m[1]&&!m[2]))return response(null,416,{'Content-Range':`bytes */${size}`});
    if(!m[1]){start=Math.max(0,size-Number(m[2]));end=size-1}else{start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),size-1):size-1}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)return response(null,416,{'Content-Range':`bytes */${size}`});
    return response(req.method==='HEAD'?null:stream(start,end),206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(end-start+1)});
   }
   return response(req.method==='HEAD'?null:stream(),200,{...headers,'Content-Length':String(size)});
  }catch(e){if(['ENOENT','ENOTDIR'].includes(e.code))return response('未找到文件',404);return response('文件暂时无法读取',500)}
 }
}
