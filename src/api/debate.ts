import { type AIModel, streamChat, getPersona, getPersonaName } from './adapters'

export interface RoundMessage { modelId:string; modelName:string; persona:string; content:string; round:number }
export interface DebateState { question:string; models:AIModel[]; apiKeys:Record<string,string>; rounds:RoundMessage[]; framework:string; phase:'idle'|'debating'|'summarizing'|'done'; onMessage:(msg:RoundMessage)=>void; onFrameworkChunk:(chunk:string)=>void }

export async function runDebate(state: DebateState) {
  const {question,models,apiKeys,onMessage,onFrameworkChunk} = state
  for (let i=0;i<models.length;i++) {
    const model=models[i]; const persona=getPersona(i); const personaName=getPersonaName(i)
    const prompt='【你的角色】'+persona+'\n【你的身份标签】'+personaName+'\n【用户的问题】'+question+'\n\n请用你的独特视角回答这个问题。给出清晰的观点和具体的理由。不要说"作为AI"、"作为语言模型"之类的话。直接表达你的观点。控制在150字以内。'
    try {
      let content=''
      const stream=streamChat(model,apiKeys[model.id]||'',[{role:'user',content:prompt}])
      for await (const chunk of stream) content+=chunk
      const msg:RoundMessage={modelId:model.id,modelName:model.name,persona:personaName,content,round:1}
      state.rounds.push(msg); onMessage(msg)
    } catch(err:any) {
      const msg:RoundMessage={modelId:model.id,modelName:model.name,persona:personaName,content:'[错误] '+err.message,round:1}
      state.rounds.push(msg); onMessage(msg)
    }
  }
  const round1Summary = await generateSummary(state.rounds.filter(r=>r.round===1),'请用200字以内总结以下讨论中的核心论点和分歧。',apiKeys)
  for (let i=0;i<models.length;i++) {
    const model=models[i]; const myRound1=state.rounds.find(r=>r.modelId===model.id&&r.round===1)
    const prompt='【上轮讨论摘要】'+round1Summary+'\n【你上一轮的观点】'+(myRound1?.content||'')+'\n\n现在进行第二轮讨论。你的任务：1.对其他AI的论点进行评价——找出它们观点中的漏洞或被忽略的视角。2.如果你同意某个观点，给出对方没提到的新论据。3.如果不同意，直接反驳，用事实和逻辑。4.如果找不到新的东西可说，坚持你原来的立场但换一种更有说服力的表达。控制在150字以内。不要说"感谢分享"之类的客套话。'
    try {
      let content=''
      const stream=streamChat(model,apiKeys[model.id]||'',[{role:'user',content:prompt}])
      for await (const chunk of stream) content+=chunk
      const msg:RoundMessage={modelId:model.id,modelName:model.name,persona:myRound1?.persona||'',content,round:2}
      state.rounds.push(msg); onMessage(msg)
    } catch(err:any) {
      const msg:RoundMessage={modelId:model.id,modelName:model.name,persona:myRound1?.persona||'',content:'[错误] '+err.message,round:2}
      state.rounds.push(msg); onMessage(msg)
    }
  }
  await generateFramework(state,apiKeys,onFrameworkChunk)
}

async function generateSummary(messages:RoundMessage[],instruction:string,apiKeys:Record<string,string>): Promise<string> {
  const discussion=messages.map(m=>'【'+m.modelName+'（'+m.persona+'）】'+m.content).join('\n\n')
  const prompt=instruction+'\n\n'+discussion
  const model:AIModel={id:'deepseek',name:'DeepSeek',provider:'deepseek',models:['deepseek-chat'],defaultModel:'deepseek-chat'}
  const key=apiKeys['deepseek']||Object.values(apiKeys).find(k=>k)||''
  try { let content=''; const stream=streamChat(model,key,[{role:'user',content:prompt}]); for await (const chunk of stream) content+=chunk; return content } catch { return '（摘要生成失败）' }
}

async function generateFramework(state:DebateState,apiKeys:Record<string,string>,onFrameworkChunk:(chunk:string)=>void) {
  const allMessages=state.rounds.map(m=>'[第'+m.round+'轮 | '+m.modelName+'（'+m.persona+'）] '+m.content).join('\n\n')
  const prompt='你是一位资深的决策顾问。以下是一场关于「'+state.question+'」的多轮专家辩论记录。请根据这场辩论，生成一份决策框架卡片。注意：1.不要替用户做决定。2.不要只说一面之词。3.提取出需要考虑的关键因素（3-5个）。4.每个因素列出支持方和反对方的论据。5.最后给出"如果决定A，需要关注什么""如果决定B，需要关注什么"。格式要求：简洁有条理，像一份微型研究笔记。\n\n'+allMessages
  const model:AIModel={id:'deepseek',name:'DeepSeek',provider:'deepseek',models:['deepseek-chat'],defaultModel:'deepseek-chat'}
  const key=apiKeys['deepseek']||Object.values(apiKeys).find(k=>k)||''
  try { const stream=streamChat(model,key,[{role:'user',content:prompt}]); for await (const chunk of stream) onFrameworkChunk(chunk) } catch(err:any) { onFrameworkChunk('\n\n[决策框架生成失败: '+err.message+']') }
}
