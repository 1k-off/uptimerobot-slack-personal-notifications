import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const MultiSelectChannelDropdown = () => {
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch('/api/slackChannels');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched channels:', data); // Inspect the data
        setChannels(Array.isArray(data) ? data : []); // Ensure data is an array
      } catch (error) {
        console.error('Error fetching channels:', error);
        setError('Failed to fetch channels.');
        setChannels([]);
      }
    };

    fetchChannels();
  }, []);

  const handleSelect = (channel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayValue =
    selectedChannels.length > 0
      ? `${selectedChannels.length} channel(s) selected`
      : 'Select channels...';

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-[200px] justify-between"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
        <Command>
          <CommandInput
            placeholder="Search channels..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <CommandList className="max-h-[400px] overflow-y-auto">
            <CommandEmpty>No channels found.</CommandEmpty>
            {filteredChannels.map((channel) => {
              const isSelected = selectedChannels.includes(channel.name);
              return (
                <CommandItem
                  key={channel.id}
                  onSelect={() => handleSelect(channel.name)}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-700 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-gray-100"
                >
                  <span>{channel.name}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary dark:text-primary-light" />
                  )}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MultiSelectChannelDropdown;