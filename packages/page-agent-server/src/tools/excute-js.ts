import { tool } from 'langchain'
import { z } from 'zod'

export const execute_javascript = tool(
	() => {
		return ''
	},
	{
		name: 'execute_javascript',
		description:
			'Execute JavaScript code on the current page. Supports async/await syntax. Use with caution!',
		schema: z.object({
			js_code: z.string(),
		}),
	}
)
