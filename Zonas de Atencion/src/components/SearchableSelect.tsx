import { useState, useRef, useEffect } from 'react';
import { Person } from '../types';
import { Search, X } from 'lucide-react';

interface Props {
  options: Person[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  key?: string | number;
}

export function SearchableSelect({ options, selectedId, onSelect, placeholder = "-- Seleccionar --", disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [canSearch, setCanSearch] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPerson = options.find(p => p.id === selectedId);

  useEffect(() => {
    if (!isOpen) {
      setCanSearch(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.grade.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // Primary sort: Unassigned first, then Assigned
    if (a.assigned !== b.assigned) {
      return a.assigned ? 1 : -1;
    }
    // Secondary sort: Name
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className={`flex items-center justify-between border rounded-lg px-3 py-1.5 bg-white cursor-pointer transition-all ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`text-sm truncate ${!selectedPerson ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>
          {selectedPerson ? `${selectedPerson.grade.toUpperCase()} ${selectedPerson.name}` : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedPerson && !disabled && (
            <button 
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                onSelect('');
              }}
            >
              <X size={14} />
            </button>
          )}
          <Search size={14} className="text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          <div className="p-2 border-bottom sticky top-0 bg-white">
            <input
              type="text"
              readOnly={!canSearch}
              className={`w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${!canSearch ? 'cursor-pointer' : 'cursor-text'}`}
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => { 
                e.stopPropagation(); 
                setCanSearch(true); 
              }}
              onBlur={() => setCanSearch(false)}
            />
          </div>
          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((person) => (
                <div
                  key={person.id}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors flex items-center justify-between ${
                    person.id === selectedId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                  onClick={() => {
                    onSelect(person.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="font-bold text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 shrink-0">{person.grade.toUpperCase()}</span>
                      <span className="truncate">{person.name}</span>
                    </div>
                    {person.assigned && person.id !== selectedId && (
                      <span className="text-[10px] text-amber-600 font-semibold truncate mt-0.5 ml-0.5">
                        {person.assignmentLocation}
                      </span>
                    )}
                  </div>
                  {person.assigned && person.id !== selectedId && (
                    <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded shrink-0 ml-2">OCUPADO</span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-center text-gray-500">
                No hay resultados disponibles
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
