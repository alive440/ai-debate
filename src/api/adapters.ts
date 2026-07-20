export interface AIModel { id: string; name: string; provider: string; models: string[]; defaultModel: string }

export const MODELS: AIModel[] = [
  { id: 'deepseek', name: 'DeepSeek', provider: 'deepseek', models: ['deepseek-chat','deepseek-reasoner'], defaultModel: 'deepseek-chat' },
  { id: 'doubao', name: '豆包', provider: 'doubao', models: ['doubao-pro-32k'], defaultModel: 'doubao-pro-32k' },
  { id: 'qwen', name: '通义千问', provider: 'qwen', models: ['qwen-turbo','qwen-plus','qwen-max'], defaultModel: 'qwen-plus' },
  { id: 'kimi', name: 'Kimi', provider: 'kimi', models: ['moonshot-v1-8k','moonshot-v1-32k'], defaultModel: 'moonshot-v1-32k' },
  { id: 'zhipu', name: '智谱 GLM', provider: 'zhipu', models: ['glm-4-flash','glm-4'], defaultModel: 'glm-4-flash' },
  { id: 'ernie', name: '文心一言', provider: 'ernie', models: ['ernie-4.0-turbo'], defaultModel: 'ernie-4.0-turbo' },
]

type RolePersona = 'optimist'|'pessimist'|'analyst'|'visionary'|'skeptic'|'pragmatist'
const PERSONAS: Record<RolePersona, string> = {
  optimist: '你天生乐观，看到机会先冲。你对未来充满信心，倾向于看到事物的积极面，但你要给出具体的乐观理由。',
  pessimist: '你天生谨慎，必须先看到至少三个风险才下判断。你关注最坏情况，但你的担心必须有数据和逻辑支撑。',
  analyst: '你只看数据说话。不要直觉、不要感觉、不要猜测。每个观点必须附带数字或可验证的事实。',
  visionary: '你关注长期趋势，忽略短期波动。从历史规律和产业周期中寻找答案，不要纠结于季度财报。',
  skeptic: '你质疑一切。每个主流观点你都觉得有问题。你的任务是挑战共识，提出被忽略的漏洞。',
  pragmatist: '你关注可行性。再好的理论如果不能落地就没用。你总是问：具体怎么操作？第一步是什么？',
}
const PERSONA_KEYS: RolePersona[] = ['optimist','pessimist','analyst','visionary','skeptic','pragmatist']
export function getPersona(index: number): string { return PERSONAS[PERSONA_KEYS[index % PERSONA_KEYS.length]] }
export function getPersonaName(index: number): string {
  const map: Record<string, string> = { optimist:'乐天派',pessimist:'谨慎派',analyst:'数据控',visionary:'远见者',skeptic:'质疑者',pragmatist:'实干家' }
  return map[PERSONA_KEYS[index % PERSONA_KEYS.length]]
}

export async function* streamChat(model: AIModel, apiKey: string, messages: {role:string;content:string}[], modelName?: string): AsyncGenerator<string> {
  const endpoint = getEndpoint(model.provider)
  const body = buildRequestBody(model.provider, modelName || model.defaultModel, messages)
  const response = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey}, body:JSON.stringify(body) })
  if (!response.ok) { const text = await response.text(); throw new Error(model.name + ' 调用失败: '+response.status+' '+text.slice(0,100)) }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder(); let buffer = ''
  while (true) {
    const {done, value} = await reader.read(); if (done) break
    buffer += decoder.decode(value, {stream:true}); const lines = buffer.split('\n'); buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('data: ')) { const data = line.slice(6).trim(); if (data === '[DONE]') continue
        try { const json = JSON.parse(data); const content = json.choices?.[0]?.delta?.content; if (content) yield content } catch {}
      }
    }
  }
}

function getEndpoint(provider: string): string {
  const eps: Record<string,string> = {
    deepseek:'https://api.deepseek.com/v1/chat/completions',
    doubao:'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    qwen:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    kimi:'https://api.moonshot.cn/v1/chat/completions',
    zhipu:'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    ernie:'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
  }
  return eps[provider] || ''
}
function buildRequestBody(provider: string, model: string, messages: {role:string;content:string}[]) {
  return { model, messages, stream:true, temperature:0.8 }
}
