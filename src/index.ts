import joplin from 'api';
import { MenuItemLocation } from 'api/types';
import { titleCase } from 'title-case';

async function apply_case(case_type: string) {
	let text = await joplin.commands.execute('selectedText');
	text = text.toLowerCase();

	if (case_type == 'upper') {
		text = text.toUpperCase();
	} else if (case_type == 'title') {
		text = toTitleCase(text);
	} else if (case_type == 'sentence') {
		text = toSentenceCase(text);
	}

	await joplin.commands.execute('replaceSelection', text);
}

function toTitleCase(text: string): string {
	return text.replace(
		/([\w]+[^\n]*[\w]+)/g,
		(match: string, offset: number) => titleCase(match)
	);
}

function toSentenceCase(text: string): string {
	return text.replace(
		/([\w]+[^.!?:\n]+[.!?:]*[\s]*)/g,
		(match: string, offset: number) => match[0].toUpperCase() + match.slice(1)
	);
}

joplin.plugins.register({
	onStart: async function() {
		joplin.commands.register({
			name: 'suitcase.lower',
			label: 'lower case',
			execute: async () => {
				apply_case('lower');
			}
		});
		joplin.commands.register({
			name: 'suitcase.upper',
			label: 'UPPER CASE',
			execute: async () => {
				apply_case('upper');
			}
		});
		joplin.commands.register({
			name: 'suitcase.title',
			label: 'Title Case',
			execute: async () => {
				apply_case('title');
			}
		});
		joplin.commands.register({
			name: 'suitcase.sentence',
			label: 'Sentence case',
			execute: async () => {
				apply_case('sentence');
			}
		});
		await joplin.views.menus.create('suitcaseMenu', 'Capitalization', [
			{
			  label: 'lower case',
			  commandName: 'suitcase.lower',
			  accelerator: 'CmdOrCtrl+Alt+Shift+L',
			},
			{
			  label: 'UPPER CASE',
			  commandName: 'suitcase.upper',
			  accelerator: 'CmdOrCtrl+Alt+Shift+U',
			},
			{
			  label: 'Title Case',
			  commandName: 'suitcase.title',
			  accelerator: 'CmdOrCtrl+Alt+Shift+T',
			},
			{
			  label: 'Sentence case',
			  commandName: 'suitcase.sentence',
			  accelerator: 'CmdOrCtrl+Alt+Shift+S',
			},
		  ], MenuItemLocation.Edit);
	},
});
