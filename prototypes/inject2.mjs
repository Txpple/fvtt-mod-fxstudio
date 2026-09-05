import { readFileSync, writeFileSync } from 'node:fs';
const [S, tplName, dataName, outName] = process.argv.slice(2);
const tpl = readFileSync(`${S}/${tplName}`, 'utf8');
const data = readFileSync(`${S}/${dataName}`, 'utf8').split('</').join('<\\/');
const out = tpl.split('__DATA__').join(data);
writeFileSync(`${S}/${outName}`, out);
console.log('written', outName, (out.length / 1024).toFixed(0), 'KB');
