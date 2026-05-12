import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Users, 
  Settings, 
  Download, 
  Upload, 
  Search, 
  FileText, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  Copy,
  Check,
  CheckCircle2,
  UserPlus,
  X
} from 'lucide-react';
import { FullState, AppConfig, Person, CaiSection, Team, OtherGroup } from './types';
import { createDefaultConfig, generateId } from './constants';
import { 
  getPersonnelCategory, 
  toTitleCaseSmart, 
  getGreeting, 
  getTurno 
} from './utils';
import { SearchableSelect } from './components/SearchableSelect';

import { ConfirmationModal } from './components/ConfirmationModal';

export default function App() {
  const migrateState = (parsed: any): FullState => {
    // Migration: Old "personnel" to "allPersonnelLists"
    if (parsed.personnel && !parsed.allPersonnelLists) {
      parsed.allPersonnelLists = {
        list1: parsed.personnel,
        list2: [],
        list3: []
      };
      delete parsed.personnel;
    }

    // Migration: Ensure allPersonnelLists exists
    if (!parsed.allPersonnelLists) {
      parsed.allPersonnelLists = { list1: [], list2: [], list3: [] };
    }

    // Migration: If globalConfig doesn't exist, create it
    if (!parsed.globalConfig) {
      const firstConfig = Object.values(parsed.configurations || {})[0] as any;
      parsed.globalConfig = {
        commanderName: firstConfig?.commanderName || "",
        commanderRank: firstConfig?.commanderRank || "",
        vigilanceHeadName: "",
        vigilanceHeadRank: "",
        importantServices: Array.isArray(firstConfig?.importantServices) ? firstConfig.importantServices : []
      };
    }

    // Migration: Ensure new fields exist in globalConfig
    if (parsed.globalConfig && parsed.globalConfig.vigilanceHeadName === undefined) {
      parsed.globalConfig.vigilanceHeadName = "";
      parsed.globalConfig.vigilanceHeadRank = "";
    }

    // Migration: Ensure configurations exist
    if (!parsed.configurations) {
      parsed.configurations = {
        list1: createDefaultConfig(),
        list2: createDefaultConfig(),
        list3: createDefaultConfig()
      };
    }

    // Migration: Ensure currentListId exists
    if (!parsed.currentListId) {
      parsed.currentListId = 'list1';
    }

    // Migration: Rename "(Información)" to "(Jefe de Información)"
    if (parsed.configurations) {
      Object.keys(parsed.configurations).forEach(key => {
        const config = parsed.configurations[key];
        if (config.otherGroups) {
          config.otherGroups = config.otherGroups.map((g: any) => {
            if (g.name.endsWith(" (Información)")) {
              const newName = g.name.replace(" (Información)", " (Jefe de Información)");
              return { 
                ...g, 
                name: newName,
                defaultName: g.defaultName ? g.defaultName.replace(" (Información)", " (Jefe de Información)") : undefined
              };
            }
            return g;
          });
        }
      });
    }

    return parsed as FullState;
  };

  const [fullState, setFullState] = useState<FullState>(() => {
    const saved = localStorage.getItem('policeReportFullState');
    if (saved) {
      try {
        return migrateState(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved state", e);
      }
    }
    return {
      allPersonnelLists: { list1: [], list2: [], list3: [] },
      configurations: {
        list1: createDefaultConfig(),
        list2: createDefaultConfig(),
        list3: createDefaultConfig()
      },
      currentListId: 'list1',
      globalConfig: {
        commanderName: "",
        commanderRank: "",
        vigilanceHeadName: "",
        vigilanceHeadRank: "",
        importantServices: []
      }
    };
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('');
  const [canSearchPersonnel, setCanSearchPersonnel] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const currentConfig = fullState.configurations[fullState.currentListId];
  const currentPersonnel = fullState.allPersonnelLists[fullState.currentListId] || [];

  const searchableSections = useMemo(() => {
    const sections: { id: string; name: string; type: 'cai' | 'group'; originalId: string }[] = [];
    
    currentConfig.caiSections.forEach(cai => {
      sections.push({ id: `cai-${cai.id}`, name: cai.name, type: 'cai', originalId: cai.id });
    });
    
    currentConfig.otherGroups
      .filter(g => !g.name.includes("(Jefe de Información)") && g.name !== "Jefe de Vigilancia")
      .forEach(group => {
        sections.push({ id: `group-${group.id}`, name: group.name, type: 'group', originalId: group.id });
      });
      
    return sections;
  }, [currentConfig]);

  const navigateToSection = (sectionId: string, originalId: string, type: 'cai' | 'group') => {
    // If it's a CAI, ensure it's expanded
    if (type === 'cai') {
      setCollapsedSections(prev => ({ ...prev, [originalId]: false }));
    }
    
    setIsSearchModalOpen(false);
    // Removed clearing of personnelSearchTerm to keep it persistent
    
    // Smooth scroll to the element
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        const yOffset = -120; // Account for any fixed headers
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
        
        // Highlight the element briefly using Tailwind classes
        element.classList.add('ring-4', 'ring-blue-500', 'ring-offset-4', 'z-10');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-4', 'z-10');
        }, 2500);
      }
    }, 300);
  };

  // Sync assignment status
  const personnelWithAssignedStatus = useMemo(() => {
    const assignments = new Map<string, { location: string; sectionId: string; type: 'cai' | 'group'; originalId: string }>();
    currentConfig.caiSections.forEach(cai => 
      cai.teams.forEach(team => 
        team.members.forEach(id => {
          if (id) assignments.set(id, { location: `${cai.name} / ${team.name}`, sectionId: `cai-${cai.id}`, type: 'cai', originalId: cai.id });
        })
      )
    );
    currentConfig.otherGroups.forEach(group => 
      group.members.forEach(id => {
        if (id) assignments.set(id, { location: group.name, sectionId: `group-${group.id}`, type: 'group', originalId: group.id });
      })
    );

    return currentPersonnel.map(p => {
      const assignment = assignments.get(p.id);
      return {
        ...p,
        assigned: !!assignment,
        assignmentLocation: assignment?.location,
        assignmentSectionId: assignment?.sectionId,
        assignmentSectionType: assignment?.type,
        assignmentOriginalId: assignment?.originalId
      };
    });
  }, [currentPersonnel, currentConfig]);

  useEffect(() => {
    if (!isSearchModalOpen) {
      setCanSearchPersonnel(false);
    }
  }, [isSearchModalOpen]);

  useEffect(() => {
    localStorage.setItem('policeReportFullState', JSON.stringify(fullState));
  }, [fullState]);

  const updateConfig = (updater: (prev: AppConfig) => AppConfig) => {
    setFullState(prev => ({
      ...prev,
      configurations: {
        ...prev.configurations,
        [prev.currentListId]: updater(prev.configurations[prev.currentListId])
      }
    }));
  };

  const updateGlobalConfig = (updater: (prev: FullState['globalConfig']) => FullState['globalConfig']) => {
    setFullState(prev => ({
      ...prev,
      globalConfig: updater(prev.globalConfig)
    }));
  };

  const assignPersonnelToSlot = (personId: string, assignAction: (config: AppConfig) => AppConfig) => {
    setFullState(prev => {
      let config = prev.configurations[prev.currentListId];
      
      // If personId is provided (not unassigning), remove them from any other slot first
      if (personId) {
        config = {
          ...config,
          caiSections: config.caiSections.map(c => ({
            ...c,
            teams: c.teams.map(t => ({
              ...t,
              members: t.members.map(m => m === personId ? '' : m)
            }))
          })),
          otherGroups: config.otherGroups.map(g => ({
            ...g,
            members: g.members.map(m => m === personId ? '' : m)
          }))
        };
      }

      // Perform the specific assignment
      const updatedConfig = assignAction(config);

      return {
        ...prev,
        configurations: {
          ...prev.configurations,
          [prev.currentListId]: updatedConfig
        }
      };
    });
  };

  const updatePersonnel = (newPersonnel: Person[]) => {
    setFullState(prev => ({
      ...prev,
      allPersonnelLists: {
        ...prev.allPersonnelLists,
        [prev.currentListId]: newPersonnel
      }
    }));
  };

  const handlePersonnelTextChange = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const currentList = fullState.allPersonnelLists[fullState.currentListId];
    const existingMap = new Map(currentList.map(p => [`${p.grade.toUpperCase()} ${p.name.toUpperCase()}`, p]));
    
    const newList: Person[] = lines.map(line => {
      const parts = line.split(' ');
      if (parts.length < 2) return null;
      const grade = parts[0];
      const name = parts.slice(1).join(' ');
      const key = `${grade.toUpperCase()} ${name.toUpperCase()}`;
      
      if (existingMap.has(key)) {
        const p = existingMap.get(key)!;
        return { 
          ...(p as any), 
          grade, 
          name, 
          category: getPersonnelCategory(grade) 
        } as Person;
      }
      return { id: generateId(), grade, name, category: getPersonnelCategory(grade), assigned: false };
    }).filter((p): p is Person => p !== null);

    updatePersonnel(newList);
  };

  const generateReportText = () => {
    const greeting = getGreeting();
    const turno = getTurno();
    const { 
      commanderRank, 
      commanderName, 
      vigilanceHeadRank, 
      vigilanceHeadName, 
      importantServices 
    } = fullState.globalConfig;
    
    let oficiales = 0, suboficiales = 0, patrulleros = 0;
    const countedIds = new Set<string>();

    const countMember = (id: string) => {
      if (!id || countedIds.has(id)) return;
      const p = currentPersonnel.find(pers => pers.id === id);
      if (p) {
        if (p.category === 'Oficiales') oficiales++;
        else if (p.category === 'Suboficiales') suboficiales++;
        else if (p.category === 'Patrulleros') patrulleros++;
        countedIds.add(id);
      }
    };

    // Count Vigilance Head if assigned
    if (vigilanceHeadRank && vigilanceHeadName) {
      const cat = getPersonnelCategory(vigilanceHeadRank);
      if (cat === 'Oficiales') oficiales++;
      else if (cat === 'Suboficiales') suboficiales++;
      else if (cat === 'Patrulleros') patrulleros++;
    }

    // Correct counting logic as per original app
    currentConfig.caiSections.forEach(c => c.teams.forEach(t => t.members.forEach(countMember)));
    currentConfig.otherGroups.forEach(g => {
      const countable = ["Jefe de información E-12 y Centinelas", "Zona T"].includes(g.name) || g.name.includes("(Jefe de Información)");
      if (countable) g.members.forEach(countMember);
    });

    let report = `Dios y Patria mi Coronel ${greeting}, respetuosamente me permito reportar el personal para el ${turno}, así:\n\n`;
    report += `*Parte =(${oficiales}-${suboficiales}-${patrulleros})*\n\n`;

    let totalZones = currentConfig.caiSections.reduce((acc, c) => acc + c.teams.filter(t => t.members[0] && t.members[1]).length, 0);
    report += `Total: *(${totalZones})* Zonas de Atención asignados al Nuevo Modelo de Servicio de Policía en la Estación Barrios Unidos, así:\n\n`;

    currentConfig.caiSections.forEach(cai => {
      report += `*${toTitleCaseSmart(cai.name)}*\n`;
      cai.teams.forEach(team => {
        const members = team.members.map(id => {
          const p = currentPersonnel.find(pers => pers.id === id);
          return p ? `${p.grade.toUpperCase()} ${toTitleCaseSmart(p.name)}` : 'No asignado';
        }).join(' / ');
        report += `🚔 ${team.name} ${members}\n`;
      });
      report += '\n';
    });

    const renderGroup = (name: string, title?: string) => {
      const g = currentConfig.otherGroups.find(group => group.name === name);
      if (!g || g.members.length === 0) return '';
      let text = `*${toTitleCaseSmart(title || name)}*\n`;
      g.members.forEach(id => {
        const p = currentPersonnel.find(pers => pers.id === id);
        if (p) text += `${p.grade.toUpperCase()} ${toTitleCaseSmart(p.name)}\n`;
      });
      return text + '\n';
    };

    report += renderGroup("Zona T");
    
    if (vigilanceHeadRank && vigilanceHeadName) {
      report += `*Jefe de Vigilancia*\n${vigilanceHeadRank.toUpperCase()} ${toTitleCaseSmart(vigilanceHeadName)}\n\n`;
    }

    if (importantServices.length > 0) {
      report += `*Servicios de Importancia*\n\n`;
      importantServices.forEach(s => { report += `📍${toTitleCaseSmart(s)}\n`; });
      report += '\n';
    }

    report += renderGroup("Jefe de información E-12 y Centinelas");

    const custodios = currentConfig.otherGroups.find(g => g.name === "Custodios E-12");
    if (custodios && custodios.members.some(id => id)) {
      let cO = 0, cS = 0, cP = 0;
      custodios.members.forEach(id => {
        const p = currentPersonnel.find(pers => pers.id === id);
        if (p) {
          if (p.category === 'Oficiales') cO++;
          else if (p.category === 'Suboficiales') cS++;
          else if (p.category === 'Patrulleros') cP++;
        }
      });
      report += `*Custodios E-12*\n\nParte: (${cO}-${cS}-${cP})\n\n`;
      custodios.members.forEach(id => {
        const p = currentPersonnel.find(pers => pers.id === id);
        if (p) report += `${p.grade.toUpperCase()}. ${toTitleCaseSmart(p.name)}\n`;
      });
      report += '\n';
    }

    const infoGroups = currentConfig.otherGroups.filter(g => g.name.includes("(Jefe de Información)") && g.members.some(id => id));
    if (infoGroups.length > 0) {
      report += `*Jefe de Información del CAI*\n\n`;
      infoGroups.forEach(g => {
        g.members.forEach(id => {
          const p = currentPersonnel.find(pers => pers.id === id);
          if (p) report += `*${toTitleCaseSmart(g.name.replace(' (Jefe de Información)', ''))}*\n👮🏻‍♂️ ${p.grade.toUpperCase()}. ${toTitleCaseSmart(p.name)}\n\n`;
        });
      });
    }

    const novedades = ["Vacaciones", "Excusado", "Calamidad"];
    const novGroups = currentConfig.otherGroups.filter(g => (novedades.includes(g.name) || !g.defaultName) && !g.name.includes("(Jefe de Información)") && g.members.some(id => id));
    if (novGroups.length > 0) {
      report += `*📌NOVEDADES*\n\n`;
      novGroups.forEach(g => {
        report += `*${toTitleCaseSmart(g.name)}*\n\n`;
        g.members.forEach(id => {
          const p = currentPersonnel.find(pers => pers.id === id);
          if (p) report += `${p.grade.toUpperCase()} ${toTitleCaseSmart(p.name)}\n`;
        });
        report += '\n';
      });
    }

    report += `${toTitleCaseSmart(commanderRank)} ${toTitleCaseSmart(commanderName)}\n*Comandante Estación de Policía Barrios Unidos*\n`;
    return report;
  };

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");

  const handleAddZone = () => {
    if (newZoneName.trim()) {
      const trimmedName = newZoneName.trim();
      const newCaiId = generateId();
      const newInfoGroupId = generateId();
      
      updateConfig(prev => {
        const newCai = { 
          id: newCaiId, 
          name: trimmedName, 
          teams: [{ id: generateId(), name: '1', members: ['', ''] }] 
        };
        const newInfoGroup = { 
          id: newInfoGroupId, 
          name: `${trimmedName} (Jefe de Información)`, 
          members: [] 
        };
        
        return {
          ...prev,
          caiSections: [...prev.caiSections, newCai],
          otherGroups: [...prev.otherGroups, newInfoGroup]
        };
      });
      setNewZoneName("");
      setShowAddZoneModal(false);
    }
  };

  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      const trimmedName = newGroupName.trim();
      updateConfig(prev => ({
        ...prev,
        otherGroups: [...prev.otherGroups, { id: generateId(), name: trimmedName, members: [] }]
      }));
      setNewGroupName("");
      setShowAddGroupModal(false);
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(fullState, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-estacion-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loaded = JSON.parse(event.target?.result as string);
        setFullState(migrateState(loaded));
      } catch (e) {
        alert("Archivo inválido");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-3 py-2 sm:px-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-md shadow-blue-100">
              <Shield size={18} />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-sm tracking-tight text-slate-800">Barrios Unidos</h1>
              <p className="text-[8px] uppercase tracking-wider font-bold text-slate-400">Generador de Informes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
              {['list1', 'list2', 'list3'].map(id => (
                <button 
                  key={id}
                  onClick={() => setFullState(prev => ({ ...prev, currentListId: id }))}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                    fullState.currentListId === id 
                      ? 'bg-white text-blue-600 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {id === 'list1' ? 'Lista 1' : id === 'list2' ? 'Lista 2' : 'Lista 3'}
                </button>
              ))}
            </div>
            <div className="bg-blue-50 px-3 py-1 rounded-md">
              <span className="text-[10px] font-bold text-blue-600 uppercase">{getTurno()}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-3 sm:p-4 space-y-4">

        {/* Main Sections Accordion */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                <Users size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-900 leading-none">Centros de Atención Inmediata</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">{currentConfig.caiSections.length} CAI ACTIVOS</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {currentConfig.caiSections.map((cai, idx) => (
              <motion.div 
                key={cai.id}
                id={`cai-${cai.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="px-3 sm:px-6 py-4 sm:py-5 flex items-center justify-between group transition-all duration-300 gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 overflow-hidden">
                    <div className={`w-1 sm:w-1.5 shrink-0 transition-all duration-500 rounded-full ${
                      collapsedSections[cai.id] 
                        ? 'h-2 bg-slate-200' 
                        : 'h-8 bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                    }`} />
                    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                      <input 
                        type="text" 
                        className={`w-full font-black bg-transparent border-none focus:ring-2 focus:ring-blue-100 focus:bg-white rounded-lg px-1.5 -ml-1 transition-all text-base sm:text-lg md:text-xl tracking-tight leading-none ${
                          collapsedSections[cai.id] ? 'text-slate-400' : 'text-slate-900'
                        }`}
                        value={cai.name}
                        onChange={e => {
                          const newName = e.target.value;
                          const oldName = cai.name;
                          updateConfig(prev => ({
                            ...prev,
                            caiSections: prev.caiSections.map(c => c.id === cai.id ? { ...c, name: newName } : c),
                            otherGroups: prev.otherGroups.map(g => 
                              g.name === `${oldName} (Jefe de Información)` 
                                ? { ...g, name: `${newName} (Jefe de Información)`, defaultName: `${newName} (Jefe de Información)` } 
                                : g
                            )
                          }));
                        }}
                      />
                      <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] px-0.5 mt-1 sm:mt-2 transition-all duration-300 truncate ${
                        collapsedSections[cai.id] ? 'opacity-30' : 'opacity-60 text-blue-600'
                      }`}>
                        {cai.teams.length} ZONAS DE ATENCIÓN
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Eliminar CAI",
                          message: `¿Estás seguro de que deseas eliminar el "${cai.name}"? Esta acción no se puede deshacer.`,
                          onConfirm: () => {
                            const groupToRemove = `${cai.name} (Jefe de Información)`;
                            updateConfig(prev => ({
                              ...prev,
                              caiSections: prev.caiSections.filter(c => c.id !== cai.id),
                              otherGroups: prev.otherGroups.filter(g => g.name !== groupToRemove)
                            }));
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          }
                        });
                      }}
                      className="p-1.5 sm:p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl sm:rounded-2xl transition-all sm:opacity-0 group-hover:opacity-100"
                      title="Eliminar CAI"
                    >
                      <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    
                    <button 
                      onClick={() => toggleSection(cai.id)}
                      className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-500 border ${
                        collapsedSections[cai.id] 
                          ? 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:shadow-lg hover:-translate-y-0.5' 
                          : 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-100 hover:bg-blue-700'
                      }`}
                      title={collapsedSections[cai.id] ? "Expandir sección" : "Contraer sección"}
                    >
                      <div className={`transition-transform duration-500 transform ${collapsedSections[cai.id] ? '' : 'rotate-180'}`}>
                        <ChevronDown size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={3} />
                      </div>
                    </button>
                  </div>
                </div>

                {!collapsedSections[cai.id] && (
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    className="border-t border-slate-50 p-6 space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cai.teams.map(team => (
                        <div key={team.id} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <input 
                              type="text"
                              value={team.name}
                              className="font-bold text-xs text-blue-600 bg-transparent uppercase tracking-wider p-0 border-none focus:ring-0"
                              onChange={e => {
                                const newName = e.target.value;
                                updateConfig(prev => ({
                                  ...prev,
                                  caiSections: prev.caiSections.map(c => c.id === cai.id ? {
                                    ...c,
                                    teams: c.teams.map(t => t.id === team.id ? { ...t, name: newName } : t)
                                  } : c)
                                }));
                              }}
                            />
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmModal({
                                  isOpen: true,
                                  title: "Eliminar Equipo",
                                  message: `¿Estás seguro de que deseas eliminar el equipo "${team.name}"?`,
                                  onConfirm: () => {
                                    updateConfig(prev => ({
                                      ...prev,
                                      caiSections: prev.caiSections.map(c => c.id === cai.id ? {
                                        ...c,
                                        teams: c.teams.filter(t => t.id !== team.id)
                                      } : c)
                                    }));
                                  }
                                });
                              }}
                              className="text-slate-300 hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {team.members.map((mid, midx) => (
                              <div key={midx} className="flex gap-1.5 items-center w-full">
                                <div className="flex-1 min-w-0">
                                  <SearchableSelect 
                                    options={personnelWithAssignedStatus}
                                    selectedId={mid}
                                    onSelect={id => {
                                      assignPersonnelToSlot(id, (config) => ({
                                        ...(config as any),
                                        caiSections: config.caiSections.map(c => c.id === cai.id ? {
                                          ...c,
                                          teams: c.teams.map(t => t.id === team.id ? { 
                                            ...t, 
                                            members: t.members.map((m, i) => i === midx ? id : m) 
                                          } : t)
                                        } : c)
                                      }));
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button 
                         onClick={() => {
                           updateConfig(prev => ({
                             ...prev,
                             caiSections: prev.caiSections.map(c => c.id === cai.id ? {
                               ...c,
                               teams: [...c.teams, { id: generateId(), name: 'Nuevo', members: ['', ''] }]
                             } : c)
                           }));
                         }}
                         className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all hover:bg-blue-50/30"
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    {/* Info Personnel for this CAI */}
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Jefe de Información del CAI</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentConfig.otherGroups.find(g => g.name === `${cai.name} (Jefe de Información)`)?.members.map((mid, midx) => (
                          <div key={midx} className="flex gap-1.5 items-center w-full">
                            <div className="flex-1 min-w-0">
                              <SearchableSelect 
                                options={personnelWithAssignedStatus}
                                selectedId={mid}
                                onSelect={id => {
                                  const groupName = `${cai.name} (Jefe de Información)`;
                                  assignPersonnelToSlot(id, (config) => ({
                                    ...(config as any),
                                    otherGroups: config.otherGroups.map(g => g.name === groupName ? {
                                      ...g,
                                      members: g.members.map((m, i) => i === midx ? id : m)
                                    } : g)
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* New "Add Zone" Button at the end */}
          <motion.button 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.002, backgroundColor: 'rgba(239, 246, 255, 0.8)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddZoneModal(true)}
            className="w-full py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-all group bg-white/50 backdrop-blur-sm mt-8"
          >
            <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100 group-hover:shadow-blue-200 group-hover:shadow-xl">
              <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
            </div>
            <div className="text-center">
              <span className="block font-black text-sm uppercase tracking-[0.25em] mb-1.5 group-hover:text-blue-700 transition-colors">Nuevo CAI</span>
              <span className="block text-[10px] font-bold opacity-50 uppercase tracking-widest">Añadir Centro de Atención Inmediata al Estado de Fuerza</span>
            </div>
          </motion.button>
        </div>

        {/* Add Zone Modal */}
        <AnimatePresence>
          {showAddZoneModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddZoneModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6">
                  <button 
                    onClick={() => setShowAddZoneModal(false)}
                    className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Plus size={32} strokeWidth={3} />
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nuevo CAI</h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">Introduce el nombre del Centro de Atención Inmediata</p>
                  </div>

                  <div className="w-full">
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Ej: CAI Sabana, CAI Bosa..." 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white focus:ring-0 transition-all font-bold text-slate-700 placeholder:text-slate-300"
                      value={newZoneName}
                      onChange={(e) => setNewZoneName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddZone();
                      }}
                    />
                  </div>

                  <div className="flex gap-3 w-full pt-2">
                    <button 
                      onClick={() => setShowAddZoneModal(false)}
                      className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleAddZone}
                      disabled={!newZoneName.trim()}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                    >
                      Crear CAI
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Group Modal */}
        <AnimatePresence>
          {showAddGroupModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddGroupModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6">
                  <button 
                    onClick={() => setShowAddGroupModal(false)}
                    className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Shield size={32} strokeWidth={3} />
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Grupo</h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">Introduce el nombre del grupo o servicio especial</p>
                  </div>

                  <div className="w-full">
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Ej: Apoyo Policía Judicial, Grupo GNUI..." 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white focus:ring-0 transition-all font-bold text-slate-700 placeholder:text-slate-300"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddGroup();
                      }}
                    />
                  </div>

                  <div className="flex gap-3 w-full pt-2">
                    <button 
                      onClick={() => setShowAddGroupModal(false)}
                      className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleAddGroup}
                      disabled={!newGroupName.trim()}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                    >
                      Crear Grupo
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Other Groups Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="bg-slate-100 p-2 rounded-xl text-slate-600">
              <Shield size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900 leading-none">Otros Grupos y Servicios</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">SERVICIOS DE APOYO Y ESPECIALES</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentConfig.otherGroups.filter(g => !g.name.includes("(Jefe de Información)") && g.name !== "Jefe de Vigilancia").map(group => (
              <div key={group.id} id={`group-${group.id}`} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-700">{group.name}</h4>
                  {group.name !== "Jefe de Vigilancia" && (
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Eliminar Grupo",
                          message: `¿Estás seguro de que deseas eliminar el grupo "${group.name}"?`,
                          onConfirm: () => {
                            updateConfig(prev => ({
                              ...prev,
                              otherGroups: prev.otherGroups.filter(g => g.id !== group.id)
                            }));
                          }
                        });
                      }}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {group.members.map((mid, midx) => (
                    <div key={midx} className="flex gap-1.5 items-center w-full">
                      <div className="flex-1 min-w-0">
                        <SearchableSelect 
                          options={personnelWithAssignedStatus}
                          selectedId={mid}
                          onSelect={id => {
                            assignPersonnelToSlot(id, (config) => ({
                              ...(config as any),
                              otherGroups: config.otherGroups.map(g => g.id === group.id ? {
                                ...g,
                                members: g.members.map((m, i) => i === midx ? id : m)
                              } : g)
                            }));
                          }}
                        />
                      </div>
                      {group.name !== "Jefe de Vigilancia" && (
                        <button 
                          onClick={() => {
                            const person = currentPersonnel.find(p => p.id === mid);
                            
                            const performDelete = () => {
                              updateConfig(prev => ({
                                ...prev,
                                otherGroups: prev.otherGroups.map(g => g.id === group.id ? {
                                  ...g,
                                  members: g.members.filter((_, i) => i !== midx)
                                } : g)
                              }));
                            };

                            if (!person) {
                              performDelete();
                              return;
                            }

                            const displayName = `${person.grade} ${person.name}`;
                            setConfirmModal({
                              isOpen: true,
                              title: "Eliminar Espacio",
                              message: `¿Deseas eliminar a ${displayName} del grupo ${group.name}?`,
                              onConfirm: performDelete
                            });
                          }}
                          className="shrink-0 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover espacio"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {group.name !== "Jefe de Vigilancia" && (
                    <button 
                      onClick={() => {
                        updateConfig(prev => ({
                          ...prev,
                          otherGroups: prev.otherGroups.map(g => g.id === group.id ? {
                            ...g,
                            members: [...g.members, '']
                          } : g)
                        }));
                      }}
                      className="w-full py-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 border border-slate-100 text-xs font-bold uppercase transition-all"
                    >
                      Agregar Integrante
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add Group Button in the grid */}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddGroupModal(true)}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-all hover:bg-blue-50/30 min-h-[160px]"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-100">
                <Plus size={24} />
              </div>
              <span className="font-bold text-sm">Nuevo Grupo / Servicio</span>
            </motion.button>
          </div>
        </section>
      </main>

      {/* Floating Action Buttons / Footer Nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-white/80 backdrop-blur-md border border-slate-200 p-2 rounded-2xl shadow-2xl z-40 gap-2">
         <button 
           onClick={() => setIsConfigModalOpen(true)}
           className="w-12 h-12 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
           title="Configuración"
         >
           <Settings size={22} />
         </button>
         <button 
           onClick={() => setIsSearchModalOpen(true)}
           className="w-12 h-12 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
           title="Buscar Personal"
         >
           <Search size={22} />
         </button>
         <button 
           onClick={() => setIsReportModalOpen(true)}
           className="bg-blue-600 w-14 h-14 flex items-center justify-center text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all"
           title="Generar Informe"
         >
           <FileText size={24} />
         </button>
         <button 
           onClick={handleExport}
           className="w-12 h-12 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
           title="Exportar Datos"
         >
           <Download size={22} />
         </button>
         <label className="w-12 h-12 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
           <Upload size={22} />
           <input type="file" className="hidden" accept=".json" onChange={handleImport} />
         </label>
      </div>

      {/* Modal: Configuración */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfigModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-xl text-slate-800">Configuración</h3>
                <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Comandante (Unificado)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="text" 
                      placeholder="Grado"
                      className="bg-slate-50 border-slate-200 rounded-xl p-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                      value={fullState.globalConfig.commanderRank}
                      onChange={e => updateGlobalConfig(prev => ({ ...prev, commanderRank: e.target.value }))}
                    />
                    <input 
                      type="text" 
                      placeholder="Nombre Completo"
                      className="col-span-2 bg-slate-50 border-slate-200 rounded-xl p-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                      value={fullState.globalConfig.commanderName}
                      onChange={e => updateGlobalConfig(prev => ({ ...prev, commanderName: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Jefe de Vigilancia (Unificado)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="text" 
                      placeholder="Grado"
                      className="bg-slate-50 border-slate-200 rounded-xl p-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                      value={fullState.globalConfig.vigilanceHeadRank}
                      onChange={e => updateGlobalConfig(prev => ({ ...prev, vigilanceHeadRank: e.target.value }))}
                    />
                    <input 
                      type="text" 
                      placeholder="Nombre Completo"
                      className="col-span-2 bg-slate-50 border-slate-200 rounded-xl p-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                      value={fullState.globalConfig.vigilanceHeadName}
                      onChange={e => updateGlobalConfig(prev => ({ ...prev, vigilanceHeadName: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Servicios de Importancia (Unificado)</label>
                  <textarea 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl p-4 text-sm min-h-[100px] focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Un servicio por línea..."
                    value={fullState.globalConfig.importantServices.join('\n')}
                    onChange={e => updateGlobalConfig(prev => ({ ...prev, importantServices: e.target.value.split('\n') }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Personal (Grado Nombre Apellido)</label>
                  <textarea 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl p-4 text-sm font-mono min-h-[200px] focus:ring-blue-500 focus:border-blue-500"
                    placeholder="PT JUAN PEREZ&#10;SI LUIS GOMEZ..."
                    defaultValue={currentPersonnel.map(p => `${p.grade} ${p.name}`).join('\n')}
                    onBlur={e => handlePersonnelTextChange(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-2 italic px-1">Presiona fuera del área para guardar los cambios en la lista.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Reporte */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReportModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 flex flex-col h-[90vh]">
              <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-t-3xl sticky top-0 z-20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{getTurno()}</span>
                  </div>
                  <h3 className="font-extrabold text-2xl md:text-3xl text-slate-900 tracking-tight leading-none">
                    Informe Final
                  </h3>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(generateReportText());
                      setCopyFeedback(true);
                      setTimeout(() => setCopyFeedback(false), 2000);
                    }}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all duration-300 shadow-lg active:scale-95 ${
                      copyFeedback 
                        ? 'bg-emerald-500 text-white shadow-emerald-200' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                    }`}
                  >
                    {copyFeedback ? <Check size={18} /> : <Copy size={18} />}
                    {copyFeedback ? '¡Copiado!' : 'Copiar Informe'}
                  </button>
                  <button 
                    onClick={() => setIsReportModalOpen(false)} 
                    className="group p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-100 shadow-sm"
                  >
                    <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-700 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  {generateReportText()}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Búsqueda de Personal */}
      <AnimatePresence>
        {isSearchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsSearchModalOpen(false)} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh] border border-slate-100"
            >
              <div className="p-8 border-b border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">Navegador de Secciones</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Users size={12} />
                        {personnelWithAssignedStatus.length} TOTAL
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} />
                        {personnelWithAssignedStatus.filter(p => p.assigned).length} ASIGNADOS
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsSearchModalOpen(false)} 
                    className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    readOnly={!canSearchPersonnel}
                    placeholder="Buscar CAI o grupo especial..."
                    className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-slate-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-semibold ${!canSearchPersonnel ? 'cursor-pointer' : 'cursor-text'}`}
                    value={personnelSearchTerm}
                    onChange={e => setPersonnelSearchTerm(e.target.value)}
                    onClick={() => setCanSearchPersonnel(true)}
                    onBlur={() => setCanSearchPersonnel(false)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
                {/* Secciones encontradas */}
                {personnelSearchTerm.trim().length > 0 ? searchableSections
                  .filter(s => s.name.toLowerCase().includes(personnelSearchTerm.toLowerCase()))
                  .map(section => (
                    <button
                      key={section.id}
                      onClick={() => navigateToSection(section.id, section.originalId, section.type)}
                      className="w-full p-4 rounded-3xl bg-blue-50 hover:bg-blue-100 flex items-center justify-between border border-blue-100 transition-all duration-300 group shadow-sm text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                          {section.type === 'cai' ? <Users size={20} /> : <Shield size={20} />}
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">
                            {section.type === 'cai' ? 'CAI' : 'GRUPO/SERVICIO'}
                          </div>
                          <div className="font-bold text-slate-900">{section.name}</div>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )) : (
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 italic">Navegador de Secciones</div>
                    {searchableSections.map(section => (
                      <button
                        key={section.id}
                        onClick={() => navigateToSection(section.id, section.originalId, section.type)}
                        className="w-full p-4 rounded-3xl bg-white hover:bg-slate-50 flex items-center justify-between border border-slate-50 hover:border-blue-100 transition-all duration-300 group shadow-sm text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center">
                            {section.type === 'cai' ? <Users size={18} /> : <Shield size={18} />}
                          </div>
                          <div>
                            <div className="text-[9px] font-black text-slate-400 group-hover:text-blue-600 uppercase tracking-widest transition-colors mb-0.5">
                              {section.type === 'cai' ? 'CAI' : 'GRUPO'}
                            </div>
                            <div className="font-bold text-slate-900">{section.name}</div>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
