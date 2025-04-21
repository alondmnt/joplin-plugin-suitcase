import type { ContentScriptContext, MarkdownEditorContentScriptModule } from 'api/types';
// @ts-ignore
import { EditorView } from '@codemirror/view';

export default (context: ContentScriptContext): MarkdownEditorContentScriptModule => {
	return {
		plugin: (editorControl: any) => {
			if (!editorControl.cm6) { return; }

			// Register the replaceSelection command
			editorControl.registerCommand('replaceAndKeepSelection', (replacement: string) => {
				const editor: EditorView = editorControl.editor;
				const { state } = editor;
				const selection = state.selection;

				const changes = selection.ranges.map(range => ({
					from: range.from,
					to: range.to,
					insert: replacement
				}));

				const transaction = state.update({
					changes,
					selection, // Keep the selection as is
				});

				editor.dispatch(transaction);
			});
		},
	};
};
