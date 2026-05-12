import { AppConfig, Person } from './types';

export const generateId = () => Math.random().toString(36).substring(2, 11);

export const DEFAULT_CAI_SECTIONS: string[] = [
  "CAI - MODELO",
  "CAI - ALCAZARES",
  "CAI - POLO CLUB",
  "CAI - RIONEGRO",
  "CAI - 7 DE AGOSTO"
];

export const OTHER_GROUPS_DEFAULTS: string[] = [
  "Zona T",
  "Jefe de información E-12 y Centinelas",
  "Custodios E-12",
  "Vacaciones",
  "Excusado",
  "Calamidad"
];

export const createDefaultConfig = (): AppConfig => ({
  caiSections: [
    {
      id: generateId(),
      name: "CAI - MODELO",
      teams: [
        { id: generateId(), name: "11-13", members: ['', ''] },
        { id: generateId(), name: "12-14", members: ['', ''] },
        { id: generateId(), name: "15-16", members: ['', ''] }
      ]
    },
    {
      id: generateId(),
      name: "CAI - ALCAZARES",
      teams: [
        { id: generateId(), name: "1", members: ['', ''] },
        { id: generateId(), name: "2", members: ['', ''] }
      ]
    },
    {
      id: generateId(),
      name: "CAI - POLO CLUB",
      teams: [
        { id: generateId(), name: "6-7", members: ['', ''] },
        { id: generateId(), name: "8", members: ['', ''] }
      ]
    },
    {
      id: generateId(),
      name: "CAI - RIONEGRO",
      teams: [
        { id: generateId(), name: "9", members: ['', ''] },
        { id: generateId(), name: "10", members: ['', ''] }
      ]
    },
    {
      id: generateId(),
      name: "CAI - 7 DE AGOSTO",
      teams: [
        { id: generateId(), name: "3", members: ['', ''] },
        { id: generateId(), name: "4-5", members: ['', ''] }
      ]
    }
  ],
  otherGroups: [
    ...OTHER_GROUPS_DEFAULTS.map(name => ({
      id: generateId(),
      name,
      members: [],
      defaultName: name
    })),
    ...DEFAULT_CAI_SECTIONS.map(cai => ({
      id: generateId(),
      name: `${cai} (Jefe de Información)`,
      members: [],
      defaultName: `${cai} (Jefe de Información)`
    }))
  ]
});
