import './setup.mjs';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
const out=new URL('../public/',import.meta.url);
await mkdir(out,{recursive:true});
const entries=await readdir(out);
if(entries.some(name=>name!=='robots.txt'))throw new Error('Public output must not contain project pages or attachments.');
await writeFile(new URL('robots.txt',out),'User-agent: *\nDisallow: /\n');
console.log('Vercel build prepared. Private content stays in the authenticated function bundle.');
