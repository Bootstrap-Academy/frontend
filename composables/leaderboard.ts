export const useLeaderBoardList = () =>
  useState<any[]>("leaderboardList", () => [
    {
      username: "Alex",
      img: "/images/user1.jpg",
      xp: "45000",
      level: "56",
      rank: 1,
    },
    {
      username: "McQueen",
      img: "/images/user2.jpg",
      xp: "42300",
      level: "52",
      rank: 2,
    },
    {
      username: "Alexander",
      img: "/images/user3.jpg",
      xp: "41000",
      level: "49",
      rank: 3,
    },
    {
      username: "McQueen",
      img: "/images/user1.jpg",
      xp: "39000",
      level: "47",
      rank: 4,
    },
    {
      username: "Maria",
      img: "/images/user2.jpg",
      xp: "38400",
      level: "46",
      rank: 5,
    },
    {
      username: "Costa",
      img: "/images/user3.jpg",
      xp: "37300",
      level: "44",
      rank: 6,
    },
    {
      username: "Alexander",
      img: "/images/user1.jpg",
      xp: "37000",
      level: "42",
      rank: 7,
    },
    {
      username: "McQueen",
      img: "/images/user2.jpg",
      xp: "36000",
      level: "40",
      rank: 8,
    },
    //
    {
      username: "Alex",
      img: "/images/user3.jpg",
      xp: "35500",
      level: "39",
      rank: 9,
    },
    {
      username: "Costa",
      img: "/images/user1.jpg",
      xp: "35000",
      level: "37",
      rank: 10,
    },
    {
      username: "Alexander",
      img: "/images/user2.jpg",
      xp: "33200",
      level: "35",
      rank: 1,
    },
    {
      username: "McQueen",
      img: "/images/user3.jpg",
      xp: "39000",
      level: "32",
      rank: 1,
    },
    {
      username: "Alex",
      img: "/images/user1.jpg",
      xp: "38400",
      level: "30",
      rank: 1,
    },
    {
      username: "Costa",
      img: "/images/user1.jpg",
      xp: "37300",
      level: "30",
      rank: 1,
    },
    {
      username: "Alexander",
      img: "/images/user1.jpg",
      xp: "37000",
      level: "29",
      rank: 1,
    },
    {
      username: "McQueen",
      img: "/images/user1.jpg",
      xp: "36000",
      level: "28",
      rank: 1,
    },
    {
      username: "Alexander",
      img: "/images/user1.jpg",
      xp: "37000",
      level: "42",
      rank: 7,
    },
    {
      username: "McQueen",
      img: "/images/user2.jpg",
      xp: "36000",
      level: "40",
      rank: 8,
    },
    //
    {
      username: "Alex",
      img: "/images/user3.jpg",
      xp: "35500",
      level: "39",
      rank: 9,
    },
    {
      username: "Costa",
      img: "/images/user1.jpg",
      xp: "35000",
      level: "37",
      rank: 10,
    },
    {
      username: "Alexander",
      img: "/images/user2.jpg",
      xp: "33200",
      level: "35",
      rank: 1,
    },
    {
      username: "McQueen",
      img: "/images/user3.jpg",
      xp: "39000",
      level: "32",
      rank: 1,
    },
    {
      username: "Alex",
      img: "/images/user1.jpg",
      xp: "38400",
      level: "30",
      rank: 1,
    },
    {
      username: "Costa",
      img: "/images/user1.jpg",
      xp: "37300",
      level: "30",
      rank: 1,
    },
    {
      username: "Alexander",
      img: "/images/user1.jpg",
      xp: "37000",
      level: "29",
      rank: 1,
    },
    {
      username: "McQueen",
      img: "/images/user1.jpg",
      xp: "36000",
      level: "28",
      rank: 1,
    },
  ]);

export const useAllGlobalChallenges = () =>
  useState("allGlobalChallenges", () => [
    {
      description:
                "This challenge number From arslan sameer   from  usman number From arslan sameer   from  usman",
    },
    {
      description:
                "This challenge number From arslan sameer   from  usman number From arslan sameer   from  usman",
    },
    {
      description:
                "This challenge number From arslan sameer   from  usman number From arslan sameer   from  usman",
    },
    {
      description:
                "This challenge number From arslan sameer   from  usman number From arslan sameer   from  usman",
    },
    {
      description:
                "This challenge number From arslan sameer   from  usman number From arslan sameer   from  usman",
    },
    {
      description:
                "This challenge number From arslan sameer   from  usman number From arslan sameer   from  usman",
    },
    {
      description:
                "This challenge number From arslan sameer   from  usman number From arslan sameer   from  usman",
    },
    {
      description:
                "This challenge number From arslan sameer   from  usman number From arslan sameer   from  usman",
    },
    {
      description: "This challenge number From arslan sameer usman",
    },
    {
      description: "This challenge number From arslan sameer usman",
    },
  ]);

export const useLanguageLeaderboardList = () =>
  useState("languageLeaderboardList", () => []);

export const useCodingChallengeLeaderboardList = () =>
  useState("codingChallengeLeaderboardList", () => []);

export const useOverAllLeaderboardList = () =>
  useState("overAllLeaderboardList", () => []);

export const useTotalLeaderboardUsers = () =>
  useState("totalLeaderboardUsers", () => 0);


export const useLeaderboardLimit = () => useState("leaderboardLimit", () => 10);
export const useLeaderboardOffset = () =>
  useState("leaderboardOffset", () => 0);

export async function getLanguageLeaderboard(language: string, offset: any) {
  try {
    const limit = useLeaderboardLimit();
    const languageLeaderboardList = useLanguageLeaderboardList();

    console.log("limit", limit.value)
    const response = await GET(
      `/challenges/leaderboard/by-language/${language}?limit=${limit.value}&offset=${offset}`
    );

    const totalLeaderboardUsers = useTotalLeaderboardUsers()
    totalLeaderboardUsers.value = response?.total ?? 0
    let arr: any = response?.leaderboard ?? []
    arr = [...languageLeaderboardList.value, ...arr]
    languageLeaderboardList.value = arr
    return [response, null];
  } catch (error: any) {
    let msg = error?.data?.error
    if (msg == "unverified") {
      return openSnackbar("error", "Error.VerifyToGetLeaderboard")
    }
    console.log("error in languageLeaderboard", error);
    return [null, error];
  }
}

export async function getCodingChallengeLeaderboard(codingChallengeId: string, offset: any) {
  try {
    const limit = useLeaderboardLimit();
    const codingChallengeLeaderboardList = useCodingChallengeLeaderboardList();
    const totalLeaderboardUsers = useTotalLeaderboardUsers()


    const response = await GET(
      `/challenges/leaderboard/by-task/${codingChallengeId}?limit=${limit.value}&offset=${offset}`
    );

    totalLeaderboardUsers.value = response?.total ?? 0
    console.log("response leaderboard", response);
    let arr: any = response?.leaderboard ?? []
    arr = [...codingChallengeLeaderboardList.value, ...arr]
    codingChallengeLeaderboardList.value = arr
    return [response, null];
  } catch (error: any) {
    let msg = error?.data?.error
    if (msg == "unverified") {
      return openSnackbar("error", "Error.VerifyToGetLeaderboard")
    }
    console.log("error in languageLeaderboard", error);
    return [null, error];
  }
}

export async function getOverAllLeaderBoard(offset: any) {
  try {
    const limit = useLeaderboardLimit();
    const overAllLeaderboardList = useOverAllLeaderboardList();
    const totalLeaderboardUsers = useTotalLeaderboardUsers()

    const response = await GET(`/challenges/leaderboard?limit=${limit.value}&offset=${offset}`);
    let arr: any = response?.leaderboard ?? []
    console.log("response leaderboard oveall", response);
    totalLeaderboardUsers.value = response?.total ?? 0
    arr = [...overAllLeaderboardList.value, ...arr]
    overAllLeaderboardList.value = arr;
    return [response, null];
  } catch (error: any) {
    let msg = error?.data?.error
    if (msg == "unverified") {
      return openSnackbar("error", "Error.VerifyToGetLeaderboard")
    }
    console.log("error in languageLeaderboard", error);
    return [null, error];
  }
}
