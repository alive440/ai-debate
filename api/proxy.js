export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { endpoint, apiKey, body } = req.body
    if (!endpoint || !apiKey) return res.status(400).json({ error: 'Missing endpoint or apiKey' })
    const response = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey}, body:JSON.stringify(body) })
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (body?.stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      for (;;) { const {done,value} = await reader.read(); if(done) break; res.write(decoder.decode(value,{stream:true})) }
      res.end()
    } else {
      const data = await response.json()
      res.json(data)
    }
  } catch(err) { res.status(500).json({ error: err.message }) }
}
