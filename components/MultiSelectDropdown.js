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

export default function MultiSelectDropdown({
  apiEndpoint,
  placeholder,
  selectedPlaceholder,
  labelKey = "name",
  idKey = "id",
}) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
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

  const handleSelect = (item) => {
    const itemLabel = item[labelKey];
    setSelectedItems((prev) =>
      prev.includes(itemLabel)
        ? prev.filter((i) => i !== itemLabel)
        : [...prev, itemLabel]
    );
  };

  const filteredItems = items.filter((item) =>
    item[labelKey].toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSearchChange = (e) => {
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
        <Button variant="outline" className="min-w-[200px] justify-between">
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-4 max-h-[33vh] min-h-[200px] overflow-y-auto">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={(e) => e.stopPropagation()} // Stop event propagation
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

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center px-4 py-2">
            <Loader2 className="animate-spin h-5 w-5 text-gray-500" />
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isChecked = selectedItems.includes(item[labelKey]);
            return (
              <DropdownMenuCheckboxItem
                key={item[idKey]}
                checked={isChecked}
                onCheckedChange={() => handleSelect(item)}
                className="flex items-center justify-between px-2 py-1 hover:bg-gray-200 rounded"
                aria-label={item[labelKey]}
              >
                <span>{item[labelKey]}</span>
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