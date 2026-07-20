import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MODELS } from '../api/adapters'
import { type RoundMessage, runDebate } from '../api/debate'
import { loadKeys } from '../api/keys'

const AVATARS = ['🔮','🔥','📊','🚀','⚡','🧩']
const COLORS = ['#d4a574','#4dbd90','#6495ed','#f66','#a78bfa','#fa0']

export default function Home() {
  const [question, setQuestion] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(MODELS.map(m=>m.id)))
  const [phase, setPhase] = useState<'idle'|'debating'|'done'>('idle')
  const [rounds, setRounds] = useState<RoundMessage[]>([])
  const [framework, setFramework] = useState('')
  const [error, setError] = useState('')
  const [apiKeys, setApiKeys] = useState<Record<string,string>>({})
  const frameworkRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadKeys().then(setApiKeys) }, [])

  const activeModels = MODELS.filter(m => selected.has(m.id))

  const toggleModel = (id:string) => { setSelected(prev => { const next=new Set(prev); if(next.has(id)) next.delete(id); else next.add(id); return next }) }

  const handleStart = useCallback(async () => {
    if (!question.trim() || activeModels.length<2) return
    setError(''); setRounds([]); setFramework(''); setPhase('debating')
    const state = { question:question.trim(), models:activeModels, apiKeys, rounds:[] as RoundMessage[], framework:'', phase:'debating' as const,
      onMessage: (msg:RoundMessage) => { setRounds(prev=>[...prev,msg]) },
      onFrameworkChunk: (chunk:string) => { setFramework(prev=>prev+chunk); frameworkRef.current?.scrollIntoView({behavior:'smooth'}) },
    }
    try { await runDebate(state); setPhase('done') } catch(err:any) { setError(err.message||'辩论失败'); setPhase('idle') }
  }, [question, activeModels, apiKeys])

  const round1Msgs = rounds.filter(r=>r.round===1)
  const round2Msgs = rounds.filter(r=>r.round===2)

  return (
    <div className="container">
      <div className="header"><h1>AI 智库</h1><p>把你的问题交给一群 AI 讨论，每个 AI 有不同的视角和性格</p></div>
      <div className="model-selector">{MODELS.map(m=>(<button key={m.id} className={`model-chip ${selected.has(m.id)?'active':''}`} onClick={()=>toggleModel(m.id)}>{m.name}</button>))}</div>
      <div className="question-bar">
        <input className="question-input" placeholder="输入你的问题，比如：深圳现在买房还是租房划算？" value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&phase==='idle')handleStart()}} />
        <button className="btn btn-primary" onClick={handleStart} disabled={phase!=='idle'||!question.trim()||activeModels.length<2}>{phase==='debating'?'讨论中...':'开始讨论'}</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {round1Msgs.length>0 && (<><div className="round-label">第一轮 · 各自表态</div><div className="ai-grid">{round1Msgs.map((msg,i)=>(<AICard key={msg.modelId+'-r1'} msg={msg} idx={i} />))}</div></>)}
      {round2Msgs.length>0 && (<><div className="round-label">第二轮 · 交叉辩论</div><div className="ai-grid">{round2Msgs.map((msg,i)=>(<AICard key={msg.modelId+'-r2'} msg={msg} idx={i+round1Msgs.length} />))}</div></>)}
      {framework && (<div className="framework-card" ref={frameworkRef}><h2>决策框架</h2><div className="ai-card-content">{framework}</div></div>)}
      {phase==='idle' && rounds.length===0 && (<div className="empty-state"><div className="empty-state-icon">🤖</div><h2>开始你的第一次 AI 讨论</h2><p>至少选择 2 个模型，输入一个问题</p></div>)}
      <div className="settings-link"><Link to="/settings" className="btn btn-sm btn-secondary">设置 API Key</Link></div>
    </div>
  )
}

function AICard({ msg, idx }: { msg: RoundMessage; idx: number }) {
  const modelIndex = MODELS.findIndex(m=>m.id===msg.modelId)
  return (
    <div className="ai-card" style={{ animationDelay: `${idx*0.1}s` }}>
      <div className="ai-card-header">
        <div className="ai-card-avatar" style={{ background: COLORS[modelIndex%COLORS.length]+'20', color: COLORS[modelIndex%COLORS.length] }}>{AVATARS[modelIndex%AVATARS.length]}</div>
        <div><div className="ai-card-name">{msg.modelName}</div><div className="ai-card-persona">{msg.persona}</div></div>
      </div>
      <div className="ai-card-content">{msg.content}</div>
    </div>
  )
}
