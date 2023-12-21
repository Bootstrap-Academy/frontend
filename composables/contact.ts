export async function contact(body: any) {
  try {
    const response = await POST(`/auth/contact`, body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
