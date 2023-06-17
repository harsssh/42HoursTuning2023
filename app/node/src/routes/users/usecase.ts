import { Target, SearchedUser } from "../../model/types";
import {
  getUsersByUserName,
  getUsersByKana,
  getUsersByMail,
  getUsersByDepartmentName,
  getUsersByRoleName,
  getUsersByOfficeName,
  getUsersBySkillName,
  getUsersByGoal,
} from "./repository";

export const getUsersByKeyword = async (
  keyword: string,
  targets: Target[]
): Promise<SearchedUser[]> => {
  const promises = targets.map((target) => {
    switch (target) {
      case "userName":
        return getUsersByUserName(keyword);
      case "kana":
        return getUsersByKana(keyword);
      case "mail":
        return getUsersByMail(keyword);
      case "department":
        return getUsersByDepartmentName(keyword);
      case "role":
        return getUsersByRoleName(keyword);
      case "office":
        return getUsersByOfficeName(keyword);
      case "skill":
        return getUsersBySkillName(keyword);
      case "goal":
        return getUsersByGoal(keyword);
      default:
        return Promise.resolve([]);
    }
  });

  const usersArray = await Promise.all(promises);

  const users = ([] as SearchedUser[]).concat(...usersArray);

  targets.forEach((target, i) => {
    console.log(`${usersArray[i].length} users found by ${target}`);
  });

  return users;
};
