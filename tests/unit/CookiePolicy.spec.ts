import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { ref, nextTick } from 'vue';
import CookiePolicy from '../../components/CookiePolicy.vue'

// Types für Nuxt Runtime Helpers
interface RuntimeConfig {
  public: {
    Gleap_API_KEY: string;
  };
}

interface Cookie<T> {
  value: T;
}

interface Route {
  name: string;
}

// Declare global variables as 'var' at module scope
var useRuntimeConfig: () => RuntimeConfig;
var useCookie: () => Cookie<boolean>;
var useRoute: () => Route;

// Mocks, damit Komponente im Test läuft
vi.mock('gleap', () => ({ default: { initialize: vi.fn() } })) // Externes SDK im Test stumm schalten
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

// Nuxt runtime config im Test bereitstellen
useRuntimeConfig = vi.fn(() => ({ public: { Gleap_API_KEY: 'test' } } as RuntimeConfig));
useCookie = vi.fn(() => ({ value: false } as Cookie<boolean>));     // Cookie=false für diesen Test
useRoute = vi.fn(() => ({ name: 'home' } as Route));               // Route global

// Kind-Komponenten stubs
const stubs = {
  Modal:   { template: '<div role="dialog" aria-modal="true"><slot/></div>' },
  // emits Click nach außen, damit <Btn @click="…"> auslöst
  Btn:     { template: '<button type="button"> @click="$emit(\'click\')"><slot/></button>' },
  NuxtLink:{ template: '<a href="#"><slot/></a>' },
}

// Test 1: zeigt Dialog, wenn kein Cookie gesetzt
describe('CookiePolicy – Basis', () => {
  it('rendert den Dialog, wenn Cookie=false', () => {
    const wrapper = mount(CookiePolicy, {
      global: {stubs}
    })

    // Erwartung: Dialog vorhanden
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    // Erwartung: ARIA-IDs vorhanden
    expect(wrapper.find('#cookie-dialog-title').exists()).toBe(true)
    expect(wrapper.find('#cookie-dialog-description').exists()).toBe(true)
  })
})

// Test 2:
it('Klick auf Button setzt Cookie=true und blendet Dialog aus', async () => {
  // Reactives Cookie-Ref
  const cookieRef = ref(false)
  vi.stubGlobal('useCookie', () => cookieRef)
  vi.stubGlobal('useRoute', () => ({ name: 'home' }))

  // Komponente mounten (Stubs oben definiert)
  const wrapper = mount(CookiePolicy, { global: { stubs } })

  // Sicherheitscheck: Dialog ist da
  expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

  // Button klicken
  await wrapper.find('button').trigger('click')
  await nextTick() // auf nächste Vue-Render-Phase warten


  // Erwartung: Cookie gesetzt, Dialog weg
  expect(cookieRef.value).toBe(true)
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
})

// Test 3: zeigt Dialog nicht an, wenn Cookie=true
it('blendet den Dialog aus, wenn Cookie=true', () => {
  const cookieRef = ref(true)
  vi.stubGlobal('useCookie', () => cookieRef)
  vi.stubGlobal('useRoute', () => ({ name: 'home' }))

  const wrapper = mount(CookiePolicy, {
    global: { stubs }
  })
  // Erwartung: Dialog nicht vorhanden
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
})

// Test 4: zeigt Dialog nicht auf Datenschutz-Seite /docs/privacy an
it('blendet den Dialog auf der Datenschutz-Seite aus', () => {
  const cookieRef = ref(false)
  vi.stubGlobal('useCookie', () => cookieRef)
  vi.stubGlobal('useRoute', () => ({ name: 'docs-privacy' }))

  const wrapper = mount(CookiePolicy, {
    global: { stubs }
  })

  // Erwartung: Dialog nicht vorhanden
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
})