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

const isCandidateFitForGroup = async (
  owner: UserForFilter, 
  candidate: UserForFilter, 
  matchGroupConfig: MatchGroupConfig
): Promise<boolean> => {
  // Return false if candidate is owner
  if (candidate.userId === owner.userId) return false;

  // Check department filter
  if (matchGroupConfig.departmentFilter !== "none" &&
      !isPassedDepartmentFilter(matchGroupConfig.departmentFilter, owner.departmentName, candidate.departmentName)) {
    return false;
  }

  // Check office filter
  if (matchGroupConfig.officeFilter !== "none" &&
      !isPassedOfficeFilter(matchGroupConfig.officeFilter, owner.officeName, candidate.officeName)) {
    return false;
  }

  // Check skill filter
  if (matchGroupConfig.skillFilter.length > 0 &&
      !matchGroupConfig.skillFilter.some((skill: string) => candidate.skillNames.includes(skill))) {
    return false;
  }

  // Check never matched filter
  if (matchGroupConfig.neverMatchedFilter &&
      !(await isPassedMatchFilter(matchGroupConfig.ownerId, candidate.userId))) {
    return false;
  }

  // If candidate has passed all filters, return true
  return true;
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

    if (await isCandidateFitForGroup(owner, candidate, matchGroupConfig)) {
      members = members.concat(candidate);
      console.log(`${candidate.userId} is added to members`);
    } else {
      console.log(`${candidate.userId} is not passed filter(s)`);
    }
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
