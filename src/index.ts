import joplin from 'api';
import { SettingItemType } from 'api/types';
import { MenuItemLocation } from 'api/types';
import { titleCase } from 'title-case';
import { sortSelectedLines } from './sort';

const KATAKANA = {
	"half": "｡｢｣､･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝﾞﾟ",
	"full": "。「」、・ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン゛゜"
}
const HANGUL_JAMO = {
	"half": "ﾡﾢﾣﾤﾥﾦﾧﾨﾩﾪﾫﾬﾭﾮﾯﾰﾱﾲﾳﾴﾵﾶﾷﾸﾹﾺﾻﾼﾽﾾￂￃￄￅￆￇￊￋￌￍￎￏￒￓￔￕￖￗￚￛￜ",
	"full": "ㄱㄲㄳㄴㄵㄶㄷㄸㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅃㅄㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
}
const SYMBOLS = {
	"half": "¢£¬¯¦¥₩",
	"full": "￠￡￢￣￤￥￦"
}



async function apply_case(case_type: string) {
	let text = await joplin.commands.execute('selectedText');

	if (case_type == 'upper') {
		text = text.toUpperCase();
	} else if (case_type == 'lower') {
		text = text.toLowerCase();
	} else if (case_type == 'title') {
		text = await toTitleCase(text);
	} else if (case_type == 'sentence') {
		text = await toSentenceCase(text);
	} else if (case_type == 'fullwidth') {
		text = toFullWidth(text);
	} else if (case_type == 'halfwidth') {
		text = toHalfWidth(text);
	}

	await joplin.commands.execute('editor.execCommand', {
		name: 'replaceSelection',
		args: [text, 'around'],
	});

	// this works also with the rich text editor
	const editedText = await joplin.commands.execute('selectedText');
	if (editedText != text) {
		await joplin.commands.execute('replaceSelection', text);
	}
}

async function toTitleCase(text: string): Promise<string> {
	if (await joplin.settings.value('always_lowercase')) {
		text = text.toLowerCase();
	}
	return titleCase(text);
}

async function toSentenceCase(text: string): Promise<string> {
	if (await joplin.settings.value('always_lowercase')) {
		text = text.toLowerCase();
	}
	return text.replace(
		/([a-zA-Z]+[^.!?:\n]+[.!?:]*[\s]*)/g,
		(match: string, offset: number) => match[0].toUpperCase() + match.slice(1)
	);
}

function toFullWidth(text: string): string {
	var ret = "";
	const chars = [...text];
	for (var i=0; i<chars.length; i++){
		var char = chars[i];
		var code = char.charCodeAt(0);

		if (code == 0x20 /*[space]*/) { ret += String.fromCharCode(0x3000 /*[ideogaphic-space]*/); continue }
		if (code>=0x21 && code<=0x7e) { ret += String.fromCharCode(code+0xfee0); continue }

		var idx = KATAKANA["half"].indexOf(char);
		if (idx !== -1) {ret += KATAKANA["full"].charAt(idx); continue}

		idx = HANGUL_JAMO["half"].indexOf(char);
		if (idx !== -1) {ret += HANGUL_JAMO["full"].charAt(idx); continue}

		idx = SYMBOLS["half"].indexOf(char);
		if (idx !== -1) {ret += SYMBOLS["full"].charAt(idx); continue}

		ret += char;
	}
	return ret
}

function toHalfWidth(text: string): string {
	var ret = "";
	const chars = [...text];
	for (var i=0; i<chars.length; i++){
		var char = chars[i];
		var code = char.charCodeAt(0);

		if (code == 0x3000 /*[ideogaphic-space]*/) { ret += String.fromCharCode(0x20 /*space*/); continue }
		if (code>=0xff01 && code<=0xff5e) { ret += String.fromCharCode(code-0xfee0); continue }

		var idx = KATAKANA["full"].indexOf(char);
		if (idx !== -1) {ret += KATAKANA["half"].charAt(idx); continue}

		idx = HANGUL_JAMO["full"].indexOf(char);
		if (idx !== -1) {ret += HANGUL_JAMO["half"].charAt(idx); continue}

		idx = SYMBOLS["full"].indexOf(char);
		if (idx !== -1) {ret += SYMBOLS["half"].charAt(idx); continue}

		ret += char;
	}
	return ret
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

		joplin.settings.registerSection('suitcase', {
			label: 'Suitcase',
			iconName: 'fas fa-suitcase',
		});

		joplin.settings.registerSettings({
			'always_lowercase': {
				value: false,
				type: SettingItemType.Bool,
				section: 'suitcase',
				public: true,
				label: 'Always lowercase text first',
				description: 'When enabled, text will always be lowercased before applying the selected case. Default: false',
			}
		});

		joplin.commands.register({
			name: 'suitcase.sort',
			label: 'Sort selected lines (insensitive)',
			execute: async () => {
				sortSelectedLines();
			}
		});
		await joplin.views.menuItems.create('suitcaseSort', 'suitcase.sort', MenuItemLocation.EditorContextMenu, { accelerator: 'CmdOrCtrl+Alt+Shift+A' });
	},
});
