<template>
  <form
    class="flex flex-col gap-box"
    :class="{ 'form-submitting': form.submitting }"
    @submit.prevent="onclickSubmitForm()"
    ref="refForm"
  >
    <Input
      :label="t('Inputs.Title')"
      v-model="form.title.value"
      @valid="form.title.valid = $event"
      :rules="form.title.rules"
    />

    <InputSelect
      v-if="!!!data && categoryOptions?.length"
      :label="t('Inputs.Category')"
      id="select-category"
      :options="categoryOptions"
      :model-value="form.category.value"
      @update:model-value="setCategory"
    />

    <InputTextarea
      label="Inputs.Description"
      v-model="form.description.value"
      @valid="form.description.valid = $event"
      :rules="form.description.rules"
    />
    <!-- 
    <InputList
      :label="t('Inputs.Limits')"
      v-model="form.limits.value"
      @valid="form.limits.valid = $event"
      :rules="form.limits.rules"
      :max="10"
    /> -->

    <InputList
      :label="t('Inputs.Skills')"
      v-model="form.skills.value"
      @valid="form.skills.valid = $event"
      :rules="form.skills.rules"
      :max="8"
    />

    <!-- <ChallengesInputExamples
			:label="t('Inputs.Examples')"
			v-model="form.examples.value"
			@valid="form.examples.valid = $event"
			:rules="form.examples.rules"
			:max="10"
		/> -->

    <article class="flex justify-end items-center gap-x-3 flex-wrap">
      <InputBtn
        :icon="TrashIcon"
        @click="fnDeleteChallenge()"
        v-if="user.id == data?.creator && !!data"
      >
        {{ t("Buttons.DeleteChallenge") }}
      </InputBtn>

      <InputBtn :loading="form.submitting" @click="onclickSubmitForm()">
        <span v-if="!!data">
          {{ t("Buttons.UpdateChallenge") }}
        </span>

        <span v-else>
          {{ t("Buttons.CreateChallenge") }}
        </span>
      </InputBtn>
    </article>
  </form>
</template>

<script lang="ts">
import { TrashIcon } from "@heroicons/vue/24/outline";
import { defineComponent, PropType, ref } from "vue";
import { useI18n } from "vue-i18n";
import { IForm } from "~/types/form";
import { useUser } from "~~/composables/user";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  components: { TrashIcon },
  setup(props) {
    const { t } = useI18n();
    const route = useRoute();
    const router = useRouter();
    const user: any = useUser();

    // ============================================================= Handling Categories
    const challengesCategories = useChallengesCategories();
    const loading = ref(challengesCategories.value.length <= 0);

    const categoryOptions = computed(() => {
      // return (challengesCategories.value ?? [])
      // 	.filter((c) => {
      // 		let points = c?.points?.current ?? 0;
      // 		return points >= 100;
      // 	})
      // 	.map((c) => {
      // 		return { label: c.title, value: c.id };
      // 	});

      return (challengesCategories.value ?? []).map((c) => {
        return { label: c.title, value: c.id };
      });
    });

    function setCategory(categoryID: string) {
      console.log("setting", props?.data);
      form.category.value = categoryID;
      let includes = route.fullPath.includes("/challenges/edit-");
      if (!includes) router.replace(`/challenges/${categoryID}/create`);
    }

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= reactive
    const form = reactive<IForm>({
      title: {
        value: "",
        valid: false,
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.Title",
          (v: string) => v.length >= 3 || "Error.InputMinLength_3",
          (v: string) => v.length <= 32 || "Error.InputMinLength_32",
        ],
      },
      category: {
        value: route?.params?.category ?? "",
        valid: true,
        options: [],
      },
      //   limits: {
      //     value: [],
      //     valid: false,
      //     rules: [],
      //   },
      skills: {
        value: [],
        valid: false,
        rules: [],
      },
      //   examples: {
      //     value: [],
      //     valid: false,
      //     rules: [],
      //   },
      description: {
        valid: false,
        value: "",
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.Description",
          (v: string) => v.length >= 10 || "Error.InputMinLength_10",
          (v: string) => v.length <= 4096 || "Error.InputMaxLength_4096",
        ],
      },
      submitting: false,
      validate: () => {
        let isValid = true;

        for (const key in form) {
          if (
            key != "validate" &&
            key != "body" &&
            key != "submitting" &&
            !form[key].valid
          ) {
            console.log(key);

            isValid = false;
          }
        }

        if (refForm.value) refForm.value.reportValidity();
        return isValid;
      },
      body: () => {
        let obj: any = {};
        for (const key in form) {
          if (key != "validate" && key != "body" && key != "submitting")
            obj[key] = form[key].value;
        }
        return obj;
      },
    });

    // ============================================================= functions
    async function onclickSubmitForm() {
      if (form.validate()) {
        if (!!props?.data) fnEditChallenge();
        else fnCreateChallenge();
      } else {
        openSnackbar("error", "Error.InvalidForm");
      }
    }

    async function fnCreateChallenge() {
      form.submitting = true;
      const [success, error] = await createChallenge(form.category.value, {
        title: form.title.value,
        description: form.description.value,
        skills: form.skills.value,
      });
      form.submitting = false;
      success ? createSuccessHandler(success) : errorHandler(error);
    }

    async function fnEditChallenge() {
      form.submitting = true;
      const [success, error] = await updateChallenge(
        props?.data.category,
        props.data.id,
        {
          title: form.title.value,
          description: form.description.value,
          skills: form.skills.value,
        }
      );
      form.submitting = false;
      success ? editSuccessHandler(success) : errorHandler(error);
    }

    function createSuccessHandler(res: any) {
      router.push(
        `/challenges/edit-${res.id}?categoryId=${form.category.value}`
      );
      setTimeout(() => {
        openSnackbar("success", "Success.CreatedChallenge");
      }, 1000);
    }

    function editSuccessHandler(res: any) {
      openSnackbar("success", "Success.EditedChallenge");
    }

    function errorHandler(res: any) {
      openSnackbar("error", res?.detail ?? "");
    }

    function fnDeleteChallenge() {
      openDialog(
        "warning",
        "Headings.DeleteChallenge",
        "Body.DeleteChallenge",
        false,
        {
          label: "Buttons.DeleteChallenge",
          onclick: async () => {
            const [success, error] = await deleteChallenge(
              props.data?.category,
              props.data?.id
            );
            if (!!success) openSnackbar("success", "Success.DeletedChallenge");
            router.push(`/challenges/all?categoryId=${form.category.value}`); // await getChallengesByCategory(baseQuery.value.category);
          },
        },
        {
          label: "Buttons.Cancel",
          onclick: () => {},
        }
      );
      console.log("delete");
    }
    function setFormData() {
      if (props.data != null) {
        form.title.value = props?.data?.title ?? "";
        form.description.value = props?.data?.description ?? "";
        form.skills.value = props?.data?.skills ?? "";

        form.title.valid = props?.data.title.trim() != "" ? true : false;
        form.description.valid =
          props?.data.description.trim() != "" ? true : false;
        form.skills.valid = props?.data.skills.length > 0 ? true : false;
        form.category.valid = true;
      }
    }

    // ============================================================= Handling Form State
    watch(
      () => form,
      (newValue, oldValue) => {
        if (!!!localStorage) return;

        localStorage.setItem(
          "form",
          JSON.stringify({
            title: newValue?.title?.value ?? "",
            description: newValue?.description?.value ?? "",
            skills: newValue?.skills?.value ?? [],
            limits: newValue?.limits?.value ?? [],
            examples: newValue?.examples?.value ?? [],
          })
        );
      },
      { deep: true }
    );

    watch(
      () => props.data,
      () => {
        setFormData();
      },
      { deep: true }
    );

    onMounted(async () => {
      // if (!!localStorage) {
      //   const localForm = JSON.parse(localStorage?.getItem("form") ?? "null");

      //   if (!!localForm) {
      //     if (!!localForm.title) {
      //       form.title.value = localForm.title;
      //       form.title.valid = !!form.title.value;
      //     }

      //     form.category.value = route.params?.category ?? "";
      //     form.category.valid = !!form.category.value;

      //     if (!!localForm.description) {
      //       form.description.value = localForm.description;
      //       form.description.valid = !!form.description.value;
      //     }

      //     //   if (!!localForm.limits) {
      //     //     form.limits.value = localForm.limits;
      //     //     form.limits.valid =
      //     //       form.limits.value && form.limits.value.length > 0;
      //     //   }

      //     if (!!localForm.skills) {
      //       form.skills.value = localForm.skills;
      //       form.skills.valid =
      //         form.skills.value && form.skills.value.length > 0;
      //     }

      //     //   if (!!localForm.examples) {
      //     //     form.examples.value = localForm.examples;
      //     //     form.examples.valid =
      //     //       form.examples.value && form.examples.value.length > 0;
      //     //   }
      //   }
      // }

      if (props?.data != null) setFormData();
      if (props?.data == null) await getChallengesCategories();
      loading.value = false;
    });

    return {
      form,
      onclickSubmitForm,
      refForm,
      t,
      categoryOptions,
      setCategory,
      fnDeleteChallenge,
      user,
    };
  },
});
</script>

<style scoped></style>
