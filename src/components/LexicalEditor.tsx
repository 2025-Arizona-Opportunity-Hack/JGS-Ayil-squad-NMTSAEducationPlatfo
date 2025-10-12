import { useEffect, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
  $getRoot,
  $insertNodes,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from "@lexical/list";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const theme = {
  // Theme styling for editor
  root: "p-4 border rounded-lg min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary",
  paragraph: "mb-2",
  heading: {
    h1: "text-2xl font-bold mb-3",
    h2: "text-xl font-bold mb-2",
    h3: "text-lg font-bold mb-2",
  },
  list: {
    ul: "list-disc list-inside mb-2",
    ol: "list-decimal list-inside mb-2",
    listitem: "ml-4",
  },
  quote: "border-l-4 border-primary pl-4 italic my-2 text-muted-foreground",
  code: "bg-muted px-1 py-0.5 rounded font-mono text-sm",
  codeHighlight: {
    atrule: "text-blue-600",
    attr: "text-blue-600",
    boolean: "text-orange-600",
    builtin: "text-purple-600",
    cdata: "text-gray-600",
    char: "text-green-600",
    class: "text-blue-600",
    "class-name": "text-blue-600",
    comment: "text-gray-500",
    constant: "text-orange-600",
    deleted: "text-red-600",
    doctype: "text-gray-600",
    entity: "text-orange-600",
    function: "text-purple-600",
    important: "text-red-600",
    inserted: "text-green-600",
    keyword: "text-purple-600",
    namespace: "text-blue-600",
    number: "text-orange-600",
    operator: "text-gray-700",
    prolog: "text-gray-600",
    property: "text-blue-600",
    punctuation: "text-gray-700",
    regex: "text-green-600",
    selector: "text-blue-600",
    string: "text-green-600",
    symbol: "text-orange-600",
    tag: "text-red-600",
    url: "text-blue-600",
    variable: "text-orange-600",
  },
  link: "text-primary underline cursor-pointer hover:text-primary/80",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "bg-muted px-1 py-0.5 rounded font-mono text-sm",
  },
};

function onError(error: Error) {
  console.error(error);
}

interface ToolbarPluginProps {
  isRichText?: boolean;
}

function ToolbarPlugin({ isRichText = true }: ToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();

  if (!isRichText) return null;

  const formatText = (format: "bold" | "italic" | "underline" | "strikethrough" | "code") => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingSize: "h1" | "h2") => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize));
      }
    });
  };

  const formatList = (listType: "bullet" | "number") => {
    if (listType === "bullet") {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
  };

  const undo = () => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
  };

  const redo = () => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={undo}
        className="h-8 w-8 p-0"
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={redo}
        className="h-8 w-8 p-0"
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-8 mx-1" />
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatText("bold")}
        className="h-8 w-8 p-0"
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatText("italic")}
        className="h-8 w-8 p-0"
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatText("underline")}
        className="h-8 w-8 p-0"
        title="Underline"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatText("strikethrough")}
        className="h-8 w-8 p-0"
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatText("code")}
        className="h-8 w-8 p-0"
        title="Code"
      >
        <Code className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-8 mx-1" />
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatHeading("h1")}
        className="h-8 w-8 p-0"
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatHeading("h2")}
        className="h-8 w-8 p-0"
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-8 mx-1" />
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatList("bullet")}
        className="h-8 w-8 p-0"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatList("number")}
        className="h-8 w-8 p-0"
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={formatQuote}
        className="h-8 w-8 p-0"
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-8 mx-1" />
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={insertLink}
        className="h-8 w-8 p-0"
        title="Insert Link"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface InitialContentPluginProps {
  initialContent?: string;
}

function InitialContentPlugin({ initialContent }: InitialContentPluginProps) {
  const [editor] = useLexicalComposerContext();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (initialContent && !hasInitialized.current) {
      hasInitialized.current = true;
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        
        // Parse HTML content
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialContent, "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);
        
        // Insert parsed nodes
        root.select();
        $insertNodes(nodes);
      });
    }
  }, [editor, initialContent]);

  return null;
}

interface HtmlChangePluginProps {
  onChange: (html: string) => void;
}

function HtmlChangePlugin({ onChange }: HtmlChangePluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const htmlContent = $generateHtmlFromNodes(editor);
        onChange(htmlContent);
      });
    });
  }, [editor, onChange]);

  return null;
}

interface LexicalEditorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isRichText?: boolean;
  className?: string;
}

export function LexicalEditor({
  value = "",
  onChange,
  placeholder = "Enter text...",
  isRichText = true,
  className = "",
}: LexicalEditorProps) {
  const initialConfig = {
    namespace: "LexicalEditor",
    theme,
    onError,
    nodes: isRichText
      ? [
          HeadingNode,
          QuoteNode,
          ListNode,
          ListItemNode,
          CodeNode,
          CodeHighlightNode,
          LinkNode,
        ]
      : [],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={`relative border rounded-lg overflow-hidden bg-background ${className}`}>
        <ToolbarPlugin isRichText={isRichText} />
        {isRichText ? (
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[200px] p-4 focus:outline-none" />
            }
            placeholder={
              <div className="absolute top-14 left-4 text-muted-foreground pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={() => <div className="text-red-500 p-4">Error loading editor</div>}
          />
        ) : (
          <PlainTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[200px] p-4 focus:outline-none" />
            }
            placeholder={
              <div className="absolute top-14 left-4 text-muted-foreground pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={() => <div className="text-red-500 p-4">Error loading editor</div>}
          />
        )}
        <HistoryPlugin />
        <HtmlChangePlugin onChange={onChange} />
        {isRichText && (
          <>
            <ListPlugin />
            <LinkPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          </>
        )}
        <InitialContentPlugin initialContent={value} />
      </div>
    </LexicalComposer>
  );
}

