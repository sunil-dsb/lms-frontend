import type {
  ActiveSeason,
  AdminEmployee,
  ApiError,
  Category,
  ClearanceLevel,
  CreateEmployeeInput,
  CreateLocationInput,
  CreateProcedureInput,
  CreateRoleInput,
  CreateStationInput,
  Employee,
  EmployeeRole,
  EmployeeStatus,
  InviteResult,
  Location,
  Procedure,
  ProcedureQuizMode,
  Role,
  Station,
  Subcategory,
  UpdateLocationInput,
  UpdateRoleInput,
  UpdateStationInput,
} from './types';
import { SEED_QUIZZES, type Quiz } from './quizzes';
export type { Quiz };
import { http } from './http';
import { AUTH_ENDPOINTS } from '@/services/auth/endpoints';
import { lookupInvite as authLookupInvite } from '@/services/auth/api';

export const API_BASE = '';

import { ApiException } from './errors';
export { ApiException };

// ----------------------------------------------------------------------------
// Initial Mock Seed Data
// ----------------------------------------------------------------------------

const SEED_LOCATIONS: Location[] = [
  { id: 'loc-main', name: 'Almentria Mexicana - Main Kitchen' },
  { id: 'loc-express', name: 'Downtown Express' },
];

const SEED_ROLES: Role[] = [
  // Per the client's job→station mapping (Line cook → Gm, Grill, Expo).
  { id: 'role-cook', name: 'Line Cook', clearanceLevel: 'station', stationIds: ['stn-gm', 'stn-grill', 'stn-expo'], createdAt: '2026-01-01T00:00:00Z' },
  // Prep cook → prep kitchen only.
  { id: 'role-prep', name: 'Prep Cook', clearanceLevel: 'station', stationIds: ['stn-prep'], createdAt: '2026-01-01T00:00:00Z' },
  // Dishwasher → dishwasher station only.
  { id: 'role-dish', name: 'Dishwasher', clearanceLevel: 'general', stationIds: ['stn-dish'], createdAt: '2026-01-01T00:00:00Z' },
];

const SEED_STATIONS: Station[] = [
  { id: 'stn-gm', name: 'GM – Cold section + fryer', locationId: 'loc-main', sortOrder: 1, isArchived: false },
  { id: 'stn-grill', name: 'Grill', locationId: 'loc-main', sortOrder: 2, isArchived: false },
  { id: 'stn-expo', name: 'Expo', locationId: 'loc-main', sortOrder: 3, isArchived: false },
  { id: 'stn-prep', name: 'Prep kitchen', locationId: 'loc-main', sortOrder: 4, isArchived: false },
  { id: 'stn-dish', name: 'Dishwasher', locationId: 'loc-main', sortOrder: 5, isArchived: false },
];

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-onboarding',
    slug: 'onboarding',
    nameEn: 'Onboarding',
    nameEs: 'Inducción y Capacitación',
    icon: 'onboarding',
    isArchived: false,
    kind: 'general',
    subcategories: [
      { id: 'sub-culture', slug: 'culture', nameEn: 'Culture', nameEs: 'Cultura' },
      { id: 'sub-uniform', slug: 'uniform', nameEn: 'Uniform', nameEs: 'Uniforme' },
      { id: 'sub-conduct', slug: 'conduct', nameEn: 'Employee Conduct', nameEs: 'Conducta del Empleado' },
    ],
  },
  {
    id: 'cat-safety',
    slug: 'food-safety',
    nameEn: 'Food Safety',
    nameEs: 'Seguridad Alimentaria',
    icon: 'food-safety',
    isArchived: false,
    kind: 'general',
    subcategories: [
      { id: 'sub-hygiene', slug: 'hygiene', nameEn: 'Hygiene', nameEs: 'Higiene' },
      { id: 'sub-cross-contamination', slug: 'cross-contamination', nameEn: 'Cross-Contamination', nameEs: 'Contaminación Cruzada' },
      { id: 'sub-labeling-dating', slug: 'labeling-dating', nameEn: 'Labeling & Dating', nameEs: 'Etiquetado y Fechado' },
      { id: 'sub-allergy', slug: 'allergy', nameEn: 'Allergy', nameEs: 'Alergias' },
    ],
  },
  {
    id: 'cat-kitchen-ops',
    slug: 'kitchen-operations',
    nameEn: 'Kitchen Operations',
    nameEs: 'Operaciones de Cocina',
    icon: 'kitchen-operations',
    isArchived: false,
    kind: 'station-tied',
    subcategories: [
      { id: 'sub-station-setup', slug: 'station-setup', nameEn: 'Station Setup', nameEs: 'Montaje de Estación' },
      { id: 'sub-kitchen-comm', slug: 'kitchen-communication', nameEn: 'Kitchen Communication', nameEs: 'Comunicación en Cocina' },
    ],
  },
  {
    id: 'cat-cleaning',
    slug: 'cleaning',
    nameEn: 'Cleaning',
    nameEs: 'Limpieza',
    icon: 'cleaning',
    isArchived: false,
    kind: 'general',
    subcategories: [
      { id: 'sub-dishwashing', slug: 'dishwashing', nameEn: 'Dishwashing', nameEs: 'Lavadiscos' },
      { id: 'sub-chemical', slug: 'chemical-handling', nameEn: 'Chemical Handling', nameEs: 'Manejo de Químicos' },
      { id: 'sub-waste', slug: 'waste-disposal', nameEn: 'Waste Disposal', nameEs: 'Disposición de Desechos' },
    ],
  },
  {
    id: 'cat-opening-closing',
    slug: 'opening-closing',
    nameEn: 'Opening and Closing',
    nameEs: 'Apertura y Cierre',
    icon: 'opening-closing',
    isArchived: false,
    kind: 'station-tied',
    subcategories: [
      { id: 'sub-opening', slug: 'opening-procedures', nameEn: 'Opening Procedures', nameEs: 'Procedimientos de Apertura' },
      { id: 'sub-closing', slug: 'closing-procedures', nameEn: 'Closing Procedures', nameEs: 'Procedimientos de Cierre' },
      { id: 'sub-end-day', slug: 'end-of-day-checks', nameEn: 'End of Day Checks', nameEs: 'Verificaciones de Fin de Día' },
    ],
  },
  {
    id: 'cat-equipment',
    slug: 'equipment',
    nameEn: 'Equipment',
    nameEs: 'Equipamiento',
    icon: 'equipment',
    isArchived: false,
    kind: 'station-tied',
    subcategories: [
      { id: 'sub-operation', slug: 'operation', nameEn: 'Operation', nameEs: 'Operación' },
      { id: 'sub-eq-safety', slug: 'equipment-safety', nameEn: 'Safety', nameEs: 'Seguridad' },
      { id: 'sub-eq-cleaning', slug: 'equipment-cleaning', nameEn: 'Cleaning', nameEs: 'Limpieza' },
    ],
  },
  {
    id: 'cat-recipes',
    slug: 'recipes',
    nameEn: 'Recipes',
    nameEs: 'Recetas',
    icon: 'recipes',
    isArchived: false,
    kind: 'station-tied',
    subcategories: [
      { id: 'sub-plating', slug: 'plating', nameEn: 'Plating', nameEs: 'Emplatado' },
      { id: 'sub-cooking', slug: 'cooking', nameEn: 'Cooking', nameEs: 'Cocción' },
      { id: 'sub-portion', slug: 'portion-standards', nameEn: 'Portion Standards', nameEs: 'Estándares de Porción' },
    ],
  },
];

const SEED_EMPLOYEES: AdminEmployee[] = [
  {
    id: 'emp-maria',
    name: 'María González',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-cook'],
    stationIds: ['stn-grill'],
    role: 'employee',
    languagePref: 'es',
    employeeCode: 'EMP-001',
    status: 'active',
    createdAt: '2026-01-10T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-james',
    name: 'James Carter',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-cook', 'role-prep'],
    stationIds: ['stn-gm', 'stn-grill'],
    role: 'employee',
    languagePref: 'en',
    employeeCode: 'EMP-002',
    status: 'active',
    createdAt: '2026-01-12T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-ana',
    name: 'Ana Martínez',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-pastry'],
    stationIds: ['stn-prep'],
    role: 'employee',
    languagePref: 'es',
    employeeCode: 'EMP-003',
    status: 'active',
    createdAt: '2026-01-15T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-david',
    name: 'David Park',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-prep'],
    stationIds: ['stn-gm'],
    role: 'employee',
    languagePref: 'en',
    employeeCode: 'EMP-004',
    status: 'active',
    createdAt: '2026-01-20T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-sofia',
    name: 'Sofía Hernández',
    locationId: 'loc-main',
    accessLevel: 'manager',
    roleIds: ['role-cook'],
    stationIds: ['stn-expo', 'stn-gm'],
    role: 'admin',
    languagePref: 'es',
    employeeCode: 'EMP-005',
    status: 'active',
    createdAt: '2026-01-05T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-lucas',
    name: 'Lucas Silva',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-dish'],
    stationIds: ['stn-dish'],
    role: 'employee',
    languagePref: 'es',
    employeeCode: 'EMP-006',
    status: 'active',
    createdAt: '2026-01-25T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'general',
  },
  {
    id: 'emp-priya',
    name: 'Priya Patel',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-cook'],
    stationIds: ['stn-gm'],
    role: 'employee',
    languagePref: 'en',
    employeeCode: 'EMP-007',
    status: 'active',
    createdAt: '2026-02-01T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-hiroshi',
    name: 'Hiroshi Tanaka',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-pastry'],
    stationIds: ['stn-prep'],
    role: 'employee',
    languagePref: 'en',
    employeeCode: 'EMP-008',
    status: 'active',
    createdAt: '2026-02-05T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-carla',
    name: 'Carla Fernández',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-prep'],
    stationIds: ['stn-gm'],
    role: 'employee',
    languagePref: 'es',
    employeeCode: 'EMP-009',
    status: 'active',
    createdAt: '2026-02-10T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  // 9 more active team members so "Show 9 more" appears
  {
    id: 'emp-admin',
    name: 'Chef Raúl Medina',
    locationId: 'loc-main',
    accessLevel: 'manager',
    roleIds: ['role-cook'],
    stationIds: ['stn-expo'],
    role: 'admin',
    languagePref: 'en',
    employeeCode: 'EMP-010',
    status: 'active',
    createdAt: '2026-01-10T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'master',
  },
  {
    id: 'emp-cook',
    name: 'Carlos Gomez',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-cook'],
    stationIds: ['stn-grill', 'stn-gm'],
    role: 'employee',
    languagePref: 'es',
    employeeCode: 'EMP-011',
    status: 'active',
    createdAt: '2026-02-01T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-prep',
    name: 'Maria Santos',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-prep'],
    stationIds: ['stn-prep'],
    role: 'employee',
    languagePref: 'es',
    employeeCode: 'EMP-012',
    status: 'active',
    createdAt: '2026-02-15T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'general',
  },
  {
    id: 'emp-001',
    name: 'Marisol Ruiz',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-prep'],
    stationIds: ['stn-gm'],
    role: 'employee',
    languagePref: 'es',
    employeeCode: 'EMP-013',
    status: 'active',
    createdAt: '2026-09-20T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'general',
  },
  {
    id: 'emp-004',
    name: 'Hiro Watanabe',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-cook'],
    stationIds: ['stn-grill'],
    role: 'employee',
    languagePref: 'en',
    employeeCode: 'EMP-014',
    status: 'active',
    createdAt: '2026-08-20T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-006',
    name: 'Ana López',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-dish'],
    stationIds: ['stn-dish'],
    role: 'employee',
    languagePref: 'es',
    employeeCode: 'EMP-015',
    status: 'active',
    createdAt: '2026-09-21T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'general',
  },
  {
    id: 'emp-elena',
    name: 'Elena Rostova',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-pastry'],
    stationIds: ['stn-prep'],
    role: 'employee',
    languagePref: 'en',
    employeeCode: 'EMP-016',
    status: 'active',
    createdAt: '2026-09-22T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-mateo',
    name: 'Mateo Rossi',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-cook'],
    stationIds: ['stn-grill'],
    role: 'employee',
    languagePref: 'en',
    employeeCode: 'EMP-017',
    status: 'active',
    createdAt: '2026-09-22T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  {
    id: 'emp-chloe',
    name: 'Chloe Dubois',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-prep'],
    stationIds: ['stn-gm'],
    role: 'employee',
    languagePref: 'en',
    employeeCode: 'EMP-018',
    status: 'active',
    createdAt: '2026-09-23T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'station',
  },
  // The invite still waiting, for the admin home.
  {
    id: 'emp-007',
    name: 'Luis Ortega',
    locationId: 'loc-main',
    accessLevel: 'employee',
    roleIds: ['role-prep'],
    stationIds: ['stn-prep'],
    role: 'employee',
    languagePref: 'es',
    employeeCode: 'EMP-019',
    status: 'pending',
    createdAt: '2026-09-22T00:00:00Z',
    deactivatedAt: null,
    locationName: 'Almentria Mexicana - Main Kitchen',
    roleClearance: 'general',
  },
];

const SEED_PROCEDURES: Procedure[] = [
  // --------------------------------------------------------------------------
  // Recipe: Guacamole Fresco (REC-014)
  // The full procedure as it appears in /sop-recipe-format.html. Built with
  // the standard block vocabulary — image / heading / text / checklist /
  // warning / recipe / method — so the admin-side article body renders to
  // the same shape as the static template. Allergen banner hoists from the
  // first recipe block via findAllergen().
  // --------------------------------------------------------------------------
  {
    id: 'proc-guacamole-fresco',
    slug: 'guacamole-fresco',
    titleEn: 'Guacamole Fresco',
    titleEs: 'Guacamole Fresco',
    purposeEn: 'To make guacamole that holds its colour and texture through a full service.',
    purposeEs: 'Para hacer guacamole que mantenga su color y textura durante todo el servicio.',
    category: SEED_CATEGORIES[6],
    subcategoryId: 'sub-plating',
    status: 'published',
    // Demo image pool is intentionally tiny (four stock photos for ~12
    // procedures) — pointing at /img/video-cover.jpg so the recipe shows a
    // photo rather than the Recipes category icon in the admin library,
    // employee home, and procedures list. The same shot stands in for the
    // molcajete-and-finished-salsa on the cover tile. No leading image block
    // in `bodyEn`/`bodyEs` — the cover shot only lives here.
    iconImageUrl: '/img/video-cover.jpg',
    createdBy: 'emp-admin',
    createdAt: '2026-08-12T00:00:00Z',
    updatedAt: '2026-09-30T12:00:00Z',
    version: 4,
    isArchived: false,
    // Recipe owns the cold station (GM) and the pass (Expo) — anyone in the
    // room who can plate it.
    stationScope: { mode: 'specific', stationIds: ['stn-gm', 'stn-expo'] },
    quizId: null,
    linkedTrainingId: 'course-recipes',
    quizMode: 'training',
    bodyEn: {
      blocks: [
        { id: 'gf-who', kind: 'heading', level: 2, text: { en: 'Who this is for', es: 'A quién está dirigido' } },
        {
          id: 'gf-who-t',
          kind: 'text',
          body: {
            en: 'Anyone working the cold station or prep. Knife certification is required: the method starts with a knife.',
            es: 'Cualquiera que trabaje en la estación fría o en la preparación. Se requiere certificación de cuchillo: el método comienza con un cuchillo.',
          },
        },
        { id: 'gf-eq-h', kind: 'heading', level: 2, text: { en: 'Equipment', es: 'Equipo' } },
        {
          id: 'gf-eq-t',
          kind: 'text',
          body: {
            en: 'Molcajete and tejolote · bench scraper · quarter pan · digital scale · probe thermometer',
            es: 'Molcajete y tejolote · raspador de mesa · charola quarter · báscula digital · termómetro de sonda',
          },
        },
        // No leading image block on purpose: every other published procedure
        // already uses one of the four stock photos, so the home-row cover
        // would otherwise repeat. ProcedureRow falls back to the Recipes
        // category icon (LuUtensils) when the first block isn't an image —
        // visually distinct from any photo, and the right semantic for a
        // recipe.
        { id: 'gf-prep-h', kind: 'heading', level: 2, text: { en: 'Before you start', es: 'Antes de empezar' } },
        {
          id: 'gf-prep-cl',
          kind: 'checklist',
          title: { en: 'Prep checklist', es: 'Lista de preparación' },
          items: [
            { id: 'gf-prep-1', text: { en: 'Wash your hands.', es: 'Lávese las manos.' } },
            {
              id: 'gf-prep-2',
              text: { en: 'Sanitise the molcajete, the board and the bench.', es: 'Desinfecte el molcajete, la tabla y la mesa.' },
            },
            {
              id: 'gf-prep-3',
              text: {
                en: 'Prep every ingredient as the table describes: dice, chop, seed, juice, strain.',
                es: 'Prepare cada ingrediente como indica la tabla: corte en cubos, pique, despepite, exprima, cuele.',
              },
            },
          ],
        },
        {
          id: 'gf-prep-note',
          kind: 'text',
          body: {
            en: 'Do all of it before you open an avocado. Cut avocado starts browning within minutes.',
            es: 'Haga todo esto antes de abrir un aguacate. El aguacate cortado empieza a oscurecerse en minutos.',
          },
        },
        {
          id: 'gf-knife-warn',
          kind: 'warning',
          severity: 'warn',
          body: {
            en: 'Step 2 removes an avocado stone with a knife. A blade that slips off a stone goes into your hand. Use the heel, strike once, twist.',
            es: 'El paso 2 quita el hueso del aguacate con un cuchillo. Si la hoja resbala sobre el hueso, va hacia su mano. Use el talón, golpee una vez, gire.',
          },
        },
        {
          id: 'gf-recipe',
          kind: 'recipe',
          audience: '',
          allergen: {
            summary: 'Contains sesame',
            detail: 'In the finishing oil, step 8. Check the ticket before it leaves the pass.',
            selectedAllergens: ['sesame'],
          },
          factors: [1, 2, 4],
          yieldItems: [
            { label: 'Batch weight', value: '2.4', unit: 'kg', scales: true },
            { label: 'Portions', value: '12', scales: true },
            { label: 'Portion size', value: '200', unit: 'g' },
            { label: 'Time', value: '20', unit: 'min' },
          ],
          ingredients: [
            {
              name: 'Avocado, Hass',
              form: 'Whole fruit, about 2 kg of flesh. Ripe: gives slightly at the neck',
              amounts: ['2.8 kg', '5.6 kg', '11.2 kg'],
            },
            { name: 'Lime juice', form: 'Fresh, strained', amounts: ['100 ml', '200 ml', '400 ml'] },
            { name: 'White onion', form: 'Small dice, 5 mm', amounts: ['200 g', '400 g', '800 g'] },
            {
              name: 'Cilantro',
              form: 'Leaves and fine stem, chopped',
              amounts: ['30 g', '60 g', '120 g'],
            },
            { name: 'Serrano chilli', form: 'Seeded, minced', amounts: ['20 g', '40 g', '80 g'] },
            { name: 'Salt, kosher', amounts: ['20 g', '40 g', '80 g'] },
            {
              name: 'Sesame finishing oil',
              allergen: true,
              amounts: ['15 ml', '30 ml', '60 ml'],
            },
          ],
          steps: [
            {
              id: 'gf-s1',
              body: {
                en: 'Cut each avocado lengthwise, all the way round the stone. Twist the halves apart.',
                es: 'Corte cada aguacate a lo largo, todo alrededor del hueso. Gire las mitades para separarlas.',
              },
              images: [
                {
                  src: '/demo/guacamole/crop-cut.jpg',
                  alt: { en: 'An avocado cut in half, the stone in one half.', es: 'Un aguacate cortado a la mitad con el hueso en una de ellas.' },
                },
              ],
              videoSegment: { src: '/demo/guacamole/crop-cut.jpg', startSec: 0, endSec: 8 },
            },
            {
              id: 'gf-s2',
              body: {
                en: 'Strike the stone with the heel of the knife, the corner nearest the handle. Twist to lift it out.',
                es: 'Golpee el hueso con el talón del cuchillo, en la esquina más cercana al mango. Gire para levantarlo.',
              },
              images: [
                {
                  src: '/demo/guacamole/step-1-stone.jpg',
                  alt: {
                    en: "A chef's knife blade resting against the stone of a halved avocado, one hand steadying the fruit and the other on the handle, ready to strike.",
                    es: 'La hoja de un cuchillo de chef apoyada contra el hueso de un aguacate cortado por la mitad, una mano sostiene la fruta y la otra está en el mango, lista para golpear.',
                  },
                },
              ],
              note: {
                severity: 'warn',
                body: {
                  en: 'Strike once, then twist. A second strike at a stone that is already loose is how the blade slips.',
                  es: 'Golpee una vez y luego gire. Un segundo golpe a un hueso ya suelto es como la hoja resbala.',
                },
              },
            },
            {
              id: 'gf-s3',
              body: {
                en: 'Scoop the flesh into the molcajete. Scrape the skin clean; the flesh nearest the skin is the greenest.',
                es: 'Vacíe la pulpa en el molcajete. Raspe la cáscara; la pulpa más cercana a la cáscara es la más verde.',
              },
              images: [
                {
                  src: '/demo/guacamole/crop-molcajete.jpg',
                  alt: { en: 'Avocado flesh scooped into a volcanic stone molcajete.', es: 'Pulpa de aguacate vaciada en un molcajete de piedra volcánica.' },
                },
              ],
              videoSegment: { src: '/demo/guacamole/crop-molcajete.jpg', startSec: 0, endSec: 10 },
            },
            {
              id: 'gf-s4',
              body: {
                en: 'Mash to a coarse texture. Stop while pieces are still visible.',
                es: 'Muela hasta una textura gruesa. Deténgase mientras los trozos aún son visibles.',
              },
              compareImages: true,
              images: [
                {
                  src: '/demo/guacamole/step-3-correct.jpg',
                  alt: {
                    en: 'Avocado in a molcajete mashed coarsely, with distinct pieces still visible through the mixture.',
                    es: 'Aguacate en un molcajete molido gruesamente, con trozos distintos aún visibles en la mezcla.',
                  },
                },
                {
                  src: '/demo/guacamole/step-3-overmashed.jpg',
                  alt: {
                    en: 'Avocado in a molcajete mashed to a smooth, uniform purée with no pieces remaining.',
                    es: 'Aguacate en un molcajete molido hasta un puré liso y uniforme sin trozos.',
                  },
                },
              ],
            },
            {
              id: 'gf-s5',
              body: {
                en: 'Fold in all of the lime juice (100 ml) straight away. Without it, the avocado browns within minutes.',
                es: 'Incorpore todo el jugo de limón (100 ml) de inmediato. Sin él, el aguacate se oscurece en minutos.',
              },
              images: [
                {
                  src: '/demo/guacamole/crop-limes.jpg',
                  alt: { en: 'Two whole limes and a cut half on the kitchen bench.', es: 'Dos limones enteros y una mitad cortada en la mesa de cocina.' },
                },
              ],
            },
            {
              id: 'gf-s6',
              body: {
                en: 'Fold in the onion, cilantro and serrano.',
                es: 'Incorpore la cebolla, el cilantro y el serrano.',
              },
              images: [
                {
                  src: '/demo/guacamole/crop-cilantro.jpg',
                  alt: { en: 'Finely chopped cilantro and fresh ingredients ready to fold.', es: 'Cilantro finamente picado e ingredientes frescos listos para incorporar.' },
                },
              ],
            },
            {
              id: 'gf-s7',
              body: {
                en: 'Add the salt. Taste with a clean spoon, and use a fresh spoon every time you taste again.',
                es: 'Agregue la sal. Pruebe con una cuchara limpia y use una cuchara nueva cada vez que vuelva a probar.',
              },
              images: [
                {
                  src: '/demo/guacamole/crop-bowl.jpg',
                  alt: { en: 'Tasting spoon alongside seasoned guacamole in molcajete.', es: 'Cuchara de prueba junto al guacamole sazonado en el molcajete.' },
                },
              ],
            },
            {
              id: 'gf-s8',
              body: {
                en: 'Add the sesame oil. Fold once, so it streaks rather than blends.',
                es: 'Agregue el aceite de sésamo. Incorpore una vez, para que haga vetas en lugar de mezclarse.',
              },
              images: [
                {
                  src: '/demo/guacamole/crop-chilli.jpg',
                  alt: { en: 'Sesame oil drizzled over seasoned guacamole.', es: 'Aceite de sésamo rociado sobre guacamole sazonado.' },
                },
              ],
              note: {
                severity: 'allergen',
                body: {
                  en: 'Sesame enters here. Anything plated for an allergy ticket is made without it, in a clean molcajete.',
                  es: 'Aquí entra el sésamo. Todo lo emplatado para un ticket de alergia se hace sin él, en un molcajete limpio.',
                },
              },
            },
            {
              id: 'gf-s9',
              body: {
                en: 'Transfer to a quarter pan. Press film onto the surface so no air touches the guacamole.',
                es: 'Transfiera a una charola quarter. Presione film sobre la superficie para que el aire no toque el guacamole.',
              },
              images: [
                {
                  src: '/demo/guacamole/step-8-film.jpg',
                  alt: {
                    en: 'Both hands pressing cling film flat onto the surface of guacamole in a stainless quarter pan, with no air trapped between the film and the food.',
                    es: 'Ambas manos presionando film plástico plano sobre la superficie del guacamole en una charola quarter de acero, sin aire atrapado entre el film y la comida.',
                  },
                },
              ],
            },
            {
              id: 'gf-s10',
              body: {
                en: 'Label the pan with today’s date and the time.',
                es: 'Etiquete la charola con la fecha y hora de hoy.',
              },
              images: [
                {
                  src: '/demo/guacamole/crop-label.jpg',
                  alt: { en: 'Prep date and time label affixed to pan.', es: 'Etiqueta con fecha y hora de preparación adherida a la charola.' },
                },
              ],
            },
            {
              id: 'gf-s11',
              body: {
                en: 'Refrigerate. Before service, probe the centre of the pan and record the reading.',
                es: 'Refrigere. Antes del servicio, sondee el centro de la charola y registre la lectura.',
              },
              critical: true,
              criticalLimit: {
                label: 'Critical limit',
                icon: 'LuTempCold',
                value: '4 °C (39 °F) or below',
                subtitle: 'Into the walk-in within 30 minutes of finishing. Check before service.',
                howToCheck:
                  'Probe the centre of the pan with a sanitised thermometer. Record on the Cold Holding Log.',
                breachLabel: 'If it is above 4 °C',
                breachResponse:
                  'Discard. Guacamole is not reheated, so there is no way to bring it back. Tell the chef on duty.',
              },
              images: [
                {
                  src: '/demo/guacamole/step-8-label.jpg',
                  alt: {
                    en: 'A labelled stainless quarter pan of guacamole showing prep date and time, with a digital probe thermometer reading 4.0 degrees Celsius inserted into the centre.',
                    es: 'Una charola quarter de acero etiquetada con guacamole mostrando fecha y hora de preparación, con un termómetro de sonda digital que marca 4.0 grados Celsius insertado en el centro.',
                  },
                },
              ],
            },
          ],
        },
        { id: 'gf-shelf-h', kind: 'heading', level: 2, text: { en: 'Shelf life', es: 'Vida útil' } },
        {
          id: 'gf-shelf-t',
          kind: 'text',
          body: {
            en: 'Serve or discard within 48 hours of the time on the label. Colour is not the test. The label is.',
            es: 'Sirva o deseche dentro de las 48 horas posteriores a la hora en la etiqueta. El color no es la prueba. La etiqueta lo es.',
          },
        },
        { id: 'gf-rel-h', kind: 'heading', level: 2, text: { en: 'Related procedures', es: 'Procedimientos relacionados' } },
        {
          id: 'gf-rel-1',
          kind: 'attachment',
          title: { en: 'Cooling and cold holding', es: 'Enfriamiento y mantenimiento en frío' },
          href: '#related',
          meta: 'Food safety',
        },
        {
          id: 'gf-rel-2',
          kind: 'attachment',
          title: { en: 'Allergen handling', es: 'Manejo de alérgenos' },
          href: '#related',
          meta: 'Front of house',
        },
      ],
    },
    bodyEs: {
      blocks: [
        { id: 'gf-who', kind: 'heading', level: 2, text: { en: 'Who this is for', es: 'A quién está dirigido' } },
        {
          id: 'gf-who-t',
          kind: 'text',
          body: {
            en: 'Anyone working the cold station or prep. Knife certification is required.',
            es: 'Cualquiera que trabaje en la estación fría o en la preparación. Se requiere certificación de cuchillo.',
          },
        },
        { id: 'gf-eq-h', kind: 'heading', level: 2, text: { en: 'Equipment', es: 'Equipo' } },
        {
          id: 'gf-eq-t',
          kind: 'text',
          body: {
            en: 'Molcajete and tejolote · bench scraper · quarter pan · digital scale · probe thermometer',
            es: 'Molcajete y tejolote · raspador de mesa · charola quarter · báscula digital · termómetro de sonda',
          },
        },
        // No leading image block on purpose: every other published procedure
        // already uses one of the four stock photos, so the home-row cover
        // would otherwise repeat. ProcedureRow falls back to the Recipes
        // category icon (LuUtensils) when the first block isn't an image —
        // visually distinct from any photo, and the right semantic for a
        // recipe.
        { id: 'gf-prep-h', kind: 'heading', level: 2, text: { en: 'Before you start', es: 'Antes de empezar' } },
        {
          id: 'gf-prep-cl',
          kind: 'checklist',
          title: { en: 'Prep checklist', es: 'Lista de preparación' },
          items: [
            { id: 'gf-prep-1', text: { en: 'Wash your hands.', es: 'Lávese las manos.' } },
            {
              id: 'gf-prep-2',
              text: { en: 'Sanitise the molcajete, the board and the bench.', es: 'Desinfecte el molcajete, la tabla y la mesa.' },
            },
            {
              id: 'gf-prep-3',
              text: {
                en: 'Prep every ingredient as the table describes: dice, chop, seed, juice, strain.',
                es: 'Prepare cada ingrediente como indica la tabla: corte en cubos, pique, despepite, exprima, cuele.',
              },
            },
          ],
        },
        {
          id: 'gf-prep-note',
          kind: 'text',
          body: {
            en: 'Do all of it before you open an avocado.',
            es: 'Haga todo esto antes de abrir un aguacate. El aguacate cortado empieza a oscurecerse en minutos.',
          },
        },
        {
          id: 'gf-knife-warn',
          kind: 'warning',
          severity: 'warn',
          body: {
            en: 'Step 2 removes an avocado stone with a knife. A blade that slips off a stone goes into your hand.',
            es: 'El paso 2 quita el hueso del aguacate con un cuchillo. Si la hoja resbala sobre el hueso, va hacia su mano. Use el talón, golpee una vez, gire.',
          },
        },
        {
          id: 'gf-recipe',
          kind: 'recipe',
          audience: '',
          allergen: {
            summary: 'Contiene sésamo',
            detail: 'En el aceite de terminado, paso 8. Revise el ticket antes de que salga del pase.',
            selectedAllergens: ['sesame'],
          },
          factors: [1, 2, 4],
          yieldItems: [
            { label: 'Peso del lote', value: '2.4', unit: 'kg', scales: true },
            { label: 'Porciones', value: '12', scales: true },
            { label: 'Tamaño de porción', value: '200', unit: 'g' },
            { label: 'Tiempo', value: '20', unit: 'min' },
          ],
          ingredients: [
            {
              name: 'Aguacate, Hass',
              form: 'Fruta entera, aprox. 2 kg de pulpa. Maduro: cede ligeramente al presionar el cuello',
              amounts: ['2.8 kg', '5.6 kg', '11.2 kg'],
            },
            {
              name: 'Jugo de limón',
              form: 'Fresco, colado',
              amounts: ['100 ml', '200 ml', '400 ml'],
            },
            { name: 'Cebolla blanca', form: 'Cubo pequeño, 5 mm', amounts: ['200 g', '400 g', '800 g'] },
            {
              name: 'Cilantro',
              form: 'Hojas y tallo fino, picado',
              amounts: ['30 g', '60 g', '120 g'],
            },
            {
              name: 'Chile serrano',
              form: 'Sin semillas, picado fino',
              amounts: ['20 g', '40 g', '80 g'],
            },
            { name: 'Sal, kosher', amounts: ['20 g', '40 g', '80 g'] },
            {
              name: 'Aceite de sésamo de terminado',
              allergen: true,
              amounts: ['15 ml', '30 ml', '60 ml'],
            },
          ],
          steps: [
            {
              id: 'gf-s1',
              body: {
                en: 'Cut each avocado lengthwise.',
                es: 'Corte cada aguacate a lo largo, todo alrededor del hueso. Gire las mitades para separarlas.',
              },
            },
            {
              id: 'gf-s2',
              body: {
                en: 'Strike the stone with the heel of the knife.',
                es: 'Golpee el hueso con el talón del cuchillo, en la esquina más cercana al mango. Gire para levantarlo.',
              },
              images: [
                {
                  src: '/img/video-cover.jpg',
                  alt: {
                    en: "A chef's knife blade resting against the stone of a halved avocado.",
                    es: 'La hoja de un cuchillo de chef apoyada contra el hueso de un aguacate cortado por la mitad, una mano sostiene la fruta y la otra está en el mango, lista para golpear.',
                  },
                },
              ],
              note: {
                severity: 'warn',
                body: {
                  en: 'Strike once, then twist.',
                  es: 'Golpee una vez y luego gire. Un segundo golpe a un hueso ya suelto es como la hoja resbala.',
                },
              },
            },
            {
              id: 'gf-s3',
              body: {
                en: 'Scoop the flesh into the molcajete.',
                es: 'Vacíe la pulpa en el molcajete. Raspe la cáscara; la pulpa más cercana a la cáscara es la más verde.',
              },
            },
            {
              id: 'gf-s4',
              body: {
                en: 'Mash to a coarse texture.',
                es: 'Muela hasta una textura gruesa. Deténgase mientras los trozos aún son visibles.',
              },
              images: [
                {
                  src: '/img/equipment.jpg',
                  alt: {
                    en: 'Avocado in a molcajete mashed coarsely, with distinct pieces still visible.',
                    es: 'Aguacate en un molcajete molido gruesamente, con trozos distintos aún visibles en la mezcla.',
                  },
                },
                {
                  src: '/img/video-cover.jpg',
                  alt: {
                    en: 'Avocado in a molcajete mashed to a smooth, uniform purée.',
                    es: 'Aguacate en un molcajete molido hasta un puré liso y uniforme sin trozos.',
                  },
                },
              ],
            },
            {
              id: 'gf-s5',
              body: {
                en: 'Fold in all of the lime juice straight away.',
                es: 'Incorpore todo el jugo de limón de inmediato. Sin él, el aguacate se oscurece en minutos.',
              },
            },
            {
              id: 'gf-s6',
              body: {
                en: 'Fold in the onion, cilantro and serrano.',
                es: 'Incorpore la cebolla, el cilantro y el serrano.',
              },
            },
            {
              id: 'gf-s7',
              body: {
                en: 'Add the salt. Taste with a clean spoon.',
                es: 'Agregue la sal. Pruebe con una cuchara limpia y use una cuchara nueva cada vez que vuelva a probar.',
              },
            },
            {
              id: 'gf-s8',
              body: {
                en: 'Add the sesame oil. Fold once, so it streaks rather than blends.',
                es: 'Agregue el aceite de sésamo. Incorpore una vez, para que haga vetas en lugar de mezclarse.',
              },
              note: {
                severity: 'allergen',
                body: {
                  en: 'Sesame enters here. Anything plated for an allergy ticket is made without it, in a clean molcajete.',
                  es: 'Aquí entra el sésamo. Todo lo emplatado para un ticket de alergia se hace sin él, en un molcajete limpio.',
                },
              },
            },
            {
              id: 'gf-s9',
              body: {
                en: 'Transfer to a quarter pan. Press film onto the surface.',
                es: 'Transfiera a una charola quarter. Presione film sobre la superficie para que el aire no toque el guacamole.',
              },
              images: [
                {
                  src: '/img/equipment.jpg',
                  alt: {
                    en: 'Both hands pressing cling film flat onto the surface of guacamole.',
                    es: 'Ambas manos presionando film plástico plano sobre la superficie del guacamole en una charola quarter de acero, sin aire atrapado entre el film y la comida.',
                  },
                },
              ],
            },
            {
              id: 'gf-s10',
              body: {
                en: 'Label the pan with today’s date and the time.',
                es: 'Etiquete la charola con la fecha y hora de hoy.',
              },
            },
            {
              id: 'gf-s11',
              body: {
                en: 'Refrigerate. Before service, probe the centre of the pan and record the reading.',
                es: 'Refrigere. Antes del servicio, sondee el centro de la charola y registre la lectura.',
              },
              critical: true,
              criticalLimit: {
                label: 'Límite crítico',
                value: '4 °C (39 °F) o menos',
                subtitle: 'Al refrigerador dentro de 30 minutos de terminar. Verifique antes del servicio.',
                howToCheck: 'Sondee el centro de la charola con un termómetro desinfectado. Registre en la Bitácora de Frío.',
                breachLabel: 'Si está por encima de 4 °C',
                breachResponse:
                  'Deseche. El guacamole no se recalienta, así que no hay forma de recuperarlo. Avise al chef de turno.',
              },
              images: [
                {
                  src: '/img/video-cover.jpg',
                  alt: {
                    en: 'A labelled stainless quarter pan of guacamole showing prep date and time, with a digital probe thermometer reading 4.0 degrees Celsius.',
                    es: 'Una charola quarter de acero etiquetada con guacamole mostrando fecha y hora de preparación, con un termómetro de sonda digital que marca 4.0 grados Celsius insertado en el centro.',
                  },
                },
              ],
            },
          ],
        },
        { id: 'gf-shelf-h', kind: 'heading', level: 2, text: { en: 'Shelf life', es: 'Vida útil' } },
        {
          id: 'gf-shelf-t',
          kind: 'text',
          body: {
            en: 'Serve or discard within 48 hours of the time on the label.',
            es: 'Sirva o deseche dentro de las 48 horas posteriores a la hora en la etiqueta. El color no es la prueba. La etiqueta lo es.',
          },
        },
        { id: 'gf-rel-h', kind: 'heading', level: 2, text: { en: 'Related procedures', es: 'Procedimientos relacionados' } },
        {
          id: 'gf-rel-1',
          kind: 'attachment',
          title: { en: 'Cooling and cold holding', es: 'Enfriamiento y mantenimiento en frío' },
          href: '#related',
          meta: 'Seguridad alimentaria',
        },
        {
          id: 'gf-rel-2',
          kind: 'attachment',
          title: { en: 'Allergen handling', es: 'Manejo de alérgenos' },
          href: '#related',
          meta: 'Sala',
        },
      ],
    },
  },
  // -------------------------------------------------------------------
  // Limited-time promo dish — fronted on the employee home under the
  // "PROMO" badge. The slug is registered in `lib/promos.ts → PROMO_SLUGS`,
  // which `pickPromoProcedures` reads to surface up to three of these on
  // the home screen. Backend `promo` column will replace the slug list
  // when it ships; this entry stays as the seed data.
  // -------------------------------------------------------------------
  {
    id: 'proc-promo-sea-bass',
    slug: 'herb-crusted-sea-bass',
    titleEn: 'Herb-Crusted Sea Bass',
    titleEs: 'Lubina con Costra de Hierbas',
    purposeEn:
      'A fresh, elegant signature dish featuring perfectly seared sea bass with a crisp herb crust, creamy lemon-basil sauce, and roasted cherry tomatoes.',
    purposeEs:
      'Un plato estrella fresco y elegante: lubina perfectamente sellada con costra crujiente de hierbas, salsa cremosa de limón y albahaca, y tomates cherry asados.',
    category: SEED_CATEGORIES[6],
    subcategoryId: 'sub-cooking',
    status: 'published',
    iconImageUrl: '/img/promo1.jpg',
    createdBy: 'emp-admin',
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-30T09:00:00Z',
    version: 1,
    isArchived: false,
    stationScope: { mode: 'specific', stationIds: ['stn-grill', 'stn-expo'] },
    quizId: null,
    linkedTrainingId: null,
    quizMode: 'training',
    bodyEn: {
      blocks: [
        {
          id: 'sb-cover',
          kind: 'image',
          src: '/img/promo1.jpg',
          alt: {
            en: 'A finished plate: herb-crusted sea bass over lemon-basil sauce with roasted cherry tomatoes.',
            es: 'Plato terminado: lubina con costra de hierbas sobre salsa de limón y albahaca con tomates cherry asados.',
          },
          hint: 'photo',
        },
        {
          id: 'sb-purpose',
          kind: 'text',
          body: {
            en: 'A fresh, elegant signature dish featuring perfectly seared sea bass with a crisp herb crust, creamy lemon-basil sauce, and roasted cherry tomatoes. Serves 1.',
            es: 'Un plato estrella fresco y elegante: lubina perfectamente sellada con costra crujiente de hierbas, salsa cremosa de limón y albahaca, y tomates cherry asados. Rinde 1 porción.',
          },
        },
        {
          id: 'sb-facts',
          kind: 'heading',
          level: 2,
          text: { en: 'At a glance', es: 'De un vistazo' },
        },
        {
          id: 'sb-facts-t',
          kind: 'text',
          body: {
            en: 'Serves 1 · Prep 15 min · Cook 15 min · Internal temperature 63 °C (145 °F).',
            es: 'Rinde 1 porción · Prep 15 min · Cocción 15 min · Temperatura interna 63 °C (145 °F).',
          },
        },
        {
          id: 'sb-ingredients-h',
          kind: 'heading',
          level: 2,
          text: { en: 'Ingredients', es: 'Ingredientes' },
        },
        {
          id: 'sb-ingredients-t',
          kind: 'text',
          body: {
            en: '1 sea bass fillet (180 g, skin-on) · 2 tbsp fresh parsley, chopped · 1 tbsp fresh dill, chopped · 1 tbsp fresh chives, sliced · 1 garlic clove, minced · 1 tbsp panko breadcrumbs · 1 tbsp olive oil · 1 lemon (zest + juice) · 100 ml heavy cream · 8 fresh basil leaves · 100 g cherry tomatoes · salt and pepper to taste · 1 tbsp butter.',
            es: '1 filete de lubina (180 g, con piel) · 2 cdas de perejil fresco picado · 1 cda de eneldo fresco picado · 1 cda de cebollín fresco en rodajas · 1 diente de ajo picado · 1 cda de pan rallado (panko) · 1 cda de aceite de oliva · 1 limón (ralladura y jugo) · 100 ml de crema para batir · 8 hojas de albahaca fresca · 100 g de tomates cherry · sal y pimienta al gusto · 1 cda de mantequilla.',
          },
        },
        {
          id: 'sb-recipe',
          kind: 'recipe',
          audience: '',
          allergen: {
            summary: 'Contains fish, dairy, wheat (panko), gluten',
            detail: 'Check the ticket for fish, dairy and gluten allergies before plating.',
            selectedAllergens: ['fish', 'milk', 'wheat', 'gluten'],
          },
          yieldItems: [
            { label: 'Portions', value: '1', scales: true },
            { label: 'Portion size', value: '180', unit: 'g' },
            { label: 'Prep', value: '15', unit: 'min' },
            { label: 'Cook', value: '15', unit: 'min' },
          ],
          steps: [
            {
              id: 'sb-s1',
              body: {
                en: 'Preheat the oven to 200 °C (400 °F).',
                es: 'Precalienta el horno a 200 °C (400 °F).',
              },
            },
            {
              id: 'sb-s2',
              body: {
                en: 'Mix parsley, dill, chives, garlic, panko, olive oil, lemon zest, salt and pepper in a small bowl.',
                es: 'Mezcla perejil, eneldo, cebollín, ajo, panko, aceite de oliva, ralladura de limón, sal y pimienta en un bowl pequeño.',
              },
            },
            {
              id: 'sb-s3',
              body: {
                en: 'Score the sea bass skin lightly. Season the fillet with salt and pepper on both sides.',
                es: 'Haz cortes superficiales en la piel de la lubina. Sazona el filete con sal y pimienta por ambos lados.',
              },
            },
            {
              id: 'sb-s4',
              body: {
                en: 'Heat an oven-safe pan over medium-high heat. Sear the fillet skin-side down for 3 minutes until the skin is crisp and golden.',
                es: 'Calienta un sartén apto para horno a fuego medio-alto. Sella el filete por el lado de la piel durante 3 minutos hasta que esté crujiente y dorada.',
              },
            },
            {
              id: 'sb-s5',
              body: {
                en: 'Press the herb crust onto the flesh side of the fillet. Transfer the pan to the oven and roast for 8-10 minutes until the internal temperature reaches 63 °C (145 °F).',
                es: 'Presiona la costra de hierbas sobre el lado de la carne del filete. Lleva el sartén al horno y rostiza 8-10 minutos hasta que la temperatura interna alcance 63 °C (145 °F).',
              },
              critical: true,
              criticalLimit: {
                label: 'Critical limit',
                icon: 'LuTempHot',
                value: '63 °C (145 °F) internal',
                subtitle: 'Fish must reach this temperature to be safe to serve.',
                howToCheck: 'Probe at the thickest part of the fillet with a sanitised thermometer.',
                breachLabel: 'If below 63 °C',
                breachResponse: 'Return to the oven for 2 minutes and re-check. Do not serve undercooked fish.',
              },
            },
            {
              id: 'sb-s6',
              body: {
                en: 'While the fish cooks, halve the cherry tomatoes and toss with olive oil, salt and pepper. Roast in a small pan for the last 6 minutes of cooking time.',
                es: 'Mientras se cocina el pescado, corta los tomates cherry por la mitad y mézclalos con aceite de oliva, sal y pimienta. Rostízalos en un sartén pequeño durante los últimos 6 minutos de cocción.',
              },
            },
            {
              id: 'sb-s7',
              body: {
                en: 'For the sauce: heat cream in a small pan over low heat. Add lemon juice and torn basil leaves. Simmer for 2 minutes, then whisk in butter until silky.',
                es: 'Para la salsa: calienta la crema en un sartén pequeño a fuego bajo. Agrega el jugo de limón y las hojas de albahaca rotas. Cocina a fuego lento durante 2 minutos, luego incorpora la mantequilla batiendo hasta que quede sedosa.',
              },
            },
            {
              id: 'sb-s8',
              body: {
                en: 'Plate: spoon the lemon-basil sauce onto a warm plate, lay the sea bass on top, and arrange the roasted cherry tomatoes around it. Garnish with a basil leaf and serve immediately.',
                es: 'Emplata: vierte la salsa de limón y albahaca en un plato caliente, coloca la lubina encima y acomoda los tomates cherry asados alrededor. Decora con una hoja de albahaca y sirve de inmediato.',
              },
            },
          ],
        },
        {
          id: 'sb-key-h',
          kind: 'heading',
          level: 2,
          text: { en: 'Key points', es: 'Puntos clave' },
        },
        {
          id: 'sb-key-1',
          kind: 'text',
          body: {
            en: 'Score the skin — this prevents it from curling and ensures even crisping.',
            es: 'Haz cortes en la piel — esto evita que se encoja y asegura un dorado uniforme.',
          },
        },
        {
          id: 'sb-key-2',
          kind: 'text',
          body: {
            en: 'Sear skin-side down first — this is the only way to get a crisp skin without overcooking the flesh.',
            es: 'Sella primero por el lado de la piel — es la única forma de lograr una piel crujiente sin sobrecocinar la carne.',
          },
        },
        {
          id: 'sb-key-3',
          kind: 'text',
          body: {
            en: 'Internal temperature is 63 °C (145 °F) — fish that looks done can still be undercooked inside.',
            es: 'La temperatura interna es 63 °C (145 °F) — un pescado que parece cocido aún puede estar crudo por dentro.',
          },
        },
        {
          id: 'sb-key-4',
          kind: 'text',
          body: {
            en: 'Finish the butter off the heat — adding it to a boiling sauce will break the emulsion.',
            es: 'Termina la mantequilla fuera del fuego — agregarla a una salsa hirviendo romperá la emulsión.',
          },
        },
        {
          id: 'sb-pro-h',
          kind: 'heading',
          level: 2,
          text: { en: 'Pro tip', es: 'Consejo profesional' },
        },
        {
          id: 'sb-pro-t',
          kind: 'text',
          body: {
            en: 'Add a splash of the pan juices from the roasted tomatoes into the lemon-basil sauce — it deepens the flavour without extra seasoning.',
            es: 'Agrega un chorrito del jugo del sartén de los tomates asados a la salsa de limón y albahaca — profundiza el sabor sin necesidad de más condimentos.',
          },
        },
      ],
    },
    bodyEs: {
      blocks: [
        {
          id: 'sb-cover',
          kind: 'image',
          src: '/img/promo1.jpg',
          alt: {
            en: 'A finished plate: herb-crusted sea bass over lemon-basil sauce with roasted cherry tomatoes.',
            es: 'Plato terminado: lubina con costra de hierbas sobre salsa de limón y albahaca con tomates cherry asados.',
          },
          hint: 'photo',
        },
        {
          id: 'sb-purpose',
          kind: 'text',
          body: {
            en: 'A fresh, elegant signature dish featuring perfectly seared sea bass with a crisp herb crust, creamy lemon-basil sauce, and roasted cherry tomatoes. Serves 1.',
            es: 'Un plato estrella fresco y elegante: lubina perfectamente sellada con costra crujiente de hierbas, salsa cremosa de limón y albahaca, y tomates cherry asados. Rinde 1 porción.',
          },
        },
        {
          id: 'sb-facts',
          kind: 'heading',
          level: 2,
          text: { en: 'At a glance', es: 'De un vistazo' },
        },
        {
          id: 'sb-facts-t',
          kind: 'text',
          body: {
            en: 'Serves 1 · Prep 15 min · Cook 15 min · Internal temperature 63 °C (145 °F).',
            es: 'Rinde 1 porción · Prep 15 min · Cocción 15 min · Temperatura interna 63 °C (145 °F).',
          },
        },
        {
          id: 'sb-ingredients-h',
          kind: 'heading',
          level: 2,
          text: { en: 'Ingredients', es: 'Ingredientes' },
        },
        {
          id: 'sb-ingredients-t',
          kind: 'text',
          body: {
            en: '1 sea bass fillet (180 g, skin-on) · 2 tbsp fresh parsley, chopped · 1 tbsp fresh dill, chopped · 1 tbsp fresh chives, sliced · 1 garlic clove, minced · 1 tbsp panko breadcrumbs · 1 tbsp olive oil · 1 lemon (zest + juice) · 100 ml heavy cream · 8 fresh basil leaves · 100 g cherry tomatoes · salt and pepper to taste · 1 tbsp butter.',
            es: '1 filete de lubina (180 g, con piel) · 2 cdas de perejil fresco picado · 1 cda de eneldo fresco picado · 1 cda de cebollín fresco en rodajas · 1 diente de ajo picado · 1 cda de pan rallado (panko) · 1 cda de aceite de oliva · 1 limón (ralladura y jugo) · 100 ml de crema para batir · 8 hojas de albahaca fresca · 100 g de tomates cherry · sal y pimienta al gusto · 1 cda de mantequilla.',
          },
        },
        {
          id: 'sb-recipe',
          kind: 'recipe',
          audience: '',
          allergen: {
            summary: 'Contiene pescado, lácteos, trigo (panko), gluten',
            detail: 'Verifica el ticket por alergias a pescado, lácteos y gluten antes de emplatar.',
            selectedAllergens: ['fish', 'milk', 'wheat', 'gluten'],
          },
          yieldItems: [
            { label: 'Porciones', value: '1', scales: true },
            { label: 'Tamaño de porción', value: '180', unit: 'g' },
            { label: 'Prep', value: '15', unit: 'min' },
            { label: 'Cocción', value: '15', unit: 'min' },
          ],
          steps: [
            {
              id: 'sb-s1',
              body: {
                en: 'Preheat the oven to 200 °C (400 °F).',
                es: 'Precalienta el horno a 200 °C (400 °F).',
              },
            },
            {
              id: 'sb-s2',
              body: {
                en: 'Mix parsley, dill, chives, garlic, panko, olive oil, lemon zest, salt and pepper in a small bowl.',
                es: 'Mezcla perejil, eneldo, cebollín, ajo, panko, aceite de oliva, ralladura de limón, sal y pimienta en un bowl pequeño.',
              },
            },
            {
              id: 'sb-s3',
              body: {
                en: 'Score the sea bass skin lightly. Season the fillet with salt and pepper on both sides.',
                es: 'Haz cortes superficiales en la piel de la lubina. Sazona el filete con sal y pimienta por ambos lados.',
              },
            },
            {
              id: 'sb-s4',
              body: {
                en: 'Heat an oven-safe pan over medium-high heat. Sear the fillet skin-side down for 3 minutes until the skin is crisp and golden.',
                es: 'Calienta un sartén apto para horno a fuego medio-alto. Sella el filete por el lado de la piel durante 3 minutos hasta que esté crujiente y dorada.',
              },
            },
            {
              id: 'sb-s5',
              body: {
                en: 'Press the herb crust onto the flesh side of the fillet. Transfer the pan to the oven and roast for 8-10 minutes until the internal temperature reaches 63 °C (145 °F).',
                es: 'Presiona la costra de hierbas sobre el lado de la carne del filete. Lleva el sartén al horno y rostiza 8-10 minutos hasta que la temperatura interna alcance 63 °C (145 °F).',
              },
              critical: true,
              criticalLimit: {
                label: 'Límite crítico',
                icon: 'LuTempHot',
                value: '63 °C (145 °F) interno',
                subtitle: 'El pescado debe alcanzar esta temperatura para ser seguro de servir.',
                howToCheck: 'Sondea la parte más gruesa del filete con un termómetro desinfectado.',
                breachLabel: 'Si está por debajo de 63 °C',
                breachResponse: 'Regresa al horno por 2 minutos y vuelve a verificar. No sirvas pescado crudo.',
              },
            },
            {
              id: 'sb-s6',
              body: {
                en: 'While the fish cooks, halve the cherry tomatoes and toss with olive oil, salt and pepper. Roast in a small pan for the last 6 minutes of cooking time.',
                es: 'Mientras se cocina el pescado, corta los tomates cherry por la mitad y mézclalos con aceite de oliva, sal y pimienta. Rostízalos en un sartén pequeño durante los últimos 6 minutos de cocción.',
              },
            },
            {
              id: 'sb-s7',
              body: {
                en: 'For the sauce: heat cream in a small pan over low heat. Add lemon juice and torn basil leaves. Simmer for 2 minutes, then whisk in butter until silky.',
                es: 'Para la salsa: calienta la crema en un sartén pequeño a fuego bajo. Agrega el jugo de limón y las hojas de albahaca rotas. Cocina a fuego lento durante 2 minutos, luego incorpora la mantequilla batiendo hasta que quede sedosa.',
              },
            },
            {
              id: 'sb-s8',
              body: {
                en: 'Plate: spoon the lemon-basil sauce onto a warm plate, lay the sea bass on top, and arrange the roasted cherry tomatoes around it. Garnish with a basil leaf and serve immediately.',
                es: 'Emplata: vierte la salsa de limón y albahaca en un plato caliente, coloca la lubina encima y acomoda los tomates cherry asados alrededor. Decora con una hoja de albahaca y sirve de inmediato.',
              },
            },
          ],
        },
        {
          id: 'sb-key-h',
          kind: 'heading',
          level: 2,
          text: { en: 'Key points', es: 'Puntos clave' },
        },
        {
          id: 'sb-key-1',
          kind: 'text',
          body: {
            en: 'Score the skin — this prevents it from curling and ensures even crisping.',
            es: 'Haz cortes en la piel — esto evita que se encoja y asegura un dorado uniforme.',
          },
        },
        {
          id: 'sb-key-2',
          kind: 'text',
          body: {
            en: 'Sear skin-side down first — this is the only way to get a crisp skin without overcooking the flesh.',
            es: 'Sella primero por el lado de la piel — es la única forma de lograr una piel crujiente sin sobrecocinar la carne.',
          },
        },
        {
          id: 'sb-key-3',
          kind: 'text',
          body: {
            en: 'Internal temperature is 63 °C (145 °F) — fish that looks done can still be undercooked inside.',
            es: 'La temperatura interna es 63 °C (145 °F) — un pescado que parece cocido aún puede estar crudo por dentro.',
          },
        },
        {
          id: 'sb-key-4',
          kind: 'text',
          body: {
            en: 'Finish the butter off the heat — adding it to a boiling sauce will break the emulsion.',
            es: 'Termina la mantequilla fuera del fuego — agregarla a una salsa hirviendo romperá la emulsión.',
          },
        },
        {
          id: 'sb-pro-h',
          kind: 'heading',
          level: 2,
          text: { en: 'Pro tip', es: 'Consejo profesional' },
        },
        {
          id: 'sb-pro-t',
          kind: 'text',
          body: {
            en: 'Add a splash of the pan juices from the roasted tomatoes into the lemon-basil sauce — it deepens the flavour without extra seasoning.',
            es: 'Agrega un chorrito del jugo del sartén de los tomates asados a la salsa de limón y albahaca — profundiza el sabor sin necesidad de más condimentos.',
          },
        },
      ],
    },
  },
];

// ----------------------------------------------------------------------------
// Local Storage / State Helpers
// ----------------------------------------------------------------------------

function getStored<T>(key: string, seed: T): T {
  if (typeof window === 'undefined') return seed;
  try {
    const raw = localStorage.getItem(`lms_demo_${key}`);
    return raw ? (JSON.parse(raw) as T) : seed;
  } catch {
    return seed;
  }
}

/** Slugs of categories that should be `kind: 'general'` — they apply at
 *  every station and never ask the manager to pick one. Used by the local-
 *  Storage migration (and any future fixtures) to backfill `kind` on
 *  pre-existing records that predate the field. */
function setStored<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`lms_demo_${key}`, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

// One-time purge of pre-live demo payloads: browsers that ran the mock
// era still carry seed rows under these keys, and the readers above would
// keep serving them. Mirrors refill from the API on the next list fetch.
if (typeof window !== 'undefined') {
  try {
    if (!window.localStorage.getItem('lms_demo_purged_v1')) {
      for (const key of ['locations', 'roles_v2', 'stations_v2', 'categories_v3', 'employees_v3', 'procedures_v2', 'quizzes']) {
        window.localStorage.removeItem(`lms_demo_${key}`);
      }
      window.localStorage.setItem('lms_demo_purged_v1', '1');
    }
  } catch {
    // Ignore storage errors
  }
}

// Local stores below are write-through mirrors of API rows only (first
// paint via getCachedProcedure, optimistic explorer updates). They are
// seeded from EMPTY defaults — seed constants never materialise here, so
// no mock row can ever render as data.
let mockProcedures: Procedure[] = getStored('procedures_v2', []);
// Centralised quizzes table. The wizard authors quizzes locally in form
// state and on save calls `createQuiz()` to materialise a row here and
// stamp its id onto the procedure. Stage 3 (course creation) writes to
// the same store — that is the whole point of having one table.
let mockQuizzes: Quiz[] = getStored('quizzes', SEED_QUIZZES);

function getProceduresStore(): Procedure[] {
  if (typeof window !== 'undefined') {
    mockProcedures = getStored('procedures_v2', []);
  }
  return mockProcedures;
}
function getQuizzesStore(): Quiz[] {
  if (typeof window !== 'undefined') mockQuizzes = getStored('quizzes', SEED_QUIZZES);
  return mockQuizzes;
}

// ----------------------------------------------------------------------------
// Typed endpoints (Zero Backend Demo Mode)
// ----------------------------------------------------------------------------

export interface LoginInput {
  email?: string;
  name?: string;
  password?: string;
  locationId?: string;
  deviceMode?: 'personal' | 'shared';
}

export async function login(input: LoginInput): Promise<{ employee: Employee }> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      token: string;
      user: { id: string; name: string; email: string };
      employee?: Employee;
      role?: string;
    };
  }>(AUTH_ENDPOINTS.LOGIN, {
    email: input.email,
    password: input.password,
  });

  const token = data.data?.token;

  if (typeof window !== 'undefined' && token) {
    localStorage.setItem('token', token);
    document.cookie = `lms_token=${token}; path=/; max-age=864000; SameSite=Lax`;
  }

  let emp: Employee;
  if (data.data?.employee) {
    emp = data.data.employee;
  } else if (data.data?.role) {
    emp = {
      id: data.data.user.id,
      name: data.data.user.name,
      email: data.data.user.email,
      role: (data.data.role as EmployeeRole),
      locationId: '',
      roleIds: [],
      stationIds: [],
      languagePref: 'en',
    };
  } else {
    const meRes = await fetchMe();
    emp = meRes.employee;
  }

  if (typeof window !== 'undefined') {
    setStored('current_user', emp);
    document.cookie = `lms_role=${emp.role}; path=/; max-age=864000; SameSite=Lax`;
    document.cookie = `lms_emp_id=${emp.id}; path=/; max-age=864000; SameSite=Lax`;
  }

  return { employee: emp };
}

export async function logout(): Promise<{ ok: true }> {
  try {
    await http.post(AUTH_ENDPOINTS.SIGN_OUT);
  } catch {
    // Continue cleanup even if server sign-out fails
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('lms_demo_current_user');
      localStorage.removeItem('current_user');
      document.cookie = 'lms_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'lms_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'lms_emp_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch {
      // Ignore
    }
  }
  clearMeCache();
  return { ok: true };
}

export async function requestPasswordReset(input: { email: string }): Promise<{ ok: true; message: string }> {
  await http.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email: input.email });
  return { ok: true, message: 'Password reset link sent.' };
}

export async function resetPassword(input: { token?: string; code?: string; password: string; email?: string }): Promise<{ ok: true; message: string }> {
  await http.post(AUTH_ENDPOINTS.RESET_PASSWORD, {
    email: input.email || '',
    otp: input.code || input.token || '',
    password: input.password,
  });
  return { ok: true, message: 'Password updated successfully.' };
}

export async function activate(input: { token?: string; password: string; email?: string }): Promise<{ employee: Employee; redirectTo?: string }> {
  const { activate: authActivate } = await import('@/services/auth/api');
  return authActivate(input);
}

export async function verifyResetToken(token: string): Promise<{
  valid: boolean;
  email?: string;
  employeeName?: string;
}> {
  if (!token || token === 'invalid' || token === 'expired') {
    return { valid: false };
  }
  return {
    valid: true,
    email: '',
    employeeName: '',
  };
}

const inFlightMe = new Map<string, Promise<{ employee: Employee }>>();
const cachedMe = new Map<string, { data: { employee: Employee }; expiresAt: number }>();
const ME_CACHE_TTL_MS = 60_000;

export function clearMeCache(): void {
  cachedMe.clear();
  inFlightMe.clear();
}

export async function fetchMe(
  cookieHeader?: string,
  _signal?: AbortSignal,
): Promise<{ employee: Employee }> {
  const cacheKey = cookieHeader || (typeof window !== 'undefined' ? 'client' : 'server_default');
  const now = Date.now();

  const cached = cachedMe.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const existing = inFlightMe.get(cacheKey);
  if (existing) {
    return existing;
  }

  const mePromise = (async () => {
    try {
      // No `Cache-Control: no-cache` / `_t` buster here: freshness is owned
      // by the 10s in-memory TTL + in-flight dedup below. Busters force a
      // full backend round-trip on every call and defeat the rewrite proxy
      // cache for an idempotent session check.
      const headers: Record<string, string> = {};

      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
        const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
        if (tokenMatch) {
          headers['Authorization'] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
        }
      }

      const { data } = await http.get<{
        success: boolean;
        data: {
          employee?: Employee;
          user?: { id: string; name: string; email: string };
          role?: string;
        };
      }>(AUTH_ENDPOINTS.ME, {
        headers: Object.keys(headers).length ? headers : undefined,
        signal: _signal,
      });

      if (data.data?.employee) {
        const res = { employee: data.data.employee };
        cachedMe.set(cacheKey, { data: res, expiresAt: Date.now() + ME_CACHE_TTL_MS });
        return res;
      }

      if (data.data?.user) {
        const userRole = (data.data.role as EmployeeRole) || 'super_admin';
        const res = {
          employee: {
            id: data.data.user.id,
            name: data.data.user.name,
            email: data.data.user.email,
            role: userRole,
            locationId: '',
            roleIds: [],
            stationIds: [],
            languagePref: 'en' as const,
          },
        };
        cachedMe.set(cacheKey, { data: res, expiresAt: Date.now() + ME_CACHE_TTL_MS });
        return res;
      }
    } catch (err) {
      if (err instanceof ApiException) {
        throw err;
      }
    } finally {
      inFlightMe.delete(cacheKey);
    }

    throw new ApiException(401, 'SESSION_INVALID', 'Session expired or invalid');
  })();

  inFlightMe.set(cacheKey, mePromise);
  return mePromise;
}

// ----------------------------------------------------------------------------
// Admin lookups
// ----------------------------------------------------------------------------

export async function listRoles(cookieHeader?: string): Promise<{ roles: Role[] }> {
  // Always live data — no mock fallback. Failures propagate so the UI can
  // surface the backend error instead of rendering stale seed rows.
  const { fetchRoles } = await import('@/services/jobs/api');
  return fetchRoles(cookieHeader);
}

export async function listStations(
  locationId?: string,
  cookieHeader?: string,
  _opts: { includeArchived?: boolean } = {},
): Promise<{ stations: Station[] }> {
  // `locationId` / `includeArchived` are legacy parameters kept for
  // backward compatibility — backend stations are global `{ id, name }`
  // rows with no location scoping or archive flag, so they are ignored.
  // Always live data — no mock fallback.
  void locationId;
  const { fetchStations } = await import('@/services/stations/api');
  return fetchStations({}, cookieHeader);
}

export async function listLocations(cookieHeader?: string): Promise<{ locations: Location[] }> {
  // Always live data — no mock fallback.
  const { fetchLocations } = await import('@/services/locations/api');
  return fetchLocations(cookieHeader);
}

// ----------------------------------------------------------------------------
// Admin employees
// ----------------------------------------------------------------------------

export async function listEmployees(
  opts: { status?: EmployeeStatus | 'all' } = {},
  cookieHeader?: string,
): Promise<{ employees: AdminEmployee[] }> {
  // Always live data — no mock fallback. Failures propagate so screens
  // render the backend error instead of stale seed rows.
  const status = opts.status ?? 'all';
  const { fetchEmployees } = await import('@/services/employees/api');
  return fetchEmployees({ status }, cookieHeader);
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<{ employee: Employee; invite: InviteResult }> {
  const { createEmployee: apiCreate } = await import('@/services/employees/api');
  return apiCreate(input);
}

export async function resendInvite(employeeId: string): Promise<{ invite: InviteResult }> {
  const { resendInvite: apiResend } = await import('@/services/employees/api');
  return apiResend(employeeId);
}

export async function deactivateEmployee(employeeId: string): Promise<{ employee: AdminEmployee }> {
  const { deactivateEmployee: apiDeactivate } = await import('@/services/employees/api');
  return apiDeactivate(employeeId);
}

export async function reactivateEmployee(employeeId: string): Promise<{ employee: AdminEmployee }> {
  const { reactivateEmployee: apiReactivate } = await import('@/services/employees/api');
  return apiReactivate(employeeId);
}

// ----------------------------------------------------------------------------
// Admin settings — stations, roles, locations
// ----------------------------------------------------------------------------

export async function createStation(input: CreateStationInput): Promise<{ station: Station }> {
  // Backend `POST /api/v1/stations` takes `{ name }` only. Errors propagate
  // to the caller — no mock fallback, so a failed write can never render
  // as a saved chip.
  const { createStation: apiCreate } = await import('@/services/stations/api');
  return apiCreate({ name: input.name.trim() });
}

export async function updateStation(stationId: string, patch: UpdateStationInput): Promise<{ station: Station }> {
  // Backend `PATCH /api/v1/stations/:id` takes `{ name }` only. Removal
  // goes through `deleteStation` (DELETE), not an archive flag.
  if (patch.name === undefined) {
    throw new ApiException(400, 'INVALID_INPUT', 'Nothing to update');
  }
  const { updateStation: apiUpdate } = await import('@/services/stations/api');
  return apiUpdate(stationId, { name: patch.name.trim() });
}

export async function deleteStation(stationId: string): Promise<{ ok: true }> {
  const { deleteStation: apiDelete } = await import('@/services/stations/api');
  return apiDelete(stationId);
}

export async function createRole(input: CreateRoleInput): Promise<{ role: Role }> {
  // Backend `POST /api/v1/jobs` takes `{ name, stationIds? }` — there is no
  // clearance tier. Errors propagate (no mock fallback).
  const { createJob } = await import('@/services/jobs/api');
  const { job } = await createJob({ name: input.name.trim(), stationIds: input.stationIds ?? [] });
  const role: Role = {
    id: job.id,
    name: job.name,
    clearanceLevel: input.clearanceLevel ?? 'general',
    stationIds: job.stationIds ?? input.stationIds ?? [],
    createdAt: job.createdAt || new Date().toISOString(),
  };
  return { role };
}

export async function updateRole(roleId: string, patch: UpdateRoleInput): Promise<{ role: Role }> {
  // Backend `PATCH /api/v1/jobs/:id` takes `{ name?, stationIds? }` —
  // `clearanceLevel` is UI legacy and is never sent.
  const payload: { name?: string; stationIds?: string[] } = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.stationIds !== undefined) payload.stationIds = patch.stationIds;
  if (Object.keys(payload).length === 0) {
    throw new ApiException(400, 'INVALID_INPUT', 'Nothing to update');
  }
  const { updateJob } = await import('@/services/jobs/api');
  const { job } = await updateJob(roleId, payload);
  const role: Role = {
    id: job.id,
    name: job.name,
    clearanceLevel: patch.clearanceLevel ?? 'general',
    stationIds: job.stationIds ?? payload.stationIds ?? [],
    createdAt: job.createdAt || new Date().toISOString(),
  };
  return { role };
}

export async function deleteRole(roleId: string): Promise<{ ok: true }> {
  const { deleteJob } = await import('@/services/jobs/api');
  await deleteJob(roleId);
  return { ok: true };
}

export async function createLocation(input: CreateLocationInput): Promise<{ location: Location }> {
  // Backend `POST /api/v1/locations` takes `{ name }`. Errors propagate.
  const { createLocation: apiCreate } = await import('@/services/locations/api');
  return apiCreate({ name: input.name.trim() });
}

export async function updateLocation(locationId: string, patch: UpdateLocationInput): Promise<{ location: Location }> {
  const { updateLocation: apiUpdate } = await import('@/services/locations/api');
  return apiUpdate(locationId, { name: patch.name.trim() });
}

export async function deleteLocation(locationId: string): Promise<{ ok: true }> {
  const { deleteLocation: apiDelete } = await import('@/services/locations/api');
  await apiDelete(locationId);
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Activate
// ----------------------------------------------------------------------------

export async function lookupInvite(token: string): Promise<{
  employeeName: string;
  expiresAt: string;
  employeeStatus: 'pending' | 'active' | 'deactivated';
}> {
  return authLookupInvite(token);
}



// ----------------------------------------------------------------------------
// Library — procedures
// ----------------------------------------------------------------------------

/** A URL name from a title: lower case, digits kept, and a number on the end
 *  when another procedure already has it. */
function uniqueSlug(title: string, exceptId?: string): string {
  const base =
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `procedure-${Date.now()}`;
  const taken = new Set(getProceduresStore().filter((p) => p.id !== exceptId).map((p) => p.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export async function createProcedure(input: CreateProcedureInput): Promise<{ procedure: Procedure }> {
  // Always live data — no mock fallback. The backend validates the full
  // payload; failures propagate so the editor shows them.
  const { createProcedure: apiCreate } = await import('@/services/library/api');
  const proc = await apiCreate(input);
  if (!proc) {
    throw new Error('Backend did not return created procedure');
  }
  mockProcedures = [proc, ...getProceduresStore().filter((p) => p.id !== proc.id && p.slug !== proc.slug)];
  setStored('procedures_v2', mockProcedures);
  clearLibraryListCache();
  return { procedure: proc };
}

export type UpdateProcedureInput = Partial<Omit<CreateProcedureInput, 'titleEn'>> & {
  titleEn?: string;
};

export async function updateProcedure(
  id: string,
  patch: UpdateProcedureInput,
): Promise<{ procedure: Procedure }> {
  // Always live data — PUT /:id with the whole body (the route validates
  // against the full create schema — partial bodies 400). Failures
  // propagate so the editor shows them instead of pretending the save
  // landed; no local-store fallback.
  const { updateProcedure: apiUpdate } = await import('@/services/library/api');
  const proc = await apiUpdate(id, patch);
  if (!proc) {
    throw new Error('Backend did not return updated procedure');
  }
  mockProcedures = [proc, ...getProceduresStore().filter((p) => p.id !== proc.id && p.slug !== proc.slug)];
  setStored('procedures_v2', mockProcedures);
  clearLibraryListCache();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('lms_procedures_updated'));
  return { procedure: proc };
}

export interface AccessLogEntry {
  procedureId: string;
  employeeId: string;
  employeeName: string;
  at: string;
  device: string;
}

/** Every open of a confidential or master recipe, admins included
 *  (PROJECT_OVERVIEW §04: "opening one is recorded in the same way as for any
 *  other user"). Called by the reading page once it is on screen, since the
 *  page itself is often rendered on the server. Mock: kept in the browser,
 *  newest first, capped. */
export function logRestrictedView(p: Procedure, viewer: Employee): void {
  if (typeof window === 'undefined') return;
  const log = getStored<AccessLogEntry[]>('access_log', []);
  const entry: AccessLogEntry = {
    procedureId: p.id,
    employeeId: viewer.id,
    employeeName: viewer.name,
    at: new Date().toISOString(),
    device: navigator.userAgent,
  };
  setStored('access_log', [entry, ...log].slice(0, 500));
}

export async function listAccessLog(): Promise<{ entries: AccessLogEntry[] }> {
  return { entries: getStored<AccessLogEntry[]>('access_log', []) };
}

const CLEARANCE_RANK: Record<ClearanceLevel, number> = { general: 0, station: 1, confidential: 2, master: 3 };

/**
 * Can this person open this procedure? The backend enforces the same rule in
 * the database (PROJECT_OVERVIEW §04: "a mistake in the interface cannot
 * expose the wrong data"); the mock enforces it where the backend would, in
 * the list and in the single lookup, so no screen has to remember to.
 *
 * Admins and managers read everything. Anyone else reads what is published,
 * not archived, meant for them (everyone, or one of the stations, roles or
 * people named), and within their clearance: a confidential recipe needs
 * confidential clearance, a master recipe needs master.
 */
export function canRead(p: Procedure, viewer: Employee): boolean {
  if (viewer.role === 'admin' || viewer.role === 'super_admin' || viewer.role === 'manager' || viewer.accessLevel === 'manager') return true;
  if (p.status !== 'published' || p.isArchived) return false;
  const a = p.audience;
  if (a && a.mode === 'some') {
    const meant =
      a.employeeIds.includes(viewer.id) ||
      a.stationIds.some((id) => viewer.stationIds.includes(id)) ||
      a.roleIds.some((id) => viewer.roleIds.includes(id));
    if (!meant) return false;
  }
  const needs: ClearanceLevel = p.protection === 'master' ? 'master' : p.protection === 'confidential' ? 'confidential' : 'general';
  return CLEARANCE_RANK[viewer.roleClearance ?? 'general'] >= CLEARANCE_RANK[needs];
}

// ----------------------------------------------------------------------------
// Server-side list cache (procedures & categories)
// ----------------------------------------------------------------------------
// Every server page (library, procedures browse, edit wizard, …) re-calls
// listProcedures on each request, so even a second look pays
// the full API round-trip. Server calls (the ones that carry a cookieHeader)
// are cached per session for a short TTL and concurrent loads are deduped —
// the same pattern fetchMe uses. Client calls (no cookieHeader) pass straight
// through: TanStack Query already caches there, and caching would also break
// the storage-event cross-tab freshness. Every mutation below clears the map —
// an edit must be visible to every session on the next request.

const LIST_CACHE_TTL_MS = 30_000;

const proceduresListCache = new Map<string, { data: Procedure[]; expiresAt: number }>();
const proceduresListInFlight = new Map<string, Promise<Procedure[]>>();

/** Drop every cached/in-flight list read. Called by each mutation so a saved
 *  change shows up on the very next request, not up to the TTL later. */
export function clearLibraryListCache(): void {
  proceduresListCache.clear();
  proceduresListInFlight.clear();
}

export async function listProcedures(
  filter: { status?: Procedure['status'] } = {},
  cookieHeader?: string,
): Promise<{ procedures: Procedure[] }> {
  // Client-side or cookieless: no shared cache.
  if (!cookieHeader) return { procedures: await loadProceduresList(filter, cookieHeader) };

  const cacheKey = `${cookieHeader}::${filter.status ?? '*'}`;
  const cached = proceduresListCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { procedures: cached.data };

  const inFlight = proceduresListInFlight.get(cacheKey);
  if (inFlight) return { procedures: await inFlight };

  const promise = loadProceduresList(filter, cookieHeader)
    .then((procedures) => {
      proceduresListCache.set(cacheKey, { data: procedures, expiresAt: Date.now() + LIST_CACHE_TTL_MS });
      return procedures;
    })
    .finally(() => proceduresListInFlight.delete(cacheKey));
  proceduresListInFlight.set(cacheKey, promise);
  return { procedures: await promise };
}

async function loadProceduresList(
  filter: { status?: Procedure['status'] },
  cookieHeader?: string,
): Promise<Procedure[]> {
  // Always live data — no mock fallback and no demo-row merge. The rows
  // and the viewer resolve together: canRead filtering is local, so
  // awaiting fetchMe after fetchProcedures wastes a full backend
  // round-trip on every procedure list.
  const { fetchProcedures } = await import('@/services/library/api');
  const [apiRes, { employee: viewer }] = await Promise.all([
    fetchProcedures({ status: filter.status }, false, cookieHeader),
    fetchMe(cookieHeader),
  ]);
  const dbProcs = apiRes.procedures || [];

  if (typeof window !== 'undefined') {
    // Persist what the API handed us so detail pages can paint instantly
    // via getCachedProcedure (and a fresh tab keeps it). Server truth
    // wins: rows the API didn't return are dropped from the mirror.
    mockProcedures = [...dbProcs];
    setStored('procedures_v2', mockProcedures);
  }
  const visible = dbProcs.filter((p) => canRead(p, viewer));
  const filtered = filter.status ? visible.filter((p) => p.status === filter.status) : visible;
  return filtered;
}

/** One procedure by id, for the editor. Always live — no mock fallback. */
export async function getProcedureById(id: string): Promise<{ procedure: Procedure }> {
  const { fetchProcedureById } = await import('@/services/library/api');
  const apiProc = await fetchProcedureById(id);
  if (!apiProc) throw new ApiException(404, 'NOT_FOUND', 'Procedure not found');
  return { procedure: apiProc };
}

/** Publishing rule (multi-station): a procedure may go live only when it
 *  knows where it works — at least one station in `stationIds`. General
 *  procedures carry EVERY station id (the wizard allocates them at save),
 *  so they pass naturally; an unplaced row (empty / null) stays a draft
 *  until someone places it. Legacy single-station shapes (stationScope /
 *  stationId) still resolve for rows created before the array landed. */
export function canPublishProcedure(p: Procedure): boolean {
  const ids = (p as { stationIds?: string[] | null }).stationIds;
  if (Array.isArray(ids)) return ids.length > 0;
  if (!p.category && !p.subcategoryId) return true;
  const scope = p.stationScope;
  if (scope && scope.mode === 'specific') return scope.stationIds.length > 0;
  const stationId = (p as { stationId?: string | null }).stationId;
  return Boolean(stationId);
}

/** Move a procedure through its states: draft -> published -> archived, and
 *  back. Publishing bumps the version, which the printed QR code points at.
 *
 *  Backend-backed rows go through the dedicated routes (POST /:id/publish,
 *  /:id/archive, /:id/unarchive); failures propagate so the UI can show
 *  them. Demo-only rows (non-UUID, never existed server-side) flip in the
 *  local mirror instead. */
export async function setProcedureState(
  id: string,
  change: { status?: Procedure['status']; isArchived?: boolean },
  context?: { row?: Procedure },
): Promise<Procedure> {
  if (change.status === 'published') {
    // Gate on the row the caller just showed the user when it has one: list
    // and detail screens hold freshly fetched data, while the mirrored store
    // copy can lag behind — a stale mirror would block publishes the UI just
    // verified, or wave unplaced rows through. The store stays as the
    // fallback for callers with no row in hand (demo/mock ids).
    const existing =
      context?.row ?? getProceduresStore().find((p) => p.id === id || p.slug === id);
    if (existing && !canPublishProcedure(existing)) {
      throw new ApiException(
        400,
        'PUBLISH_BLOCKED',
        'Only procedures with stations, or General procedures, can be published',
      );
    }
  }

  const { isUuid } = await import('@/services/library/api');
  if (!isUuid(id)) {
    // Demo-only row (never existed server-side): flip it in the local
    // mirror. Backend-backed rows always go through the API below.
    const now = new Date().toISOString();
    mockProcedures = getProceduresStore().map((p) =>
      p.id === id
        ? {
            ...p,
            ...change,
            updatedAt: now,
            version: change.status === 'published' && p.status !== 'published' ? (p.version ?? 0) + 1 : p.version,
          }
        : p,
    );
    setStored('procedures_v2', mockProcedures);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('lms_procedures_updated'));
    clearLibraryListCache();
    const updated = mockProcedures.find((p) => p.id === id);
    if (!updated) throw new ApiException(404, 'NOT_FOUND', 'Procedure not found');
    return updated;
  }

  // Backend-backed row: dedicated routes, failures propagate (no silent
  // local flip — a failed archive must never render as archived).
  const { archiveProcedure, unarchiveProcedure, publishProcedure } = await import('@/services/library/api');
  let updated: Procedure;
  if (change.isArchived !== undefined) {
    updated = change.isArchived ? await archiveProcedure(id) : await unarchiveProcedure(id);
  } else if (change.status === 'published') {
    updated = await publishProcedure(id);
  } else {
    throw new ApiException(400, 'INVALID_INPUT', 'Nothing to update');
  }
  mockProcedures = getProceduresStore().map((p) =>
    p.id === id || p.slug === id ? { ...updated, id: p.id } : p,
  );
  setStored('procedures_v2', mockProcedures);
  clearLibraryListCache();
  return { ...updated, id };
}

export async function deleteProcedure(id: string): Promise<{ ok: true }> {
  // Live backend first: DELETE /api/v1/procedures/:id (super_admin,
  // permanent). A backend 404 means the row is already gone server-side,
  // so the local mirror is still dropped to converge with that truth.
  // Rows that live only on this device (non-UUID demo ids the backend
  // will never know) are removed locally instead.
  const { isUuid, deleteProcedure: apiDelete } = await import('@/services/library/api');
  if (isUuid(id)) {
    try {
      await apiDelete(id);
    } catch (err) {
      if (!(err instanceof ApiException) || err.status !== 404) throw err;
    }
  }
  const procs = getProceduresStore();
  mockProcedures = procs.filter((p) => p.id !== id && p.slug !== id);
  setStored('procedures_v2', mockProcedures);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('lms_procedures_updated'));
  clearLibraryListCache();
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Library — quizzes (centralised table)
// ----------------------------------------------------------------------------

function normalizeQuiz(raw: any): Quiz {
  const rawQuestions = Array.isArray(raw?.questions) ? raw.questions : [];
  const questions = rawQuestions.map((q: any) => {
    const promptText = q.prompt ?? q.question ?? { en: '', es: '' };
    return {
      id: q.id || `q-${Math.random().toString(36).slice(2, 7)}`,
      prompt: promptText,
      question: promptText,
      choices: (q.choices ?? []).map((c: any) => ({
        id: c.id,
        label: c.label ?? { en: '', es: '' },
      })),
      correctChoiceId: q.correctChoiceId ?? '',
    };
  });

  return {
    id: raw.id || raw._id || `quiz-${Date.now()}`,
    nameEn: raw.nameEn || '',
    nameEs: raw.nameEs || '',
    quizType: raw.quizType || 'procedure',
    questions,
    attached: raw.attached ?? true,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

/** Look up every quiz in the centralised store / backend API.
 *  Uses GET /api/v1/quizzes and keeps local cache in sync. */
export async function listQuizzes(): Promise<{ quizzes: Quiz[] }> {
  try {
    const res = await http.get<any>('/api/v1/quizzes');
    const raw = res.data?.data ?? res.data;
    const items = Array.isArray(raw) ? raw : (raw?.quizzes ?? []);
    if (Array.isArray(items) && items.length > 0) {
      const normalized = items.map(normalizeQuiz);
      normalized.forEach((q) => {
        const store = getQuizzesStore();
        const existingIdx = store.findIndex((s) => s.id === q.id);
        if (existingIdx !== -1) {
          store[existingIdx] = q;
        } else {
          store.unshift(q);
        }
        setStored('quizzes', store);
      });
      return { quizzes: normalized };
    }
  } catch (err) {
    console.warn('listQuizzes API call failed, using store fallback:', err);
  }
  return { quizzes: [...getQuizzesStore()] };
}

/** Fetch a single quiz from GET /api/v1/quizzes/:id and cache it locally. */
export async function fetchQuizById(id: string): Promise<Quiz | null> {
  if (!id) return null;
  try {
    const res = await http.get<any>(`/api/v1/quizzes/${id}`);
    const raw = res.data?.data?.quiz ?? res.data?.data ?? res.data;
    if (raw && (raw.id || raw.questions)) {
      const q = normalizeQuiz(raw);
      const store = getQuizzesStore();
      const idx = store.findIndex((s) => s.id === q.id);
      if (idx !== -1) {
        store[idx] = q;
      } else {
        store.unshift(q);
      }
      setStored('quizzes', store);
      return q;
    }
  } catch (err) {
    console.warn(`fetchQuizById(${id}) API call failed, using cached fallback:`, err);
  }
  return getQuizById(id);
}

/** Sync lookup for a single quiz by id from the cached store. */
export function getQuizById(id: string | null): Quiz | null {
  if (!id) return null;
  return getQuizzesStore().find((q) => q.id === id) ?? null;
}

/** Create a quiz via POST /api/v1/quizzes.
 *  Payload matches: { nameEn, nameEs, quizType, questions: [...] } */
export async function createQuiz(input: {
  nameEn?: string;
  nameEs?: string;
  quizType?: string;
  questions: Quiz['questions'];
  attached?: boolean;
}): Promise<{ quiz: Quiz }> {
  const payload = {
    nameEn: input.nameEn || 'Procedure Quiz',
    nameEs: input.nameEs || 'Cuestionario de Procedimiento',
    quizType: input.quizType || 'procedure',
    questions: input.questions.map((q) => ({
      id: q.id,
      question: q.question ?? q.prompt,
      choices: q.choices,
      correctChoiceId: q.correctChoiceId,
    })),
  };

  try {
    const res = await http.post<any>('/api/v1/quizzes', payload);
    const raw = res.data?.data?.quiz ?? res.data?.data ?? res.data;
    if (raw && (raw.id || raw.questions)) {
      const created = normalizeQuiz({ ...raw, attached: input.attached ?? true });
      const store = getQuizzesStore();
      store.unshift(created);
      setStored('quizzes', store);
      return { quiz: created };
    }
  } catch (err) {
    console.warn('createQuiz API call failed, saving to local store:', err);
  }

  const now = new Date().toISOString();
  const fallbackQuiz: Quiz = {
    id: `quiz-${Date.now()}`,
    nameEn: payload.nameEn,
    nameEs: payload.nameEs,
    quizType: payload.quizType,
    questions: input.questions,
    attached: input.attached ?? true,
    createdAt: now,
    updatedAt: now,
  };
  mockQuizzes = [fallbackQuiz, ...getQuizzesStore()];
  setStored('quizzes', mockQuizzes);
  return { quiz: fallbackQuiz };
}

/** Patch/update a quiz. Calls PATCH /api/v1/quizzes/:id if available,
 *  and updates local store. */
export async function updateQuiz(
  id: string,
  patch: Partial<Pick<Quiz, 'attached' | 'questions' | 'nameEn' | 'nameEs'>>,
): Promise<{ quiz: Quiz }> {
  try {
    const patchPayload: Record<string, any> = {};
    if (patch.nameEn) patchPayload.nameEn = patch.nameEn;
    if (patch.nameEs) patchPayload.nameEs = patch.nameEs;
    if (patch.questions) {
      patchPayload.questions = patch.questions.map((q) => ({
        id: q.id,
        question: q.question ?? q.prompt,
        choices: q.choices,
        correctChoiceId: q.correctChoiceId,
      }));
    }
    const res = await http.patch<any>(`/api/v1/quizzes/${id}`, patchPayload);
    const raw = res.data?.data?.quiz ?? res.data?.data ?? res.data;
    if (raw && (raw.id || raw.questions)) {
      const updated = normalizeQuiz({ ...raw, attached: patch.attached ?? true });
      const store = getQuizzesStore();
      const idx = store.findIndex((s) => s.id === id);
      if (idx !== -1) store[idx] = updated;
      else store.unshift(updated);
      setStored('quizzes', store);
      return { quiz: updated };
    }
  } catch (err) {
    console.warn(`updateQuiz(${id}) API call failed, updating local store:`, err);
  }

  const store = getQuizzesStore();
  const idx = store.findIndex((q) => q.id === id);
  if (idx === -1) {
    throw new ApiException(404, 'NOT_FOUND', `Quiz ${id} not found`);
  }
  const updated: Quiz = {
    ...store[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  const next = [...store];
  next[idx] = updated;
  mockQuizzes = next;
  setStored('quizzes', mockQuizzes);
  return { quiz: updated };
}

export async function getProcedureBySlug(
  slug: string,
  cookieHeader?: string,
): Promise<{ procedure: Procedure }> {
  // Always live data — no mock fallback. A miss is a real 404.
  const { fetchProcedureById } = await import('@/services/library/api');
  const apiProc = await fetchProcedureById(slug, false, cookieHeader);
  if (!apiProc) {
    throw new ApiException(404, 'PROCEDURE_NOT_FOUND', `Procedure ${slug} not found`);
  }
  const { employee: viewer } = await fetchMe(cookieHeader);
  // Not cleared reads exactly as not there: the cook is not told it exists.
  if (!canRead(apiProc, viewer)) {
    throw new ApiException(404, 'PROCEDURE_NOT_FOUND', `Procedure ${slug} not found`);
  }
  return { procedure: apiProc };
}

/** The procedure as cached on this device (the procedures list keeps
 *  every fetched procedure in localStorage), matched by slug or id.
 *  Returns null when absent — callers must still apply `canRead` and
 *  refresh from the API; this is a first paint, not the source of
 *  truth. */
export function getCachedProcedure(slugOrId: string): Procedure | null {
  const norm = slugOrId.toLowerCase();
  return (
    getProceduresStore().find(
      (p) => p.slug.toLowerCase() === norm || p.id.toLowerCase() === norm,
    ) ?? null
  );
}

// ----------------------------------------------------------------------------
// Library — categories: live backend only.
// Reads go through `services/categories/api.ts → fetchBackendCategories`
// (GET /api/v1/categories) and writes through the category hooks
// (create → POST /, rename → PATCH /:id, archive → POST /:id/archive,
// unarchive → POST /:id/unarchive). No mock store on this path.
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Uploads & AI Import (Mock Presigned Uploads)
// ----------------------------------------------------------------------------

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

export async function requestImageUpload(
  input: { filename: string; contentType: string; size: number },
  _cookieHeader?: string,
): Promise<PresignedUpload> {
  try {
    const res = await http.post<{ success: boolean; data: PresignedUpload } | PresignedUpload>(
      '/api/v1/uploads/image',
      input,
    );
    const data = (res.data as any)?.data ?? res.data;
    if (data && data.uploadUrl) return data;
  } catch (err) {
    console.warn('requestImageUpload API call failed, falling back to mock:', err);
  }

  return {
    uploadUrl: 'mock-upload',
    key: `images/${Date.now()}-${input.filename}`,
    publicUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    expiresIn: 3600,
  };
}

export async function requestVideoUpload(
  input: { filename: string; contentType: string; size: number },
  _cookieHeader?: string,
): Promise<PresignedUpload> {
  try {
    const res = await http.post<{ success: boolean; data: PresignedUpload } | PresignedUpload>(
      '/api/v1/uploads/video',
      input,
    );
    const data = (res.data as any)?.data ?? res.data;
    if (data && data.uploadUrl) return data;
  } catch (err) {
    console.warn('requestVideoUpload API call failed, falling back to mock:', err);
  }

  return {
    uploadUrl: 'mock-upload',
    key: `videos/${Date.now()}-${input.filename}`,
    publicUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    expiresIn: 3600,
  };
}

export async function requestDocumentUpload(
  input: { filename: string; contentType: string; size: number },
  _cookieHeader?: string,
): Promise<PresignedUpload> {
  try {
    const res = await http.post<{ success: boolean; data: PresignedUpload } | PresignedUpload>(
      '/api/v1/uploads/document',
      input,
    );
    const data = (res.data as any)?.data ?? res.data;
    if (data && data.uploadUrl) return data;
  } catch (err) {
    console.warn('requestDocumentUpload API call failed, falling back to mock:', err);
  }
  return {
    uploadUrl: 'mock-upload',
    key: `documents/${Date.now()}-${input.filename}`,
    publicUrl: `/uploads/${input.filename}`,
    expiresIn: 3600,
  };
}

export async function uploadAsset(
  file: File | Blob,
  filename?: string,
): Promise<{ url: string; key?: string }> {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append('file', file);
  } else {
    formData.append('file', file, filename || 'file');
  }

  const res = await http.post<any>('/api/v1/uploads', formData);
  const data = res.data?.data?.data ?? res.data?.data ?? res.data;
  const url =
    data?.publicUrl ?? data?.url ?? data?.fileUrl ?? data?.src ?? (typeof data === 'string' ? data : '');
  return { url, key: data?.key };
}

/** Unified upload helper for frontend components.
 *  Uses Direct Multipart Upload (POST /api/v1/uploads) and falls back to presign flow. */
export async function uploadMedia(
  file: File,
  fallbackType: 'image' | 'video' | 'document' = 'image',
): Promise<string> {
  try {
    const direct = await uploadAsset(file);
    if (direct?.url) return direct.url;
  } catch (err) {
    console.warn('Direct upload to /api/v1/uploads failed, trying presign:', err);
  }

  try {
    const meta = { filename: file.name, contentType: file.type, size: file.size };
    const presigned =
      fallbackType === 'video'
        ? await requestVideoUpload(meta)
        : fallbackType === 'document'
        ? await requestDocumentUpload(meta)
        : await requestImageUpload(meta);

    if (presigned?.uploadUrl && presigned.uploadUrl !== 'mock-upload') {
      await uploadToR2(presigned.uploadUrl, file, file.type);
      if (presigned.publicUrl && !presigned.publicUrl.includes('unsplash.com')) {
        return presigned.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Presign upload failed:', err);
  }

  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|avif|bmp|jfif)$/i.test(file.name)) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  return '';
}

export async function uploadToR2(
  uploadUrl: string,
  file: Blob,
  contentType: string,
): Promise<void> {
  if (uploadUrl && uploadUrl !== 'mock-upload') {
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
  }
}

export async function deleteUpload(input: { url: string }): Promise<{ ok: boolean }> {
  try {
    const res = await http.delete<any>('/api/v1/uploads', { data: input });
    return res.data?.data ?? res.data ?? { ok: true };
  } catch (err) {
    console.warn('deleteUpload API error:', err);
    return { ok: true };
  }
}

// ----------------------------------------------------------------------------
// Active Season (Summer / Winter toggle)
// ----------------------------------------------------------------------------

export function getActiveSeason(): ActiveSeason {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('lms_active_season') || localStorage.getItem('lms_demo_active_season');
    if (!raw) return null;
    const parsed = raw.startsWith('"') ? JSON.parse(raw) : raw;
    return parsed === 'summer' || parsed === 'winter' ? parsed : null;
  } catch {
    return null;
  }
}

export function setActiveSeason(season: ActiveSeason): void {
  if (typeof window === 'undefined') return;
  try {
    if (season) {
      localStorage.setItem('lms_active_season', season);
      setStored('active_season', season);
    } else {
      localStorage.removeItem('lms_active_season');
      localStorage.removeItem('lms_demo_active_season');
    }
    window.dispatchEvent(new Event('lms_active_season_updated'));
  } catch {
    // Ignore storage errors
  }
}
