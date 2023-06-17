import { RowDataPacket } from "mysql2/promise"; //
import pool from "../../util/mysql"; //
import { convertToUserForFilter } from "../../model/utils"; //

import { v4 as uuidv4 } from "uuid";
import {
  MatchGroupDetail,
  MatchGroupConfig,
  UserForFilter,
} from "../../model/types";
import {
  getMatchGroupDetailByMatchGroupId,
  // getUserIdsBeforeMatched,
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

export const getAllCandidates = async (
  matchGroupConfig: MatchGroupConfig
): Promise<UserForFilter[]> => {
  const { departmentFilter, officeFilter, skillFilter } = matchGroupConfig;

  // Building the base of the SQL query
  let sqlQuery = `SELECT * FROM user 
  JOIN skill_member ON user.user_id = skill_member.user_id
  JOIN skill ON skill_member.skill_id = skill.skill_id`;

  // An array to hold the parameters of the SQL query
  let sqlParams = [];

  // 範囲を制限したい
  // Adding the filters to the SQL query
  if (
    departmentFilter !== "none" ||
    officeFilter !== "none" ||
    skillFilter.length > 0
  ) {
    sqlQuery += " WHERE ";
    let conditions = [];

    if (departmentFilter !== "none") {
      if (departmentFilter === "onlyMyDepartment") {
        conditions.push("department_name = ?");
      } else {
        conditions.push("department_name != ?");
      }
      sqlParams.push(departmentFilter);
    }

    if (officeFilter !== "none") {
      if (officeFilter === "onlyMyOffice") {
        conditions.push("office_name = ?");
      } else {
        conditions.push("office_name != ?");
      }
      sqlParams.push(officeFilter);
    }

    if (skillFilter.length > 0) {
      // This assumes that the skillFilter is an array of skill IDs
      conditions.push(`skill_name IN (?)`);
      sqlParams.push(skillFilter);
    }

    sqlQuery += conditions.join(" AND ");
  }

  const [userRows] = await pool.query<RowDataPacket[]>(sqlQuery, sqlParams);

  // We assume that there's a function convertToUserForFilter which can convert the raw SQL result to the UserForFilter type
  return userRows.map(convertToUserForFilter);
};

export const createMatchGroup = async (
  matchGroupConfig: MatchGroupConfig,
  timeout?: number
): Promise<MatchGroupDetail | undefined> => {
  const owner = await getUserForFilter(matchGroupConfig.ownerId);
  let members: UserForFilter[] = [owner];
  const startTime = Date.now();

  // Get all candidates who pass the filter
  const candidates = await getAllCandidates(matchGroupConfig);

  // while (members.length < matchGroupConfig.groupCount) {
  while (members.length < matchGroupConfig.numOfMembers) {
    // Check for timeout
    if (timeout && Date.now() - startTime > timeout) {
      return undefined;
    }

    // Get a random candidate
    const candidateIndex = Math.floor(Math.random() * candidates.length);
    const candidate = candidates[candidateIndex];

    // Add candidate to group members
    members.push(candidate);

    // Remove candidate from the candidates list
    candidates.splice(candidateIndex, 1);
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

// export const createMatchGroup = async (
//   matchGroupConfig: MatchGroupConfig,
//   timeout?: number
// ): Promise<MatchGroupDetail | undefined> => {
//   const owner = await getUserForFilter(matchGroupConfig.ownerId);
//   let members: UserForFilter[] = [owner];
//   const startTime = Date.now();
//   while (members.length < matchGroupConfig.numOfMembers) {
//     // デフォルトは50秒でタイムアウト
//     if (Date.now() - startTime > (!timeout ? 50000 : timeout)) {
//       console.error("not all members found before timeout");
//       return;
//     }
//     const candidate = await getUserForFilter();
//     if (
//       matchGroupConfig.departmentFilter !== "none" &&
//       !isPassedDepartmentFilter(
//         matchGroupConfig.departmentFilter,
//         owner.departmentName,
//         candidate.departmentName
//       )
//     ) {
//       console.log(`${candidate.userId} is not passed department filter`);
//       continue;
//     } else if (
//       matchGroupConfig.officeFilter !== "none" &&
//       !isPassedOfficeFilter(
//         matchGroupConfig.officeFilter,
//         owner.officeName,
//         candidate.officeName
//       )
//     ) {
//       console.log(`${candidate.userId} is not passed office filter`);
//       continue;
//     } else if (
//       matchGroupConfig.skillFilter.length > 0 &&
//       !matchGroupConfig.skillFilter.some((skill) =>
//         candidate.skillNames.includes(skill)
//       )
//     ) {
//       console.log(`${candidate.userId} is not passed skill filter`);
//       continue;
//     } else if (
//       matchGroupConfig.neverMatchedFilter &&
//       !(await isPassedMatchFilter(matchGroupConfig.ownerId, candidate.userId))
//     ) {
//       console.log(`${candidate.userId} is not passed never matched filter`);
//       continue;
//     } else if (members.some((member) => member.userId === candidate.userId)) {
//       console.log(`${candidate.userId} is already added to members`);
//       continue;
//     }
//     members = members.concat(candidate);
//     console.log(`${candidate.userId} is added to members`);
//   }

//   const matchGroupId = uuidv4();
//   await insertMatchGroup({
//     matchGroupId,
//     matchGroupName: matchGroupConfig.matchGroupName,
//     description: matchGroupConfig.description,
//     members,
//     status: "open",
//     createdBy: matchGroupConfig.ownerId,
//     createdAt: new Date(),
//   });

//   return await getMatchGroupDetailByMatchGroupId(matchGroupId);
// };

// const isPassedDepartmentFilter = (
//   departmentFilter: string,
//   ownerDepartment: string,
//   candidateDepartment: string
// ) => {
//   return departmentFilter === "onlyMyDepartment"
//     ? ownerDepartment === candidateDepartment
//     : ownerDepartment !== candidateDepartment;
// };

// const isPassedOfficeFilter = (
//   officeFilter: string,
//   ownerOffice: string,
//   candidateOffice: string
// ) => {
//   return officeFilter === "onlyMyOffice"
//     ? ownerOffice === candidateOffice
//     : ownerOffice !== candidateOffice;
// };

// const isPassedMatchFilter = async (ownerId: string, candidateId: string) => {
//   const userIdsBeforeMatched = await getUserIdsBeforeMatched(ownerId);
//   return userIdsBeforeMatched.every(
//     (userIdBeforeMatched) => userIdBeforeMatched !== candidateId
//   );
// };
