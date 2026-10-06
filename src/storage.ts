import { openDB } from 'idb';
import type { FlightRecord, Language } from './sim/types';
export interface SavedData { completed: number[]; language: Language; muted: boolean; quality: 'low'|'high'; latest?: FlightRecord; introSeen?: boolean }
const database = () => openDB('vector-align',1,{upgrade(db){db.createObjectStore('local');}});
export async function readSaved():Promise<SavedData|undefined> { const db=await database(); return db.get('local','profile'); }
export async function writeSaved(data:SavedData) {const db=await database(); await db.put('local',data,'profile');}
