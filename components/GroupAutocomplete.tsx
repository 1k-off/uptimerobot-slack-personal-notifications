"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="relative inline-block min-w-[400px]">
      <Label htmlFor="group" className="mt-2">
        Group
      </Label>
      <div className="relative mt-1">
        <Input
          id="group"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(null);
          }}
          placeholder="Type to search or create a group..."
          autoComplete="off"
          className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none pr-8"
          ref={inputRef}
          onBlur={handleBlur}
        />
        {inputValue && (
          <button
            onClick={() => setInputValue("")}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {(suggestions.length > 0 || loading || createOption) && (
        <ul className="absolute bg-popover text-sm z-10 w-full mt-1 rounded-md shadow-md max-h-60 overflow-y-auto outline-none transition-colors">
          {loading ? (
            <li className="flex items-center justify-center p-2">
              <Loader2 className="animate-spin h-5 w-5 text-gray-500" />
            </li>
          ) : (
            <>
              {suggestions.map((group) => (
                <li
                  key={group._id}
                  onMouseDown={() => handleSelect(group)}
                  className="p-2 hover:bg-accent cursor-pointer"
                >
                  {group.name}
                </li>
              ))}
              {createOption && (
                <li
                  onMouseDown={handleCreateNew}
                  className="p-2 hover:bg-accent cursor-pointer"
                >
                  {inputValue} (new)
                </li>
              )}
            </>
          )}
        </ul>
      )}
      {value && (
        <div className="mt-2">
          <Card className="w-3/4 py-0">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{value.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                    setInputValue("");
                  }}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label="Clear selected group"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GroupAutocomplete;
