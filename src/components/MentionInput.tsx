import { useState, useRef, useEffect, useCallback } from "react";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  suggestions: string[];
}

const MentionInput = ({ value, onChange, onKeyDown, placeholder, maxLength, className, suggestions }: MentionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const checkForMention = useCallback((text: string, cursorPos: number) => {
    // Find the last @ before cursor that isn't preceded by a word character
    let atIdx = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (text[i] === " " || text[i] === "\n") break;
      if (text[i] === "@") {
        if (i === 0 || text[i - 1] === " " || text[i - 1] === "\n") {
          atIdx = i;
        }
        break;
      }
    }
    if (atIdx >= 0) {
      const query = text.slice(atIdx + 1, cursorPos).toLowerCase();
      setMentionStart(atIdx);
      setMentionQuery(query);
      const filtered = suggestions.filter(s => s.toLowerCase().includes(query)).slice(0, 5);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIdx(0);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    const cursorPos = e.target.selectionStart || newVal.length;
    checkForMention(newVal, cursorPos);
  };

  const selectSuggestion = (name: string) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(inputRef.current?.selectionStart || value.length);
    const newVal = `${before}@${name} ${after}`;
    onChange(newVal);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, filteredSuggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (filteredSuggestions[selectedIdx]) {
          e.preventDefault();
          selectSuggestion(filteredSuggestions[selectedIdx]);
          return;
        }
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        className={className}
      />
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-white/10 bg-card/95 backdrop-blur-md shadow-xl z-50 overflow-hidden"
        >
          {filteredSuggestions.map((name, i) => (
            <button
              key={name}
              onClick={() => selectSuggestion(name)}
              className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center gap-2 ${
                i === selectedIdx ? "bg-primary/20 text-primary" : "text-foreground/80 hover:bg-white/5"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-neon-purple/30 to-neon-cyan/20 flex items-center justify-center text-[10px]">@</span>
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Extract @mentions from text
export const extractMentions = (text: string): string[] => {
  const regex = /@([\w가-힣]+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (!mentions.includes(match[1])) {
      mentions.push(match[1]);
    }
  }
  return mentions;
};

// Render text with highlighted @mentions
export const renderWithMentions = (text: string) => {
  const parts = text.split(/(@[\w가-힣]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} className="text-primary font-semibold cursor-default">
          {part}
        </span>
      );
    }
    return part;
  });
};

export default MentionInput;
