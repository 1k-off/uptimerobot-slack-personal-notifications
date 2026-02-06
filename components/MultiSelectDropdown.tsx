"use client"

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, X, Loader2 } from "lucide-react";
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
}: MultiSelectDropdownProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<GenericItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        setItems(Array.isArray(itemsData) ? itemsData : []);
      } catch (error) {
        console.error(`Error fetching items from ${apiEndpoint}:`, error);
        setError(`Failed to fetch items.`);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
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
    String(item[labelKey]).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayValue =
    selectedItems.length > 0
      ? `${selectedItems.length} ${selectedPlaceholder} selected`
      : placeholder;

  const handleClearSearch = () => {
    setSearchTerm("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[400px] justify-between">
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-4 max-h-[33vh] min-h-[200px] overflow-y-auto">
        <div className="relative">
          <input
            type="text"
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={(e) => e.stopPropagation()}
            className="mb-2 w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none pr-8"
            ref={inputRef}
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{placeholder}</DropdownMenuLabel>

        {loading ? (
          <div className="flex items-center justify-center px-4 py-2">
            <Loader2 className="animate-spin h-5 w-5 text-gray-500" />
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
                className="flex items-center justify-between px-2 py-1 hover:bg-gray-200 rounded"
                aria-label={String(item[labelKey])}
              >
                <span>{String(item[labelKey])}</span>
                {isChecked && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuCheckboxItem>
            );
          })
        ) : (
          <div className="px-4 py-2 text-gray-500">
            No {placeholder.toLowerCase()} found.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
