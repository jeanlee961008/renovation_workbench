import {resolve} from 'node:path';
import {createSite} from '../lib/site.mjs';

export function createVercelHandler(options) {
 const site=createSite(options);
 return async function fetch(request) {
  const url=new URL(request.url);
  // Rewrites carry the original path explicitly; the API endpoint has no bypass.
  const path=url.searchParams.get('wb_path')||url.pathname;
  if(!path.startsWith('/')||path.startsWith('//')||path.includes('\\')) {
   return new Response('路径无效',{status:400,headers:{'Cache-Control':'no-store'}});
  }
  url.searchParams.delete('wb_path');
  url.pathname=path;
  const forwarded=new Request(url,request);
  const clientIp=request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()||'unknown';
  return site(forwarded,{clientIp});
 };
}
let fetchSite;
export default {
 fetch(request) {
  fetchSite??=createVercelHandler({
   root:resolve('private'),
   password:process.env.WORKBENCH_PASSWORD,
   secret:process.env.WORKBENCH_SESSION_SECRET,
   secureCookies:true,
  });
  return fetchSite(request);
 },
};
