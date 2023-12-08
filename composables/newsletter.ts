export async function requestNewsletterRegistration() {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;

  try {
    if (!!!user_id) {
      throw { data: 'Invalid User Id' };
    }

    const response = await PATCH(`/auth/users/${user_id}`, <any>{
      newsletter: true,
    });

    const user = <any>useUser();
    const cookie_user = useCookie('user');
    user.value = response ?? null;
    cookie_user.value = user.value;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function registerForNewsletter(body: any) {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;

  try {
    if (!!!user_id) {
      throw { data: 'Invalid User Id' };
    }

    const response = await PUT(`/auth/users/${user_id}/newsletter`, body);

    const user = <any>useUser();
    const cookie_user = useCookie('user');
    user.value = response ?? null;
    cookie_user.value = user.value;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function unregisterFromNewsletter() {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;

  try {
    if (!!!user_id) {
      throw { data: 'Invalid User Id' };
    }

    const response = await PATCH(`/auth/users/${user_id}`, <any>{
      newsletter: false,
    });

    const user = <any>useUser();
    const cookie_user = useCookie('user');
    user.value = response ?? null;
    cookie_user.value = user.value;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
