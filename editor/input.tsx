"use client";

import "./css/code-block.css";
import "./css/editor.css";
import { useEffect } from "react";
import useInput from "./use-editor";
import { Editor, EditorContent } from "@tiptap/react";
import { TableOfContentData } from "@tiptap/extension-table-of-contents";

interface InputProps {
  autoFocus?: boolean;
  html?: string;
  text?: string;
  json?: any;
  parseMath?: boolean;
  placeholder?: string;
  limit?: number;
  getEditor?: (editor: Editor | null) => void;
  getHtml?: (html?: string) => void;
  getText?: (text?: string) => void;
  getJson?: (json?: any) => void;
  getToc?: (toc?: TableOfContentData) => void;
}

export default function Input(props: InputProps) {
  const { editor, html, json, text, toc } = useInput({
    autoFocus: props.autoFocus,
    html: props.html,
    text: props.text,
    json: props.json,
    parseMath: props.parseMath ?? true,
    limit: props.limit,
    placeholder: props.placeholder,
  });

  useEffect(() => {
    if (props.getEditor) props.getEditor(editor);
    if (props.getHtml) props.getHtml(html);
    if (props.getText) props.getText(text);
    if (props.getJson) props.getJson(json);
    if (props.getToc) props.getToc(toc);
  }, [editor]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
