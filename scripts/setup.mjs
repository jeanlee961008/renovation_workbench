import {mkdir,copyFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../private/',import.meta.url));
await mkdir(root,{recursive:true});
try {await access(new URL('../private/index.html',import.meta.url));console.log('Existing private site retained.');}
catch(e){if(e.code!=='ENOENT')throw e;await copyFile(new URL('../templates/index.html',import.meta.url),new URL('../private/index.html',import.meta.url));console.log('Redacted template prepared; personal files are not included.');}
