export const useXP = () => useState('xp', (): any => null);
import { useUser } from "./user";
export async function getXP() {
  const user = <any>useUser();

  try {
    if (!!!user.value || !!!user.value.id) {
      throw { data: { detail: 'Missing user id' } };
    }

    const response = await GET(`/skills/xp/${user.value.id}`);

    const xp = useXP();
    xp.value = response;
    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

const skillsProgress = computed(() => {
  const xp = useXP();
  return xp?.value?.skills ?? [];
});

export const activeSkillsProgress = computed(() => {
  return skillsProgress.value.filter((skill: any) => skill.progress > 0);
});

export const completedSkillsProgress = computed(() => {
  return skillsProgress.value.filter((skill: any) => skill.progress == 100);
});
