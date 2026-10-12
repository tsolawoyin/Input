import { useEditor } from "@tiptap/react";
import { useState, useEffect } from "react";
import StarterKit from "@tiptap/starter-kit";
import MathExtension from "@aarkue/tiptap-math-extension";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { BulletList, ListItem, OrderedList } from "@tiptap/extension-list";
import { Placeholder, CharacterCount } from "@tiptap/extensions";
import {
  CodeBlockIndent,
  handleCodeBlockOutdent,
  handleMobileCodeBlockNewline,
} from "./plugins/code-indent";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { lowlight } from "./lowlight";
import {
  TableOfContentData,
  TableOfContents,
  getHierarchicalIndexes,
} from "@tiptap/extension-table-of-contents";

interface EditorProps {
  autoFocus?: boolean;
  html?: string;
  text?: string;
  json?: any;
  parseMath?: boolean;
  placeholder?: string;
  limit?: number;
}

export default function useInput(props: EditorProps) {
  const [html, setHtml] = useState(props.html);
  const [text, setText] = useState(props.text);
  const [json, setJson] = useState(props.json);
  const [toc, setToc] = useState<TableOfContentData>([]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
      }),
      ...(props.parseMath ? [MathExtension.configure({})] : []),
      CharacterCount.configure({
        limit: props.limit,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        enableTabIndentation: true,
        tabSize: 2,
      }),
      CodeBlockIndent,
      Placeholder.configure({
        placeholder: props.placeholder,
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color.configure({
        types: ["textStyle"],
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      BulletList,
      OrderedList,
      ListItem,
      Link.configure({
        openOnClick: false, // don't navigate away while editing
        autolink: true, // auto-detect pasted URLs and typed www./http(s):// text
        linkOnPaste: true, // turn pasted URLs into links automatically
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TableOfContents.configure({
        getIndex: getHierarchicalIndexes,
        onUpdate(content) {
          setToc(content);
        },
      }),
    ],
    
    editorProps: {
      attributes: {
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
        "data-gramm": "false",
      },
      handleKeyDown: (view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "a") {
          if (!editor || editor.isDestroyed) return false;
          event.preventDefault();
          editor.commands.selectAll();
          return true;
        }

        if (handleCodeBlockOutdent(view, event)) return true;
      },
      handleDOMEvents: {
        beforeinput(view, event) {
          return handleMobileCodeBlockNewline(view, event as InputEvent);
        },
      },

      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        const anchor = target.closest("a");
        if (anchor) {
          event.preventDefault();
          return true; // tell ProseMirror the click was handled
        }
        return false;
      },
    },

    content: html,
    autofocus: props.autoFocus ? "end" : false,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;

    const sync = () => {
      if (!editor || editor.isDestroyed || !editor.schema) return;
      const plain = editor.getText();
      setHtml(editor.getHTML());
      setText(plain);
      setJson(editor.getJSON());
    };

    sync(); // initial sync - covers mount case
    editor.on("update", sync);

    return () => {
      editor.off("update", sync);
    };
  }, [editor]);

  return {
    editor,
    html,
    text,
    json,
    toc,
  };
}
