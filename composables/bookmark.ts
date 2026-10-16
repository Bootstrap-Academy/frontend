/**
 * The address of a bookmark: a main skill alone, or one of its skills. Without a second id
 * the path ends with the main skill; a slash at its end is another address to the API.
 */
function bookmarkPath(rootSkillId: string, subSkillId: string | null) {
  const root = `/skills/bookmark/${encodeURIComponent(rootSkillId)}`;
  return subSkillId ? `${root}/${encodeURIComponent(subSkillId)}` : root;
}

export async function createBookmark(
  rootSkillId: string,
  subSkillId: string | null = null
): Promise<void> {
  try {
    const urlPath = bookmarkPath(rootSkillId, subSkillId);

    const response = await POST(urlPath);

    if (!response) throw new Error("Failed to create bookmark");

    console.log("Bookmark created");
  } catch (error) {
    console.error("Error creating bookmark", error);
    throw error;
  }
}

export async function deleteBookmark(
  rootSkillId: string,
  subSkillId: string | null = null
): Promise<void> {
  try {
    const urlPath = bookmarkPath(rootSkillId, subSkillId);

    const response = await DELETE(urlPath);

    if (!response || response !== true) throw new Error("Failed to delete bookmark");

    console.log("Bookmark deleted");
  } catch (error) {
    console.error("Error deleting bookmark", error);
    throw error;
  }
}
