import fs from 'node:fs/promises';
import { Box3, Matrix4, Quaternion, Vector3 } from 'three';
const input=await fs.readFile(process.argv[2]);const length=input.readUInt32LE(12);const doc=JSON.parse(input.subarray(20,20+length));
const parents=new Map();doc.nodes.forEach((n,i)=>n.children?.forEach(j=>parents.set(j,i)));
function world(index){const n=doc.nodes[index];const local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation??[0,0,0])),new Quaternion(...(n.rotation??[0,0,0,1])),new Vector3(...(n.scale??[1,1,1])));return parents.has(index)?world(parents.get(index)).multiply(local):local;}
const boxes=[];
doc.nodes.forEach((n,i)=>{if(n.mesh===undefined||n.name.includes('Mating Adapter 2'))return;const box=new Box3();for(const p of doc.meshes[n.mesh].primitives){const a=doc.accessors[p.attributes.POSITION];if(a.min&&a.max)box.union(new Box3(new Vector3(...a.min),new Vector3(...a.max)));}box.applyMatrix4(world(i));box.translate(new Vector3(0,.7347664,-21.8053501));const size=box.getSize(new Vector3());if(Math.max(...size.toArray())<.5)return;box.min.add(new Vector3(-.75,-.75,-3.2));box.max.add(new Vector3(.75,.75,.15));boxes.push({name:n.name,min:box.min.toArray().map(v=>+v.toFixed(4)),max:box.max.toArray().map(v=>+v.toFixed(4))});});
await fs.writeFile('src/sim/station-colliders.json',JSON.stringify({source:'NASA VTAD ISS model; port-local bounds expanded for teaching capsule',boxes},null,2)+'\n');console.log(`${boxes.length} registered station collision volumes`);
