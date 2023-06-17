import { v4 as uuidv4 } from "uuid";
import {
  MatchGroupDetail,
  MatchGroupConfig,
  UserForFilter,
} from "../../model/types";
import {
  getMatchGroupDetailByMatchGroupId,
  getUserIdsBeforeMatched,
  hasSkillNameRecord,
  insertMatchGroup,
} from "./repository";
import { getUserForFilter } from "../users/repository";

export const checkSkillsRegistered = async (
  skillNames: string[]
): Promise<string | undefined> => {
  for (const skillName of skillNames) {
    if (!(await hasSkillNameRecord(skillName))) {
      return skillName;
    }
  }

  return;
};

export const createMatchGroup = async (
  matchGroupConfig: MatchGroupConfig,
  timeout?: number
): Promise<MatchGroupDetail | undefined> => {
  const owner = await getUserForFilter(matchGroupConfig.ownerId);
  let members: UserForFilter[] = [owner];
  const startTime = Date.now();
  while (members.length < matchGroupConfig.numOfMembers) {
    // デフォルトは50秒でタイムアウト
    if (Date.now() - startTime > (!timeout ? 50000 : timeout)) {
      console.error("not all members found before timeout");
      return;
    }
    const candidate = await getUserForFilter();
    if (
      matchGroupConfig.departmentFilter !== "none" &&
      !isPassedDepartmentFilter(
        matchGroupConfig.departmentFilter,
        owner.departmentName,
        candidate.departmentName
      )
    ) {
      console.log(`${candidate.userId} is not passed department filter`);
      continue;
    } else if (
      matchGroupConfig.officeFilter !== "none" &&
      !isPassedOfficeFilter(
        matchGroupConfig.officeFilter,
        owner.officeName,
        candidate.officeName
      )
    ) {
      console.log(`${candidate.userId} is not passed office filter`);
      continue;
    } else if (
      matchGroupConfig.skillFilter.length > 0 &&
      !matchGroupConfig.skillFilter.some((skill) =>
        candidate.skillNames.includes(skill)
      )
    ) {
      console.log(`${candidate.userId} is not passed skill filter`);
      continue;
    } else if (
      matchGroupConfig.neverMatchedFilter &&
      !(await isPassedMatchFilter(matchGroupConfig.ownerId, candidate.userId))
    ) {
      console.log(`${candidate.userId} is not passed never matched filter`);
      continue;
    } else if (members.some((member) => member.userId === candidate.userId)) {
      console.log(`${candidate.userId} is already added to members`);
      continue;
    }
    members = members.concat(candidate);
    console.log(`${candidate.userId} is added to members`);
  }

  const matchGroupId = uuidv4();
  await insertMatchGroup({
    matchGroupId,
    matchGroupName: matchGroupConfig.matchGroupName,
    description: matchGroupConfig.description,
    members,
    status: "open",
    createdBy: matchGroupConfig.ownerId,
    createdAt: new Date(),
  });

  return await getMatchGroupDetailByMatchGroupId(matchGroupId);
};

const isPassedDepartmentFilter = (
  departmentFilter: string,
  ownerDepartment: string,
  candidateDepartment: string
) => {
  return departmentFilter === "onlyMyDepartment"
    ? ownerDepartment === candidateDepartment
    : ownerDepartment !== candidateDepartment;
};

const isPassedOfficeFilter = (
  officeFilter: string,
  ownerOffice: string,
  candidateOffice: string
) => {
  return officeFilter === "onlyMyOffice"
    ? ownerOffice === candidateOffice
    : ownerOffice !== candidateOffice;
};

const isPassedMatchFilter = async (ownerId: string, candidateId: string) => {
  const userIdsBeforeMatched = await getUserIdsBeforeMatched(ownerId);
  return userIdsBeforeMatched.every(
    (userIdBeforeMatched) => userIdBeforeMatched !== candidateId
  );
};
