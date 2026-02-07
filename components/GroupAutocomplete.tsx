"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { Group, GroupAutocompleteProps } from "@/types";

const GroupAutocomplete = ({ value, onChange, websiteId }: GroupAutocompleteProps) => {
  // Always initialize as an empty string so that text input never pre-populates with selected group name.
  const [inputValue, setInputValue] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions based on input value with debounce
  useEffect(() => {
    if (inputValue.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/groups?q=${encodeURIComponent(inputValue)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        }
      } catch (error) {
        console.error("Failed to fetch group suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimeout = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [inputValue]);

  // Handle group selection from suggestion list
  const handleSelect = (group: Group) => {
    onChange(group);
    setInputValue("");
    setSuggestions([]);
  };

  // Handle creation of a new group when the user selects the new option
  const handleCreateNew = async () => {
    try {
      const response = await fetch(`/api/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inputValue, websiteId }),
      });
      if (response.ok) {
        const newGroup: Group = await response.json();
        onChange(newGroup);
      }
    } catch (error) {
      console.error("Error creating new group:", error);
    }
    setSuggestions([]);
    setInputValue("");
  };

  // On blur, attempt to match or create a new group after a brief delay, then clear the input.
  const handleBlur = () => {
    setTimeout(async () => {
      if (inputValue.trim().length > 0) {
        const matched = suggestions.find(
          (g) => g.name.toLowerCase() === inputValue.toLowerCase()
        );
        if (matched) {
          handleSelect(matched);
        } else {
          try {
            const response = await fetch(`/api/groups`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: inputValue, websiteId }),
            });
            if (response.ok) {
              const newGroup: Group = await response.json();
              onChange(newGroup);
            }
          } catch (error) {
            console.error("Error creating new group:", error);
          }
        }
      }
      setSuggestions([]);
      setInputValue("");
    }, 150);
  };

  // Determine if the create new option should be shown: if the input is non-empty and no suggestion matches exactly.
  const createOption =
    inputValue.trim().length > 0 &&
    !suggestions.some(
      (g) => g.name.toLowerCase() === inputValue.trim().toLowerCase()
    );

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          id="group"
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(null);
          }}
          placeholder="Type to search or create a group..."
          autoComplete="off"
          className="w-full bg-[var(--bg-elevated)] border border-zinc-800 rounded-lg px-4 py-3 pr-10 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
          ref={inputRef}
          onBlur={handleBlur}
        />
        {inputValue && (
          <button
            onClick={() => setInputValue("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white transition-colors focus:outline-none"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {(suggestions.length > 0 || loading || createOption) && (
        <ul className="absolute bg-[var(--bg-elevated)] border border-zinc-800 text-sm z-10 w-full mt-2 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <li className="flex items-center justify-center p-3">
              <Loader2 className="animate-spin h-5 w-5 text-zinc-400" />
            </li>
          ) : (
            <>
              {suggestions.map((group) => (
                <li
                  key={group._id}
                  onMouseDown={() => handleSelect(group)}
                  className="px-4 py-2.5 hover:bg-[var(--bg-subtle)] cursor-pointer text-white transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  {group.name}
                </li>
              ))}
              {createOption && (
                <li
                  onMouseDown={handleCreateNew}
                  className="px-4 py-2.5 hover:bg-[var(--bg-subtle)] cursor-pointer text-blue-400 transition-colors border-t border-zinc-800 last:rounded-b-lg"
                >
                  Create "{inputValue}"
                </li>
              )}
            </>
          )}
        </ul>
      )}
      {value && (
        <div className="mt-3">
          <div className="inline-flex items-center gap-2 bg-[var(--bg-subtle)] border border-zinc-700 rounded-lg px-3 py-2">
            <span className="text-sm text-white">{value.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                setInputValue("");
              }}
              className="text-zinc-400 hover:text-white transition-colors focus:outline-none"
              aria-label="Clear selected group"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupAutocomplete;
