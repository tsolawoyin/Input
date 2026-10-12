import { Extension } from "@tiptap/core";
import { EditorView } from "@tiptap/pm/view";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

const CODE_INDENT = "  ";

const OPENERS = /[{[(]$/;

// closing bracket -> its matching opener
const CLOSERS: Record<string, string> = {
  "}": "{",
  "]": "[",
  ")": "(",
};

// Phones/touch devices: the virtual keyboard owns newline insertion and
// bracket auto-pairing, so any programmatic rewrite on Enter fights the IME.
const prefersCoarsePointer = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

const isIOS = (): boolean =>
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent || "");

/**
 * Auto-indents new lines inside code blocks.
 *
 * Rather than intercepting Enter (which fights mobile keyboards), we let
 * ProseMirror insert the newline natively and then append the indentation.
 * It is skipped on touch devices, where the virtual keyboard owns newline
 * creation and bracket auto-pairing.
 * If a matching closing bracket already sits on the new line, the block is
 * expanded so the closer keeps the previous line's indentation:
 *
 *   function hello() {|   ->   function hello() {
 *                                 |
 *                              }
 */
export const CodeBlockIndent = Extension.create({
  name: "codeBlockIndent",

  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      new Plugin({
        key: new PluginKey("codeBlockIndent"),

        appendTransaction(transactions, _oldState, newState) {
          // Touch devices: the virtual keyboard owns newline creation and
          // bracket auto-pairing, so leave Enter completely native there.
          if (prefersCoarsePointer()) return null;

          // A programmatic dispatch during an IME composition cancels it.
          if (editor.isDestroyed || editor.view.composing) return null;

          if (!transactions.some((tr) => tr.docChanged)) return null;

          const { selection } = newState;
          if (!selection.empty) return null;

          const { $from } = selection;
          if ($from.parent.type.name !== "codeBlock") return null;

          const offset = $from.parentOffset;
          // First line has nothing to inherit from.
          if (offset === 0) return null;

          const content = $from.parent.textContent;
          const textBefore = content.slice(0, offset);
          // Only when the cursor sits at the start of a fresh line.
          if (!textBefore.endsWith("\n")) return null;

          const textAfter = content.slice(offset);
          const lineEnd = textAfter.indexOf("\n");
          const restOfLine =
            lineEnd === -1 ? textAfter : textAfter.slice(0, lineEnd);

          // The previous line drives the indentation.
          const prevLineEnd = textBefore.length - 1;
          const prevLineStart =
            textBefore.lastIndexOf("\n", prevLineEnd - 1) + 1;
          const prevLine = textBefore.slice(prevLineStart, prevLineEnd);
          const leading = prevLine.match(/^[ \t]*/)?.[0] ?? "";
          const opens = OPENERS.test(prevLine.trimEnd());
          const indent = leading + (opens ? CODE_INDENT : "");

          // A matching closer already on this line: expand into a block.
          const firstChar = restOfLine.charAt(0);
          const closesOpenBlock =
            opens && firstChar !== "" && CLOSERS[firstChar] === prevLine.trimEnd().slice(-1);
          if (closesOpenBlock) {
            const tr = newState.tr.insertText(
              `${indent}\n${leading}`,
              selection.from,
            );
            tr.setSelection(
              TextSelection.create(tr.doc, selection.from + indent.length),
            );
            return tr;
          }

          // Only indent a truly empty line.
          if (restOfLine.length > 0 || indent.length === 0) return null;

          return newState.tr.insertText(indent, selection.from);
        },
      }),
    ];
  },
});

/**
 * Outdents a closing bracket typed at the start of an indented line so it
 * lines up with the line that opened its block. Returns true when handled.
 */
export function handleCodeBlockOutdent(
  view: EditorView,
  event: KeyboardEvent,
): boolean {
  // Never interfere with an IME composition, or on touch devices where the
  // virtual keyboard auto-pairs brackets itself.
  if (prefersCoarsePointer() || view.composing || event.isComposing) return false;

  const opener = CLOSERS[event.key];
  if (!opener) return false;

  const { state } = view;
  const { selection } = state;
  const { $from, empty } = selection;

  if (!empty || $from.parent.type.name !== "codeBlock") return false;

  const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
  const lineStart = textBefore.lastIndexOf("\n") + 1;
  const linePrefix = textBefore.slice(lineStart);

  // Only act when the cursor sits in leading whitespace.
  if (linePrefix.length === 0 || !/^[ \t]*$/.test(linePrefix)) return false;

  // Walk back to the matching opener for the bracket being typed.
  let depth = 0;
  let openerIndex = -1;
  for (let i = textBefore.length - 1; i >= 0; i -= 1) {
    const char = textBefore[i];
    if (char === event.key) {
      depth += 1;
    } else if (char === opener) {
      if (depth === 0) {
        openerIndex = i;
        break;
      }
      depth -= 1;
    }
  }
  if (openerIndex === -1) return false;

  const openerLineStart = textBefore.lastIndexOf("\n", openerIndex - 1) + 1;
  const targetIndent =
    textBefore.slice(openerLineStart).match(/^[ \t]*/)?.[0] ?? "";

  if (targetIndent === linePrefix) return false;

  const from = $from.start() + lineStart;
  const tr = state.tr.insertText(targetIndent + event.key, from, selection.from);
  view.dispatch(tr);
  event.preventDefault();
  return true;
}

/**
 * Fallback for touch keyboards (Android/Gboard): their Enter key is often
 * delivered only as a `beforeinput` with inputType `insertLineBreak` while an
 * autocorrect/suggestion composition is running — no usable keydown, so
 * ProseMirror's keymap never creates the newline. Take over the newline in
 * code blocks on our own when the browser hasn't committed it.
 */
export function handleMobileCodeBlockNewline(
  view: EditorView,
  event: InputEvent,
): boolean {
  if (!prefersCoarsePointer() || isIOS()) return false;

  const type = event.inputType;
  if (type !== "insertLineBreak" && type !== "insertParagraph") return false;

  const { selection } = view.state;
  if (!selection.empty || selection.$from.parent.type.name !== "codeBlock")
    return false;

  event.preventDefault();
  view.dispatch(view.state.tr.insertText("\n", selection.from));
  return true;
}
