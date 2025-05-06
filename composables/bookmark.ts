export async function createBookmark(
  rootSkillId: string,
  subSkillId: string | null = null
): Promise<void> {
  try {
    var urlPath = `/skills/bookmark/${rootSkillId}/${
      subSkillId != null ? subSkillId : ""
    }`;

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
    var urlPath = `/skills/bookmark/${rootSkillId}/${
      subSkillId != null ? subSkillId : ""
    }`;

    const response = await DELETE(urlPath);

    if (!response || response !== true) throw new Error("Failed to delete bookmark");

    console.log("Bookmark deleted");
  } catch (error) {
    console.error("Error deleting bookmark", error);
    throw error;
  }
}
