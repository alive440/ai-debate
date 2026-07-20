import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MODELS } from '../api/adapters'
import { saveKeys, loadKeys } from '../api/keys'

export default function Settings() {
  const [keys, setKeys] = useState<Record<string,string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadKeys().then(setKeys) }, [])

  const handleSave = async () => { await saveKeys(keys); setSaved(true); setTimeout(()=>setSaved(false),2000) }
  const updateKey = (id:string, value:string) => { setKeys(prev=>({...prev,[id]:value})) }

  return (
    <div className="settings-page">
      <h1>API Key 设置</h1>
      <p>输入各模型的 API Key。Key 会 AES 加密存储在你的浏览器里，不会上传到任何服务器。</p>
      {MODELS.map(m=>(<div key={m.id} className="key-row"><span className="key-label">{m.name}</span><input className="key-input" type="password" placeholder="输入 API Key..." value={keys[m.id]||''} onChange={e=>updateKey(m.id,e.target.value)} /></div>))}
      <div style={{ display:'flex', gap:12, marginTop:24 }}><button className="btn btn-primary" onClick={handleSave}>{saved?'已保存 ✓':'保存'}</button><Link to="/" className="btn btn-secondary">返回</Link></div>
      <p style={{ marginTop:32, color:'var(--text3)', fontSize:12 }}>密钥仅存储在你的浏览器 IndexedDB 中，使用 AES-GCM 加密。调用 AI 时密钥直接从前端发到各 AI 厂商的服务器，不被任何中间服务器记录或存储。</p>
    </div>
  )
}
