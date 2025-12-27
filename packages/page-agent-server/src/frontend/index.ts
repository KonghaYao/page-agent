import { Interrupt, LangGraphClient, createInteractiveUITool } from '@langgraph-js/sdk'
import { PageController, PageControllerConfig } from '@page-agent/page-controller'
import z from 'zod'

export type PageAgentConfig = PageControllerConfig

const createExecuteJSTool = (client: PageAgentContext) => {
	return createInteractiveUITool({
		name: 'execute_javascript',
		description: '',
		parameters: {
			js_code: z.string(),
		},
		render(tool) {
			if (tool.state === 'interrupted' && tool.getInputRepaired().js_code) {
				;(async () => {
					try {
						/** TODO 这里非常危险 */
						const mainFunction = eval(`(()=>{
${tool.getInputRepaired().js_code!}
return main;
})`)
						const actionResult = await mainFunction(client.toSafeJSObject())
						tool.sendResumeData({ type: 'respond', message: JSON.stringify(actionResult) })
					} catch (e) {
						tool.sendResumeData({ type: 'reject', message: JSON.stringify(e) })
					}
				})()
			}
			return false
		},
	})
}

export interface Shortcut {
	name: string
	description: string
	execute: (this: PageAgentContext, input: any) => Promise<any>
}

export class PageAgentContext {
	page: PageController
	private config: PageAgentConfig
	constructor(config: PageAgentConfig) {
		this.page = new PageController(config)
		this.config = config
	}
	/**
	 * 初始化所有的工具
	 */
	initTools() {
		return [createExecuteJSTool(this)]
	}
	shortcuts: Record<string, Shortcut> = {}
	addShortcuts(shortcuts: Shortcut[]) {
		shortcuts.forEach((i) => {
			this.shortcuts[i.name] = i
		})
	}
	toShortcutUsagePrompt() {
		return Object.values(this.shortcuts)
			.map((i) => {
				return `<${i.name}>
${i.description}
</${i.name}>`
			})
			.join('\n')
	}
	toSafeJSObject() {
		return {
			page: this.page,
			shortcuts: Object.fromEntries(
				Object.entries(this.shortcuts).map(([k, v]) => {
					return [k, v.execute.bind(this)]
				})
			),
		}
	}
}

export const PageControlShortcut: Shortcut = {
	name: 'scroll',
	description: `
//
context.shortcut.scroll({
	down: true,
	pixels: 1000000,
});
`,
	execute(
		this: PageAgentContext,
		args: {
			down: boolean
			numPages: number
			pixels?: number | undefined
			index?: number | undefined
		}
	) {
		return this.page.scroll(args)
	},
}
