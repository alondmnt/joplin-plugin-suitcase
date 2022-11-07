import joplin from 'api';
import { MenuItemLocation } from 'api/types';
import { titleCase } from 'title-case';

async function apply_case(case_type: string) {
	let text = await joplin.commands.execute('selectedText');

	if (case_type == 'upper') {
		text = text.toUpperCase();
	} else if (case_type == 'lower') {
		text = text.toLowerCase();
	} else if (case_type == 'title') {
		text = toTitleCase(text);
	} else if (case_type == 'sentence') {
		text = toSentenceCase(text);
	} else if (case_type == 'fullwidth') {
		text = toFullWidth(text);
	} else if (case_type == 'halfwidth') {
		text = toHalfWidth(text);
	}

	await joplin.commands.execute('editor.execCommand', {
		name: 'replaceSelection',
		args: [text, 'around'],
	});
}

function toTitleCase(text: string): string {
	return text.replace(
		/([a-zA-Z]+[^\n]*)/g,
		(match: string, offset: number) => titleCase(match)
	);
}

function toSentenceCase(text: string): string {
	return text.replace(
		/([a-zA-Z]+[^.!?:\n]+[.!?:]*[\s]*)/g,
		(match: string, offset: number) => match[0].toUpperCase() + match.slice(1)
	);
}

function toFullWidth(text: string): string {
	return text.replace(/([a-zA-Z0-9])/g, (match: string, offset: number) => {
		return String.fromCharCode(match.charCodeAt(0) + 0xfee0);
	});
}

function toHalfWidth(text: string): string {
	return text.replace(/([！-～])/g, (match: string, offset: number) => {
		return String.fromCharCode(match.charCodeAt(0) - 0xfee0);
	});
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
		joplin.commands.register({
			name: 'suitcase.fullwidth',
			label: 'ｆｕｌｌｗｉｄｔｈ',
			execute: async () => {
				apply_case('fullwidth');
			}
		});
		joplin.commands.register({
			name: 'suitcase.halfwidth',
			label: 'halfwidth',
			execute: async () => {
				apply_case('halfwidth');
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
			{
			  label: 'ｆｕｌｌｗｉｄｔｈ',
			  commandName: 'suitcase.fullwidth',
			  accelerator: 'CmdOrCtrl+Alt+Shift+F',
			},
			{
			  label: 'halfwidth',
			  commandName: 'suitcase.halfwidth',
			  accelerator: 'CmdOrCtrl+Alt+Shift+H',
			},
		  ], MenuItemLocation.Edit);
	},
});
