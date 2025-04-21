# [v0.4.0](https://github.com/alondmnt/joplin-plugin-suitcase/releases/tag/v0.4.0)
*Released on 2025-04-21T14:13:34Z*

- new: mobile support
- new: `Swap case` command, to rotate between various cases (closes #3)
- new: toolbar button `Swap case`
- new: setting: Swap reset interval (seconds)
- new: keep text selection after editing
- changed: default setting

**Full Changelog**: https://github.com/alondmnt/joplin-plugin-suitcase/compare/v0.3.3...v0.4.0

---

# [v0.3.3](https://github.com/alondmnt/joplin-plugin-suitcase/releases/tag/v0.3.3)
*Released on 2024-03-31T11:06:16Z*

- improve: CodeMirror 6 / beta editor support
    - no longer keeping the text selected
- fix: ties in numbered lines sort

**Full Changelog**: https://github.com/alondmnt/joplin-plugin-suitcase/compare/v0.3.2...v0.3.3

---

# [v0.3.2](https://github.com/alondmnt/joplin-plugin-suitcase/releases/tag/v0.3.2)
*Released on 2023-07-20T21:47:29Z*

new: setting `Always lowercase text first`

---

# [v0.3.1](https://github.com/alondmnt/joplin-plugin-suitcase/releases/tag/v0.3.1)
*Released on 2023-07-20T08:04:24Z*

fix: title case for accented characters

---

# [v0.3.0](https://github.com/alondmnt/joplin-plugin-suitcase/releases/tag/v0.3.0)
*Released on 2023-06-02T06:59:20Z*

## Case-insensitive search

Native "Sort selected lines" command:

```markdown
Amet
Dolor
Lorem
ipsum
sit
```

Suitcase sort:

<img src="https://github.com/alondmnt/joplin-plugin-suitcase/assets/17462125/a3c52c39-04f0-499e-9dee-4951190391ba" width=50%>

## Numbered list

Native "Sort selected lines" command:

```markdown
    1.1 ipsum
    1.2 dolor
    3.1 adipiscing
1. lorem
2. sit
3. consectetur
5. elit
```

Suitcase sort:

<img src="https://github.com/alondmnt/joplin-plugin-suitcase/assets/17462125/6317e71a-7b7f-425a-8e0d-91ea77317d09" width=50%>

- Only supported in the Markdown editor CodeMirror

**Full Changelog**: https://github.com/alondmnt/joplin-plugin-suitcase/compare/v0.2.2...v0.3.0

---

# [v0.2.2](https://github.com/alondmnt/joplin-plugin-suitcase/releases/tag/v0.2.2)
*Released on 2023-01-25T19:29:51Z*

new: rich text editor support

---

# [v0.2.1](https://github.com/alondmnt/joplin-plugin-suitcase/releases/tag/v0.2.1)
*Released on 2022-11-09T19:42:19Z*

- new: add fullwidth-halfwidth support for katakana and hangul (@hieuthi)

---

# [v0.2.0](https://github.com/alondmnt/joplin-plugin-suitcase/releases/tag/v0.2.0)
*Released on 2022-11-07T20:22:57Z*

- new
    - `ｆｕｌｌｗｉｄｔｈ` command
    - `halfwidth` command
- changed
    - selected text is kept selected
    - commands are run directly on the current text, without processing it through `lower case` first

---

# [v0.1.1](https://github.com/alondmnt/joplin-plugin-suitcase/releases/tag/v0.1.1)
*Released on 2022-11-06T17:58:20Z*



---

# [v0.1.0](https://github.com/alondmnt/joplin-plugin-suitcase/releases/tag/v0.1.0)
*Released on 2022-11-04T20:44:00Z*

First release, that includes 4 capitalization commands:

- lower case
- UPPER CASE
- Title Case (based on [title-case](https://www.npmjs.com/package/title-case))
- Sentence case

---
