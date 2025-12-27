import { MessagesAnnotation } from '@langchain/langgraph'
import { START, StateGraph } from '@langchain/langgraph'
import { MessagesZodMeta } from '@langchain/langgraph'
import { withLangGraph } from '@langchain/langgraph/zod'
import { ChatOpenAI } from '@langchain/openai'
import {
	ask_user_with_options,
	ask_user_with_options_config,
	humanInTheLoopMiddleware,
} from '@langgraph-js/auk'
import { AgentState } from '@langgraph-js/pro'
import { createAgent } from 'langchain'
import { z } from 'zod'

import { system_prompt } from '../prompt/system_prompt'
import { execute_javascript } from '../tools/excute-js'

const State = AgentState

const workflow = async (state: z.infer<typeof State>) => {
	const agent = createAgent({
		model: new ChatOpenAI({
			model: 'gpt-4o-mini',
			useResponsesApi: false,
		}),
		systemPrompt: system_prompt,
		tools: [ask_user_with_options, execute_javascript],
		middleware: [
			humanInTheLoopMiddleware({
				interruptOn: {
					...ask_user_with_options_config.interruptOn,
					execute_javascript: {
						allowedDecisions: ['respond', 'reject'],
					},
				},
			}),
		],
		stateSchema: State,
	})
	const response = await agent.invoke(state)
	return response
}

export const graph = new StateGraph(MessagesAnnotation)
	.addNode('workflow', workflow)
	.addEdge(START, 'workflow')
	.compile()
