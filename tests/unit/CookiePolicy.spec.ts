import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import CookiePolicy from "../../components/CookiePolicy.vue";

// Types for Nuxt Runtime Helpers
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

// Mocks to run components in test
vi.mock("gleap", () => ({ default: { initialize: vi.fn() } })); // Externes SDK im Test stumm schalten
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (k: string) => k }) }));

// Deploy Nuxt runtime config in test
vi.stubGlobal(
  "useRuntimeConfig",
  vi.fn(() => ({ public: { Gleap_API_KEY: "test" } }) as RuntimeConfig)
);
vi.stubGlobal("useCookie", vi.fn(() => ref(false)) as any);
vi.stubGlobal(
  "useRoute",
  vi.fn(() => ({ name: "home" }) as Route)
);

// child-components stubs
const stubs = {
  Modal: { template: '<div role="dialog" aria-modal="true"><slot/></div>' },
  // emits Click nach außen, damit <Btn @click="…"> auslöst
  Btn: { template: '<button type="button"> @click="$emit(\'click\')"><slot/></button>' },
  NuxtLink: { template: '<a href="#"><slot/></a>' },
};

// Test 1: displays dialogue if no cookie is set
describe("CookiePolicy – Basis", () => {
  it("rendert den Dialog, wenn Cookie=false", () => {
    const wrapper = mount(CookiePolicy, {
      global: { stubs },
    });

    // Exp: Dialogue available
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    // Exp: ARIA-IDs available
    expect(wrapper.find("#cookie-dialog-title").exists()).toBe(true);
    expect(wrapper.find("#cookie-dialog-description").exists()).toBe(true);
  });
});

// Test 2:
it("Klick auf Button setzt Cookie=true und blendet Dialog aus", async () => {
  // Reactives Cookie-Ref
  const cookieRef = ref(false);
  vi.stubGlobal("useCookie", () => cookieRef);
  vi.stubGlobal("useRoute", () => ({ name: "home" }));

  // mount component
  const wrapper = mount(CookiePolicy, { global: { stubs } });

  // Security check: Dialogue is here
  expect(wrapper.find('[role="dialog"]').exists()).toBe(true);

  // Button click
  await wrapper.find("button").trigger("click");
  await nextTick(); // wait for next Vue render phase

  // Exp: Cookie set, dialogue gone
  expect(cookieRef.value).toBe(true);
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
});

// Test 3: no display dialogue if cookie=true
it("blendet den Dialog aus, wenn Cookie=true", () => {
  const cookieRef = ref(true);
  vi.stubGlobal("useCookie", () => cookieRef);
  vi.stubGlobal("useRoute", () => ({ name: "home" }));

  const wrapper = mount(CookiePolicy, {
    global: { stubs },
  });
  // Exp: dialogue not available
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
});

// Test 4: no display dialogue on privacy page
it("blendet den Dialog auf der Datenschutz-Seite aus", () => {
  const cookieRef = ref(false);
  vi.stubGlobal("useCookie", () => cookieRef);
  vi.stubGlobal("useRoute", () => ({ name: "docs-privacy" }));

  const wrapper = mount(CookiePolicy, {
    global: { stubs },
  });

  // Exp: dialogue not available
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
});
