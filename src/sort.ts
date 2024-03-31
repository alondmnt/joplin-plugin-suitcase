import joplin from 'api';

// based on: joplin/packages/app-desktop/gui/NoteEditor/NoteBody/CodeMirror/utils/useLineSorting.ts
export async function sortSelectedLines(): Promise<void> {
    let ranges = await joplin.commands.execute('editor.execCommand', {
        name: 'listSelections',
    });

    for (let i = 0; i < ranges.length; i++) {
        const { anchor, head } = ranges[i];
        const start = Math.min(anchor.line, head.line);
        const end = Math.max(anchor.line, head.line);
    
        const lines = [];
        const linesWithNumbers = [];
        for (let j = start; j <= end; j++) {
            let line = await joplin.commands.execute('editor.execCommand', {
                name: 'getLine',
                args: [j],
            });
            lines.push(line);
        }

        // Init: regular sort
        lines.sort((a, b) => {
            return a.toLowerCase().localeCompare(b.toLowerCase());
            });
        lines.sort((a, b) => {
            const numA = a.trim().match(/^\s*\d+(\.\d+)*/); // Parse the leading number(s)
            const numB = b.trim().match(/^\s*\d+(\.\d+)*/); // Parse the leading number(s)
            if (numA && numB) {
                // Compare the numbers considering them as version numbers
                return numA[0].localeCompare(numB[0], undefined, { numeric: true, sensitivity: 'base' });
            } else if (numA) {
                return -1;  // lines with numbers come first
            } else if (numB) {
                return 1;   // lines with numbers come first
            } else {
                // Case insensitive sorting for lines without numbers
                return a.toLowerCase().localeCompare(b.toLowerCase());
            }
        });

        const text = lines.join('\n');
        const ch = lines[lines.length - 1].length;
    
        await joplin.commands.execute('editor.execCommand', {
            name: 'replaceRange',
            args: [text, { line: start, ch: 0 }, { line: end, ch: ch }],
        });
    }
    
}
