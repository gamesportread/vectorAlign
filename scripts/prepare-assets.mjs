import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
// Reproducible NASA GLB optimization. No external decoder is needed at runtime.
// Usage: node scripts/prepare-assets.mjs /absolute/path/ISS_stationary.glb
await fs.mkdir('public/icons',{recursive:true});
const svg=await fs.readFile('public/favicon.svg');
for(const size of [192,512])await sharp(svg).resize(size,size).png().toFile(`public/icons/icon-${size}.png`);
await sharp(svg).resize(350,350).extend({top:81,bottom:81,left:81,right:81,background:'#b3f56b'}).png().toFile('public/icons/maskable-512.png');
if(!process.argv[2])process.exit(0);
const input=await fs.readFile(process.argv[2]);
if(input.readUInt32LE(8)!==input.length)throw new Error('Source GLB download is incomplete');
const jsonLength=input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,20+jsonLength).toString());
const binary=input.subarray(28+jsonLength);
const originals=doc.bufferViews.map(v=>({...v}));
const chunks=originals.map(v=>Buffer.from(binary.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength)));
for(const image of doc.images){const buf=chunks[image.bufferView];const stats=await sharp(buf).stats();const transform=sharp(buf).resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true});chunks[image.bufferView]=stats.isOpaque?await transform.removeAlpha().jpeg({quality:78,mozjpeg:true}).toBuffer():await transform.png({compressionLevel:9}).toBuffer();image.mimeType=stats.isOpaque?'image/jpeg':'image/png';}
const normals=new Set(doc.meshes.flatMap(m=>m.primitives.map(p=>p.attributes.NORMAL).filter(n=>n!==undefined)));
for(const index of normals){const a=doc.accessors[index],view=doc.bufferViews[a.bufferView];if(a.componentType!==5126||a.type!=='VEC3'||a.byteOffset||view.byteStride)continue;
  const source=chunks[a.bufferView];const result=Buffer.alloc(a.count*4);for(let i=0;i<a.count;i++)for(let j=0;j<3;j++)result.writeInt8(Math.max(-127,Math.min(127,Math.round(source.readFloatLE((i*3+j)*4)*127))),i*4+j);
  chunks[a.bufferView]=result;view.byteStride=4;a.componentType=5120;a.normalized=true;delete a.min;delete a.max;
}
doc.extensionsUsed=[...new Set([...(doc.extensionsUsed??[]),'KHR_mesh_quantization'])];doc.extensionsRequired=[...new Set([...(doc.extensionsRequired??[]),'KHR_mesh_quantization'])];
let offset=0;const pieces=[];for(let i=0;i<chunks.length;i++){const chunk=chunks[i];doc.bufferViews[i].byteOffset=offset;doc.bufferViews[i].byteLength=chunk.length;pieces.push(chunk);offset+=chunk.length;const pad=(4-offset%4)%4;if(pad){pieces.push(Buffer.alloc(pad));offset+=pad;}}
doc.buffers=[{byteLength:offset}];doc.asset.extras={...doc.asset.extras,source:'NASA VTAD — ISS_stationary.glb',sourcePage:'https://science.nasa.gov/resource/international-space-station-3d-model/',processing:'Textures resized to 1024 px; normals quantized. Geometry positions and hierarchy preserved.'};
let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const bin=Buffer.concat(pieces);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);const output=Buffer.concat([header,json,binHeader,bin]);
await fs.mkdir('public/models',{recursive:true});await fs.writeFile('public/models/iss.glb',output);
console.log(JSON.stringify({sourceBytes:input.length,optimizedBytes:output.length,meshes:doc.meshes.length,images:doc.images.length}));
