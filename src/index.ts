import joplin from 'api';
import { ContentScriptType, SettingItemType, ToolbarButtonLocation } from 'api/types';
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
// User can enable/disable cases that are rotated in Swap Case command. It makes sense to at least have original, lowercase,
// uppercase, no case.
const MIN_SWAP_CASE_CYCLE_CASES = 3;
// Time after last Swap Case command change that `onNoteChange` handler thinks change is coming from Swap Case command
// rather than from a regular note change. User changing note content resets Swap Case cycle.
// This value was derived experimentally and is this high mainly because Mobile Web with 4x performance slowdown triggers
// `onNoteChange` trigger too late. On high-performance devices this value is really around 300ms, but let's orient on
// worst case scenario here.
// @see `lastSwapCaseChangeTimestamp`.
const TIMEOUT_IGNORE_NOTE_CHANGE_SINCE_LAST_SWAP_CASE_MS = 4000;

let currentCase = 0;
let currentCaseSwapCycleList: string[] | null = null;
let initialTextOfSwapCaseCycle: string;
let prevSwapCaseResult: string;
// used to prohibit concurrent Swap Case command executions. Often happens on low-end CPU devices.
let swapCaseInProgress = false;
// allows us to differentiate between case change in 'Swap Case' command and regular note change.
// @see `TIMEOUT_IGNORE_NOTE_CHANGE_SINCE_LAST_SWAP_CASE_MS`.
let lastSwapCaseChangeTimestamp: number = Date.now();

joplin.workspace.onNoteSelectionChange(async () => {
	// Reset Swap Case cycle when note selection changes
	resetSwapCaseCycleMemory();
});

joplin.workspace.onNoteChange(async (event: any) => {
	// Reset case cycle memory when note content changes - user no longer interested in changing case for prev. text.
	// `onNoteChange` trigger is called during Swap Case command when it does Undo or updates the selection with new case.
	// It's also called on regular changes to note from the user.
	// We want reset Swap Cycle memory when users starts editing note manually, but how differentiate such change from Swap
	// Case cmd change?
	// Here we assume change comes from Swap Case cmd if a couple of seconds from last cmd execution have not yet elapsed.
	// Non-avoidable bug is when user runs Swap Case cmd, then types something elsewhere really fast and without selecting
	// any text runs the Swap Case cmd again - plugin will rollback text that user just typed.
	// This is really an edge case - normally user would select text they want to change case on.
	if ((Date.now() - lastSwapCaseChangeTimestamp) < TIMEOUT_IGNORE_NOTE_CHANGE_SINCE_LAST_SWAP_CASE_MS) {
		return;
	}
	resetSwapCaseCycleMemory();
});

// Update settings
joplin.settings.onChange(async (event: any) => {
	resetSwapCaseCycleMemory();
});

/**
 * Returns list of all possible case codes used in Swap Case command.
 */
function getDefaultCaseCycleList(): string[] {
	return [
		'original', 'lower', 'upper', 'title', 'sentence'
	];
}

/**
 * Gets initially selected text at beginning of current "Swap Case" cycle, or, if no such text - gets one from current
 * text selection.
 */
async function getInitialOrCurrentlySelectedText(): Promise<string> {
	return initialTextOfSwapCaseCycle
		? initialTextOfSwapCaseCycle
		: await joplin.commands.execute('selectedText');
}

/**
 * Filters and sorts all possible cases in "Swap Case" command based on user settings.
 * Returns all possible cases (`getDefaultCaseCycleList()`) if user configured duplicate case order in plugin settings.
 * @throws error if filtered cases amount is lower than defined in `MIN_SWAP_CASE_CYCLE_CASES` constant.
 */
async function getSwapCaseCycleList(): Promise<string[]> {
	const allCases = getDefaultCaseCycleList();
	const enabledCases: { caseType: string, order: number }[] = [];
	const orderSet = new Set<number>();
	// filter all possible cases based on plugin settings
	for (const caseType of allCases) {
		const order = await joplin.settings.value(`case_${caseType}_order`);
		if (order < 0 && caseType !== 'original') {
			continue;
		}
		enabledCases.push({ caseType, order });
		if (orderSet.has(order)) {
			console.warn(`Duplicate order ${order} detected for case '${caseType}'. Using default order.`);
			return getDefaultCaseCycleList(); // Fallback to default if validation fails
		}
		orderSet.add(order);
	}
	if (enabledCases.length < MIN_SWAP_CASE_CYCLE_CASES) {
		throw new Error(`Suitcase plugin. Error: 'Swap Case' command aborted. Min cases required to be enabled in settings: ${MIN_SWAP_CASE_CYCLE_CASES}`);
	}
	enabledCases.sort((a, b) => a.order - b.order);

	return enabledCases.map(item => item.caseType);
}

function chooseNextCaseInSwapCaseCycle(): void {
	currentCase = (currentCase + 1) % currentCaseSwapCycleList.length;
}

async function resetSwapCaseCycleMemory() {
	currentCase = 0;
	currentCaseSwapCycleList = null;
	initialTextOfSwapCaseCycle = null;
	prevSwapCaseResult = null;

	console.debug("Reset Swap Cycle memory");
}

/**
 * Triggers selected text transformation each time with different case.
 * When first triggered on particular text user should first select text - no selection needed for following iterations.
 * Applied cases are filtered, sorted and executed based on user settings for each case type.
 * Remembers the very first selected text and uses it for each next transformation until other text is selected, note is
 * switched, or note content is changed.
 * Undo (Ctrl+Z) is performed to before each case change to restore initially selected text and restore selection
 * — except when the transformation yields text identical to the original selection.
 * Swap Case cycle is exited when:
 * - user iterated to end of cycle and is now on initial version, clicks somewhere else and runs command again;
 * - user changes/switches note;
 * - user updates the plugin settings;
 */
async function swapCase(isRerun: boolean = false): Promise<void> {
	if (swapCaseInProgress && !isRerun) {
		console.debug("Skip concurrent Swap Case command execution.");
		return;
	}
	swapCaseInProgress = true;
	try {
		let inMiddleOfSwapCaseCycle = initialTextOfSwapCaseCycle && initialTextOfSwapCaseCycle.length > 0;

		let selectedText = await joplin.commands.execute('selectedText');

		const totallyNewSelection = selectedText?.trim() && (selectedText !== prevSwapCaseResult) && !isRerun;
		if (totallyNewSelection) {
			await initNewSwapCaseCycle();
			console.debug("Started new Swap Case cycle. Reason: totally new selection");
		}
		// Perform Undo (CTRL+Z) in middle of Swap Case cycle so editor rollbacks recent case and auto-selects initially
		// selected text at beginning.
		// In original plugin implementation plugin would just replace current selection with new text. It was problematic
		// with Rich Text Editor (TinyMCE) - it doesn't preserve selection after text replacement forcing user to re-select.
		// Now that we perform Undo before applying new text version - TinyMCE re-gains selection and user does not need
		// to select text to transform text again. Bonus: Undo history isn't flooded with case transformations.
		// Edge case: when prev. transformation produces same text as initially selected text editor treats it as if we
		// have not performed any transformations so we're back to point where we initially selected text.
		// If we do Undo at this point - even prior note changes get affected - so we skip Undo.
		// It's not needed anyway because selection is already in place, so we ready for next transformation.
		// If user moves cursor somewhere else at this point and calls Swap Case cmd - we treat it as exit from Swap Case cycle.
		// If user keep cursor - we continue with Swap Case cycle.
		if (inMiddleOfSwapCaseCycle && prevSwapCaseResult !== initialTextOfSwapCaseCycle && !totallyNewSelection && !isRerun) {
			await undoEditorChange();
			// Undo triggers `onNoteChange` that resets cycle memory - instead let it know that following change should be ignored.
			lastSwapCaseChangeTimestamp = Date.now();
			selectedText = await waitForSelectedTextToChange(selectedText, 300, 2000);
		}
		if (!selectedText.trim()) {
			console.warn("Skip running 'Swap Case' command because no selected text.");
			return;
		}
		let newText = await transformCaseOfCurSelection(currentCaseSwapCycleList[currentCase]);

		const newTextSameAsInitial = newText === initialTextOfSwapCaseCycle;
		// if in middle of cycle we generate same case as prev. iteration - retry with new case.
		// Example scenario: "lowercase" is configured as first in cycle -> user selects "hello world" -> runs cmd ->
		// back to same text as we had before -> why display? -> let's skip to the next one which might be "uppercase".
		if (newText?.trim() && (newText?.trim() === prevSwapCaseResult?.trim())) {
			console.debug("Starting again because same case as prev. iteration");
			chooseNextCaseInSwapCaseCycle();
			await swapCase(true); // recursive call
			return;
		}

		if (!newTextSameAsInitial) {
			await applyCase(newText);
			// `applyCase` triggers `onNoteChange` that resets cycle memory - instead let it know that following change should be ignored.
			lastSwapCaseChangeTimestamp = Date.now();
			console.debug("Swap Case command applied new case transformation.")
		}

		prevSwapCaseResult = newText;
		chooseNextCaseInSwapCaseCycle();
	} catch (error) {
		console.error("An error occurred during Swap Case command:", (error as Error).message);
	} finally {
		swapCaseInProgress = false;
	}
}

/**
 * Restart "Swap Case" command's case cycle by:
 * - resetting all memory associated with it;
 * - reloading all user-configured cases;
 * - adding currently selected text to "Swap Case" cycle memory.
 */
async function initNewSwapCaseCycle(): Promise<void> {
	await resetSwapCaseCycleMemory();

	currentCaseSwapCycleList = await getSwapCaseCycleList();

	initialTextOfSwapCaseCycle = await getInitialOrCurrentlySelectedText();
	prevSwapCaseResult = initialTextOfSwapCaseCycle;

	console.debug("Started new Swap Cycle");
}

async function transformCaseOfCurSelection(case_type: string): Promise<string> {
	let text = await getInitialOrCurrentlySelectedText();

	if (case_type === 'original') {
		text = initialTextOfSwapCaseCycle;
	} else if (case_type === 'upper') {
		text = text.toUpperCase();
	} else if (case_type === 'lower') {
		text = text.toLowerCase();
	} else if (case_type === 'title') {
		text = await toTitleCase(text);
	} else if (case_type === 'sentence') {
		text = await toSentenceCase(text);
	} else if (case_type === 'fullwidth') {
		text = toFullWidth(text);
	} else if (case_type === 'halfwidth') {
		text = toHalfWidth(text);
	}
	return text;
}

async function applyCase(text: string): Promise<void> {
	await joplin.commands.execute('editor.execCommand', {
		name: 'replaceAndKeepSelection',
		args: [text]
	});
	if (await joplin.commands.execute('selectedText') !== text) {
		await joplin.commands.execute('replaceSelection', text);
	}
}

async function performCaseTransformationOnSelectedTextAndApply(case_type: string): Promise<void> {
	let newText = await transformCaseOfCurSelection(case_type);

	await applyCase(newText);
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

/**
 * Runs both CodeMirror 6 & TinyMCE editor commands to undo the recent change.
 * Depending on active editor - one of the commands should work and other one is ignored.
 */
async function undoEditorChange() {
	// CM 6
	await joplin.commands.execute('editor.undo');
	// TinyMCE
	await joplin.commands.execute('editor.execCommand', {
		name: 'Undo',
		args: [],
		ui: false,
		value: '',
	});
}

/**
 * Synchronously waits for selected text in editor to change, or until `timeoutMs` elapses.
 * @param selectedTextIn text that current selection is compared to;
 * @param pollIntervalMs how frequent should method call Joplin Plugin API `selectedText` function.
 * @param timeoutMs how long to wait for selected text change before throwing reject.
 * @returns newly changed selected text.
 * @throws reject if selected text hasn't changed in time passed in `timeoutMs` parameter.
 */
function waitForSelectedTextToChange(
	selectedTextIn: string,
	pollIntervalMs = 50,
	timeoutMs = 2000
): Promise<string> {
	return new Promise((resolve, reject) => {
		const start = performance.now();

		const tick = async () => {
			const newSelectedText = await joplin.commands.execute('selectedText');
			if (newSelectedText !== selectedTextIn) {
				resolve(newSelectedText);
			} else if (performance.now() - start >= timeoutMs) {
				return reject(new Error(`Timeout after ${timeoutMs} ms`));
			} else {
				setTimeout(tick, pollIntervalMs);
			}
		};

		tick();
	});
}

joplin.plugins.register({
	onStart: async function() {
		joplin.commands.register({
			name: 'suitcase.swap',
			enabledCondition: 'markdownEditorPaneVisible || richTextEditorVisible',
			iconName: 'fas fa-suitcase',
			label: 'Swap case',
			execute: async () => {
				swapCase();
			}
		});
		joplin.commands.register({
			name: 'suitcase.lower',
			enabledCondition: 'markdownEditorPaneVisible || richTextEditorVisible',
			label: 'lower case',
			execute: async () => {
				performCaseTransformationOnSelectedTextAndApply('lower');
			}
		});
		joplin.commands.register({
			name: 'suitcase.upper',
			enabledCondition: 'markdownEditorPaneVisible || richTextEditorVisible',
			label: 'UPPER CASE',
			execute: async () => {
				performCaseTransformationOnSelectedTextAndApply('upper');
			}
		});
		joplin.commands.register({
			name: 'suitcase.uppernochars',
			enabledCondition: 'markdownEditorPaneVisible || richTextEditorVisible',
			label: 'UPPER CASE',
			execute: async () => {
				applyCase('upper');
			}
		});
		joplin.commands.register({
			name: 'suitcase.title',
			enabledCondition: 'markdownEditorPaneVisible || richTextEditorVisible',
			label: 'Title Case',
			execute: async () => {
				performCaseTransformationOnSelectedTextAndApply('title');
			}
		});
		joplin.commands.register({
			name: 'suitcase.sentence',
			enabledCondition: 'markdownEditorPaneVisible || richTextEditorVisible',
			label: 'Sentence case',
			execute: async () => {
				performCaseTransformationOnSelectedTextAndApply('sentence');
			}
		});
		joplin.commands.register({
			name: 'suitcase.fullwidth',
			enabledCondition: 'markdownEditorPaneVisible || richTextEditorVisible',
			label: 'ｆｕｌｌｗｉｄｔｈ',
			execute: async () => {
				performCaseTransformationOnSelectedTextAndApply('fullwidth');
			}
		});
		joplin.commands.register({
			name: 'suitcase.halfwidth',
			enabledCondition: 'markdownEditorPaneVisible || richTextEditorVisible',
			label: 'halfwidth',
			execute: async () => {
				performCaseTransformationOnSelectedTextAndApply('halfwidth');
			}
		});
		await joplin.views.menus.create('suitcaseMenu', 'Capitalization', [
			{
			  label: 'Swap case',
			  commandName: 'suitcase.swap',
			  accelerator: 'CmdOrCtrl+Alt+Shift+C',
			},
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
				value: true,
				type: SettingItemType.Bool,
				section: 'suitcase',
				public: true,
				label: 'Always lowercase text first',
				description: 'When enabled, text will always be lowercased before applying the selected case. Default: true',
			},
			'case_original_order': {
				value: -9999999,
				type: SettingItemType.Int,
				section: 'suitcase',
				public: false,
				label: 'Swap case: Order for applying original version of selected text. Non-modifiable to user. Should be first so that when user have not found right case - they are back to original one in the end of cycle.'
			},
			'case_lower_order': {
				value: 10,
				minimum: -1,
				step: 1,
				type: SettingItemType.Int,
				section: 'suitcase',
				public: true,
				label: 'Swap case: Order for lower case',
				description: 'Order in scope of "Swap case" command (-1 to disable). Must be unique unless -1.',
			},
			'case_upper_order': {
				value: 30,
				minimum: -1,
				step: 1,
				type: SettingItemType.Int,
				section: 'suitcase',
				public: true,
				label: 'Swap case: Order for UPPER CASE',
				description: 'Order in scope of "Swap case" command (-1 to disable). Must be unique unless -1.',
			},
			'case_title_order': {
				value: 50,
				minimum: -1,
				step: 1,
				type: SettingItemType.Int,
				section: 'suitcase',
				public: true,
				label: 'Swap case: Order for Title Case',
				description: 'Order in scope of "Swap case" command (-1 to disable). Must be unique unless -1.',
			},
			'case_sentence_order': {
				value: 60,
				minimum: -1,
				step: 1,
				type: SettingItemType.Int,
				section: 'suitcase',
				public: true,
				label: 'Swap case: Order for Sentence case',
				description: 'Order in scope of "Swap case" command (-1 to disable). Must be unique unless -1.',
			},
		});

		joplin.commands.register({
			name: 'suitcase.sort',
			label: 'Sort selected lines (insensitive)',
			execute: async () => {
				sortSelectedLines();
			}
		});
		await joplin.views.menuItems.create('suitcaseSort', 'suitcase.sort', MenuItemLocation.EditorContextMenu, { accelerator: 'CmdOrCtrl+Alt+Shift+A' });
		await joplin.views.toolbarButtons.create('swapCase', 'suitcase.swap', ToolbarButtonLocation.EditorToolbar);

		await joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			'replaceSelection',
			'./replaceSelection.js',
		);
	},
});
