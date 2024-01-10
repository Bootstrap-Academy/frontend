export async function initializeMFA() {
  const user = <any>useUser();
  const userID = user?.value?.id ?? '';

  try {
    if (!!!userID) {
      throw { data: { detail: 'Missing user id' } };
    }

    const response = await POST(`/auth/users/${userID}/mfa`);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function enableMFA(body: any) {
  const user = <any>useUser();
  const userID = user?.value?.id ?? '';

  try {
    if (!!!userID) {
      throw { data: { detail: 'Missing user id' } };
    }

    const response = await PUT(`/auth/users/${userID}/mfa`, body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function disableMFA() {
  const user = <any>useUser();
  const userID = user?.value?.id ?? '';

  try {
    if (!!!userID) {
      throw { data: { detail: 'Missing user id' } };
    }

    const response = await DELETE(`/auth/users/${userID}/mfa`);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
