import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=process.cwd();
const png=path.join(root,'assets','icon.png');
const res=path.join(root,'android','app','src','main','res');
const sizes={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
for(const [density,size] of Object.entries(sizes)){
 const dir=path.join(res,'mipmap-'+density); await fs.mkdir(dir,{recursive:true});
 const out=await sharp(png).resize(size,size).png().toBuffer();
 await fs.writeFile(path.join(dir,'ic_launcher.png'),out);
 await fs.writeFile(path.join(dir,'ic_launcher_round.png'),out);
}
console.log('Android launcher icons installed.');
