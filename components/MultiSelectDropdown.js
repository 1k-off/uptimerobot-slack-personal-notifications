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

const MultiSelectDropdown = () => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/slackUsers');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched users:', data); // Inspect the data
        setUsers(Array.isArray(data) ? data : []); // Ensure data is an array
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to fetch users.');
        setUsers([]);
      }
    };

    fetchUsers();
  }, []);

  const handleSelect = (user) => {
    setSelectedUsers((prev) =>
      prev.includes(user)
        ? prev.filter((u) => u !== user)
        : [...prev, user]
    );
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayValue =
    selectedUsers.length > 0
      ? `${selectedUsers.length} user(s) selected`
      : 'Select users...';

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
            placeholder="Search users..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <CommandList className="max-h-[400px] overflow-y-auto">
            <CommandEmpty>No users found.</CommandEmpty>
            {filteredUsers.map((user) => {
              const isSelected = selectedUsers.includes(user.name);
              return (
                <CommandItem
                  key={user.id}
                  onSelect={() => handleSelect(user.name)}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-700 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-gray-100"
                >
                  <span>{user.name}</span>
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

export default MultiSelectDropdown;