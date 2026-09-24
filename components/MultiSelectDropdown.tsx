"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, X, Loader2, Search } from "lucide-react";
import { MultiSelectDropdownProps } from "@/types";

interface GenericItem {
  [key: string]: string | number | boolean | undefined;
}

export default function MultiSelectDropdown({
  apiEndpoint,
  placeholder,
  selectedPlaceholder,
  labelKey = "name",
  idKey = "id",
  selectedItems,
  setSelectedItems,
  onItemsLoaded,
}: MultiSelectDropdownProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<GenericItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuWidth, setMenuWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const itemsData = data.success ? data.data : data;
        const nextItems = Array.isArray(itemsData) ? itemsData : [];
        setItems(nextItems);
        if (onItemsLoaded) {
          onItemsLoaded(nextItems);
        }
      } catch (error) {
        console.error(`Error fetching items from ${apiEndpoint}:`, error);
        setError(`Failed to fetch items.`);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
    // Intentionally only re-fetch when endpoint changes; parent callbacks may be unstable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiEndpoint]);

  const handleSelect = (item: GenericItem) => {
    const itemId = String(item[idKey]);
    setSelectedItems((prev: string[]) => {
      if (prev.includes(itemId)) {
        return prev.filter((i) => i !== itemId);
      }
      return [...prev, itemId];
    });
  };

  const filteredItems = items.filter((item) =>
    String(item[labelKey]).toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const displayValue =
    selectedItems.length > 0
      ? `${selectedItems.length} ${selectedPlaceholder} selected`
      : placeholder;

  const handleClearSearch = () => {
    setSearchTerm("");
    inputRef.current?.focus();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchTerm("");
    } else if (triggerRef.current) {
      setMenuWidth(triggerRef.current.offsetWidth);
    }
  };

  useEffect(() => {
    if (open && inputRef.current) {
      // Defer focus so Radix finishes opening the menu
      const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
              className="w-full max-w-full justify-between border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
        >
          <span className="truncate text-left">{displayValue}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="p-0 max-h-[min(22rem,50vh)] overflow-hidden bg-[var(--bg-elevated)] border-[var(--border-color)]"
        style={{ width: menuWidth ? `${menuWidth}px` : undefined, minWidth: "16rem" }}
      >
        <div className="sticky top-0 z-10 border-b border-[var(--border-color)] bg-[var(--bg-elevated)] p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              name={`filter-${selectedPlaceholder.replace(/\W+/g, "-")}`}
              placeholder="Search…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              data-bwignore="true"
              data-form-type="other"
              role="searchbox"
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-deepest)] py-2 pl-9 pr-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              ref={inputRef}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 flex items-center justify-center px-2.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus:outline-none cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="max-h-[min(16rem,40vh)] overflow-y-auto p-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center px-4 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const itemId = String(item[idKey]);
              const isChecked = selectedItems.includes(itemId);
              return (
                <DropdownMenuCheckboxItem
                  key={itemId}
                  checked={isChecked}
                  onCheckedChange={() => handleSelect(item)}
                  onSelect={(event) => event.preventDefault()}
                  className="cursor-pointer rounded-md py-2 pl-7 pr-2 hover:bg-[var(--bg-subtle)] focus:bg-[var(--bg-subtle)]"
                  aria-label={String(item[labelKey])}
                >
                  <span className="truncate">{String(item[labelKey])}</span>
                </DropdownMenuCheckboxItem>
              );
            })
          ) : (
            <div className="px-3 py-6 text-center text-sm text-[var(--text-secondary)]">
              {searchTerm
                ? `No matches for “${searchTerm}”`
                : `No ${selectedPlaceholder} found`}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
