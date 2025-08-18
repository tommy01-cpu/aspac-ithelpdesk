import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, User, X } from 'lucide-react';

interface User {
  id: number;
  emp_fname: string;
  emp_lname: string;
  emp_code?: string;
  emp_email?: string;
  department?: string;
}

interface EditableNameSelectProps {
  value: string;
  onChange: (value: string) => void;
  users: User[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export const EditableNameSelect: React.FC<EditableNameSelectProps> = ({
  value,
  onChange,
  users,
  disabled = false,
  required = false,
  placeholder = "Enter name or search users"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm.length < 2) {
      setFilteredUsers([]);
      return;
    }

    const filtered = users.filter(user => {
      const fullName = `${user.emp_fname} ${user.emp_lname}`.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      return (
        fullName.includes(searchLower) ||
        user.emp_code?.toLowerCase().includes(searchLower) ||
        user.emp_email?.toLowerCase().includes(searchLower)
      );
    }).slice(0, 10); // Limit to 10 results

    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(newValue.length >= 2);
  };

  const handleUserSelect = (user: User) => {
    const fullName = `${user.emp_fname} ${user.emp_lname}`;
    setSearchTerm(fullName);
    onChange(fullName);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (searchTerm.length >= 2) {
      setIsOpen(true);
    }
  };

  const clearValue = () => {
    setSearchTerm('');
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full bg-white/70 border-slate-200 focus:border-slate-400 pr-16 ${
            disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''
          }`}
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {searchTerm && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearValue}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && filteredUsers.length > 0 && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
              onClick={() => handleUserSelect(user)}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {user.emp_fname} {user.emp_lname}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.emp_code && `${user.emp_code} • `}
                    {user.emp_email && `${user.emp_email} • `}
                    {user.department || 'No Department'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && searchTerm.length >= 2 && filteredUsers.length === 0 && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
          <div className="text-sm text-gray-500 text-center">
            No users found matching "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
};
