export async function requestNewsletterRegistration() {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;

  try {
    if (!!!user_id) {
      throw { data: "Invalid User Id" };
    }

    const response = await PATCH(`/auth/users/${user_id}`, <any>{
      newsletter: true,
    });

    setUser(response);

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
      throw { data: "Invalid User Id" };
    }

    const response = await PUT(`/auth/users/${user_id}/newsletter`, body);

    setUser(response);

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
      throw { data: "Invalid User Id" };
    }

    const response = await PATCH(`/auth/users/${user_id}`, <any>{
      newsletter: false,
    });

    setUser(response);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
