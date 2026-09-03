<template>
  <section
    class="container-fluid flex items-center justify-between gap-4 bg-secondary print:hidden"
  >
    <Btn tertiary :icon="ArrowLeftIcon" @click="onclickNavigate">
      <img
        src="/images/logo.png"
        class="h-auto w-6 object-contain"
        :alt="t('AltAttributes.BootstrapAcademyLogo')"
      />

      {{ t(backRoute.label) }}
    </Btn>

    <div id="navbar-back-end"></div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ArrowLeftIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

export default defineComponent({
  components: { ArrowLeftIcon },
  setup() {
    const { t } = useI18n();

    const router = useRouter();
    const route = useRoute();

    function hasHistory() {
      return window.history.length > 2;
    }
    function onclickNavigate() {
      if (!!!backRoute.value.pathname) {
        console.log("jas history", hasHistory());
        hasHistory() ? router.go(-1) : router.push("/");
      } else {
        router.push(backRoute.value.pathname);
      }
    }

    const backRoute = computed(() => {
      let pathname = "/";
      let label = "Links.GoBack";

      let name = route.name;
      console.log("name", name);
      // ! Auth
      if (name == "auth-signup" || name == "auth-forgot-password") {
        pathname = "/auth/login";
        label = "Links.Login";
      } else if (name == "auth-verify-account") {
        pathname = "/auth/login";
        label = "Links.GoBack";
      } else if (name == "auth-reset-password") {
        pathname = "/auth/forgot-password";
        label = "Links.ForgotPassword";
      } else if (name == "auth-login") {
        pathname = "/";
        label = "Links.Home";
      }
      // ! MFA
      else if (
        name == "account-mfa-disabled" ||
        name == "account-mfa-enable" ||
        name == "account-mfa-initialize"
      ) {
        pathname = "/profile";
        label = "Links.GoToProfile";
      }
      // profile-quizzes
      else if (name == "profile-quizzes") {
        pathname = "/profile";
        label = "Links.GoToProfile";
      }
      // profile-challenges
      else if (name == "profile-challenges") {
        pathname = "/profile";
        label = "Links.GoToProfile";
      }
      // challenges-leader-board
      else if (name == "challenges-leader-board") {
        pathname = "/profile";
        label = "Links.GoToProfile";
      }
      // ! Profile
      else if (name == "profile-edit") {
        pathname = "/profile";
        label = "Links.GoToProfile";
      }
      // ! Morphcoins
      else if (name == "morphcoins-paypal") {
        pathname = "/morphcoins/buy";
        label = "Links.GoBack";
      }
      // ! Courses
      else if (name == "profile-courses") {
        pathname = "/profile";
        label = "Links.GoToProfile";
      }
      // ! Challenges
      else if (name == "challenges-category-create") {
        pathname = `/challenges/all?category=${route?.params?.category ?? ""}`;
        label = "Links.GoToChallenges";
      }
      // edit challenge
      else if (name == "challenges-edit-challenge") {
        pathname = `/challenges/all?category=${route?.query.category ?? ""}`;
        label = "Links.GoToChallenges";
      }
      // solve coding challenge
      else if (name == "challenges-category-challenge") {
        pathname = `/challenges/all?category=${
          route?.params?.category ?? ""
        }&challenge=${route?.params?.challenge ?? ""}`;
        label = "Links.GoToChallenges";
      } else if (name == "challenges-QuizCodingChallenge-challenge") {
        pathname = ``;
        label = "Links.GoToCourse";
      }

      //create subtask for course
      else if (name == "quizzes-skill-subSkill-create") {
        console.log("going back");
        pathname = `/courses/${route.query?.course ?? ""}/watch?section=${
          route.query?.section ?? ""
        }&lecture=${route.query?.lecture ?? ""}&skillID=${
          route.query?.skillID ?? ""
        }&subSkillID=${route.query?.subSkillID ?? ""}`;
        label = "Links.GoToCourse";
      }

      return {
        pathname,
        label,
      };
    });

    return { ArrowLeftIcon, t, onclickNavigate, backRoute };
  },
});
</script>

<style scoped></style>
