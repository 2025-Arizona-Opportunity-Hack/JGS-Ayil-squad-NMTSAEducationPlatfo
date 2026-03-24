import { useState, useCallback, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  value: string; // comma-separated string (for form compatibility)
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

/**
 * Tag input that converts comma-separated text into visual tag badges.
 * Tags are created on comma, Enter, or Tab. Backspace removes the last tag
 * when the input is empty. The underlying value remains a comma-separated
 * string for form compatibility.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Add a tag...",
  id,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  // Parse comma-separated string into array
  const tags = value
    ? value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim().toLowerCase();
      if (!tag || tags.includes(tag)) return;
      const next = [...tags, tag].join(", ");
      onChange(next);
      setInputValue("");
    },
    [tags, onChange],
  );

  const removeTag = useCallback(
    (index: number) => {
      const next = tags.filter((_, i) => i !== index).join(", ");
      onChange(next);
    },
    [tags, onChange],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === "Tab" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleChange = (raw: string) => {
    // If pasting or typing a comma, split and add tags
    if (raw.includes(",")) {
      const parts = raw.split(",");
      // Add all complete tags (everything before the last comma)
      for (const part of parts.slice(0, -1)) {
        if (part.trim()) addTag(part);
      }
      // Keep the remainder in the input
      setInputValue(parts[parts.length - 1]);
    } else {
      setInputValue(raw);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {tags.map((tag, i) => (
        <Badge
          key={`${tag}-${i}`}
          variant="secondary"
          className="gap-1 pr-1 text-xs"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 focus:outline-none"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        id={id}
        type="text"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) addTag(inputValue);
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] border-0 p-0 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}
