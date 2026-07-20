const DB_NAME='ai_debate_db'
const STORE_NAME='api_keys'
const ENCRYPTION_KEY='ai-debate-2026-key-v1-32bytes!!'

async function encrypt(text:string): Promise<string> {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(ENCRYPTION_KEY.slice(0,32)),{name:'AES-GCM'},false,['encrypt'])
  const iv=crypto.getRandomValues(new Uint8Array(12))
  const encoded=new TextEncoder().encode(text)
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoded)
  const combined=new Uint8Array(iv.length+encrypted.byteLength); combined.set(iv); combined.set(new Uint8Array(encrypted),iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function decrypt(encoded:string): Promise<string> {
  const data=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))
  const iv=data.slice(0,12); const encrypted=data.slice(12)
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(ENCRYPTION_KEY.slice(0,32)),{name:'AES-GCM'},false,['decrypt'])
  const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,encrypted)
  return new TextDecoder().decode(decrypted)
}

async function openDB(): Promise<IDBDatabase> { return new Promise((resolve,reject)=>{ const req=indexedDB.open(DB_NAME,1); req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(STORE_NAME)) req.result.createObjectStore(STORE_NAME) }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error) }) }

export async function saveKeys(keys:Record<string,string>): Promise<void> { const db=await openDB(); const encrypted=await encrypt(JSON.stringify(keys)); return new Promise(resolve=>{ const tx=db.transaction(STORE_NAME,'readwrite'); tx.objectStore(STORE_NAME).put(encrypted,'keys'); tx.oncomplete=()=>resolve() }) }

export async function loadKeys(): Promise<Record<string,string>> { try { const db=await openDB(); return new Promise(resolve=>{ const tx=db.transaction(STORE_NAME,'readonly'); const req=tx.objectStore(STORE_NAME).get('keys'); req.onsuccess=async()=>{ if(req.result){ resolve(JSON.parse(await decrypt(req.result))) } else { resolve({}) } }; req.onerror=()=>resolve({}) }) } catch { return {} } }
