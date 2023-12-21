export const useUnratedWebinars = () => useState('unratedWebinars', () => []);

export async function getUnratedWebinars() {
  try {
    const response = await GET(`/events/unrated`);

    const unratedWebinars = useUnratedWebinars();
    unratedWebinars.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function submitWebinarRating(id: string, rating: number) {
  try {
    const response = await POST(`/events/rate/${id}`, <any>{ rating });

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function cancelWebinarRating(id: string) {
  try {
    const response = await DELETE(`/events/rate/${id}`);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
