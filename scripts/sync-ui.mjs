import {readFile,writeFile} from 'node:fs/promises';
const css=await readFile(new URL('../ui/workbench.css',import.meta.url),'utf8');
for(const path of ['templates/index.html','private/index.html','index.html']) {
 const file=new URL('../'+path,import.meta.url);
 let source;try{source=await readFile(file,'utf8')}catch(e){if(e.code==='ENOENT')continue;throw e}
 if(!/<style>[\s\S]*?<\/style>/.test(source))throw new Error('Missing style block in '+path);
 await writeFile(file,source.replace(/<style>[\s\S]*?<\/style>/,()=>'<style>'+css+'</style>'));
}
console.log('Shared visual theme synchronized.');
