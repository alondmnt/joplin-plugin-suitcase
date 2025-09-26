import joplin from 'api';

function leadingWhitespaceLength(line: string): number {
    let count = 0;
    for (const char of line) {
        if (char === ' ' || char === '\t') {
            count += 1;
        } else {
            break;
        }
    }
    return count;
}

function findBaseIndent(lines: string[]): number {
    const nonEmptyIndents = lines
        .filter(line => line.trim().length > 0)
        .map(leadingWhitespaceLength);
    if (!nonEmptyIndents.length) {
        return 0;
    }
    return Math.min(...nonEmptyIndents);
}

interface BlockInfo {
    lines: string[];
    firstLine: string;
    index: number;
}

function buildBlocks(lines: string[]): BlockInfo[] {
    const baseIndent = findBaseIndent(lines);
    const blocks: BlockInfo[] = [];

    let currentBlock: string[] = [];
    let currentHasContent = false;
    let pendingLeadingBlanks: string[] = [];

    const pushBlock = (blockLines: string[]) => {
        const firstContent = blockLines.find(line => line.trim().length > 0) ?? '';
        blocks.push({
            lines: blockLines,
            firstLine: firstContent,
            index: blocks.length,
        });
    };

    const flushBlock = () => {
        if (!currentBlock.length) {
            return;
        }
        if (!currentHasContent) {
            if (blocks.length) {
                blocks[blocks.length - 1].lines.push(...currentBlock);
            } else {
                pendingLeadingBlanks.push(...currentBlock);
            }
        } else {
            const combined = pendingLeadingBlanks.length
                ? [...pendingLeadingBlanks, ...currentBlock]
                : [...currentBlock];
            pushBlock(combined);
            pendingLeadingBlanks = [];
        }
        currentBlock = [];
        currentHasContent = false;
    };

    for (const line of lines) {
        const indent = leadingWhitespaceLength(line);
        const isBlank = line.trim().length === 0;
        const isBlockLeader = !isBlank && indent <= baseIndent;

        if (currentBlock.length && (isBlockLeader || indent < baseIndent)) {
            flushBlock();
        }

        currentBlock.push(line);
        if (!isBlank) {
            currentHasContent = true;
        }
    }

    flushBlock();

    if (pendingLeadingBlanks.length) {
        if (blocks.length) {
            blocks[blocks.length - 1].lines.push(...pendingLeadingBlanks);
        } else {
            pushBlock([...pendingLeadingBlanks]);
        }
    }

    return blocks;
}

function compareLines(a: string, b: string): number {
    const trimmedA = a.trim();
    const trimmedB = b.trim();

    const numPattern = /^\d+(\.\d+)*/;
    const numA = trimmedA.match(numPattern);
    const numB = trimmedB.match(numPattern);

    if (numA && numB) {
        const numCompare = numA[0].localeCompare(numB[0], undefined, { numeric: true, sensitivity: 'base' });
        if (numCompare !== 0) {
            return numCompare;
        }
    } else if (numA) {
        return -1;
    } else if (numB) {
        return 1;
    }

    return trimmedA.toLowerCase().localeCompare(trimmedB.toLowerCase());
}

export async function sortSelectedLines(): Promise<void> {
    const ranges = await joplin.commands.execute('editor.execCommand', {
        name: 'listSelections',
    });

    for (let i = 0; i < ranges.length; i++) {
        const { anchor, head } = ranges[i];
        const start = Math.min(anchor.line, head.line);
        const end = Math.max(anchor.line, head.line);

        const originalLines: string[] = [];
        for (let j = start; j <= end; j++) {
            const line = await joplin.commands.execute('editor.execCommand', {
                name: 'getLine',
                args: [j],
            });
            originalLines.push(line);
        }

        if (!originalLines.length) {
            continue;
        }

        const blocks = buildBlocks(originalLines);
        blocks.sort((a, b) => {
            const lineCompare = compareLines(a.firstLine, b.firstLine);
            if (lineCompare !== 0) {
                return lineCompare;
            }
            return a.index - b.index;
        });

        const lines = blocks.reduce<string[]>((acc, block) => {
            acc.push(...block.lines);
            return acc;
        }, []);

        const text = lines.join('\n');
        const ch = originalLines[originalLines.length - 1].length;

        await joplin.commands.execute('editor.execCommand', {
            name: 'replaceRange',
            args: [text, { line: start, ch: 0 }, { line: end, ch: ch }],
        });
    }
}
