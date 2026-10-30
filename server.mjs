import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {createSite} from './lib/site.mjs';
const local=process.env.NODE_ENV!=='production';
const site=createSite({root:fileURLToPath(new URL('./private/',import.meta.url)),password:process.env.WORKBENCH_PASSWORD,secret:process.env.WORKBENCH_SESSION_SECRET,secureCookies:!local});
createServer(async(req,res)=>{
 try{
  const scheme=local?'http':'https';const host=req.headers.host||'localhost';
  const request=new Request(`${scheme}://${host}${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
  const reply=await site(request,{clientIp:req.socket.remoteAddress});res.writeHead(reply.status,Object.fromEntries(reply.headers));res.end(Buffer.from(await reply.arrayBuffer()));
 }catch{res.writeHead(500,{'Cache-Control':'no-store'});res.end('服务暂时不可用')}
}).listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Private workbench server started.'));
