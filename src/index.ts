import joplin from 'api';
import { MenuItemLocation } from 'api/types';


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
		/['\w]+/g,
		(match: string, offset: number) => match[0].toUpperCase() + match.slice(1)
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
			name: 'suitcase.upper',
			label: 'UPPER CASE',
			execute: async () => {
				apply_case('upper');
			}
		});
		joplin.commands.register({
			name: 'suitcase.lower',
			label: 'lower case',
			execute: async () => {
				apply_case('lower');
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
			  label: 'UPPER CASE',
			  commandName: 'suitcase.upper',
			},
			{
			  label: 'lower case',
			  commandName: 'suitcase.lower',
			},
			{
			  label: 'Title Case',
			  commandName: 'suitcase.title',
			},
			{
			  label: 'Sentence case',
			  commandName: 'suitcase.sentence',
			},
		  ], MenuItemLocation.Edit);
	},
});
