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
import { getSkillIdBySkillName } from "../skills/repository";
import { getMatchGroupDetailByMatchGroupId } from "./repository";

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

const exeQuery = async (
  matchGroupConfig: MatchGroupConfig,
  owner: UserForFilter,
  offset: number
): Promise<UserForFilter[]>=> {
  const { departmentFilter, officeFilter, skillFilter } = matchGroupConfig;

  let sqlParams = [];
  sqlParams.push(offset);
  let sqlQuery =  `SELECT user_id, user_name, office_id, user_icon_id FROM ( SELECT user.* FROM user   
    JOIN skill_member ON user.user_id = skill_member.user_id   
    JOIN skill ON skill_member.skill_id = skill.skill_id
    JOIN department_role_member ON department_role_member.user_id = user.user_id
    JOIN department ON department.department_id = department_role_member.department_id 
    limit 100 offset ?) as sample`


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
      sqlParams.push(owner.departmentName);
    }
    if (officeFilter !== "none") {
      if (officeFilter === "onlyMyOffice") {
        conditions.push("office_name = ?");
      } else {
        conditions.push("office_name != ?");
      }
      sqlParams.push(owner.officeName);
    }
    if (skillFilter.length > 0) {
      // This assumes that the skillFilter is an array of skill IDs
      conditions.push(`skill_name IN (?)`);
      sqlParams.push(skillFilter);
    }
    sqlQuery += conditions.join(" AND ");
  }
  const [userRows] = await pool.query<RowDataPacket[]>(sqlQuery, sqlParams);
  const candidates [] = userRows.map(convertToUserForFilter);
  return candidates;
};


// there are some conditions that should be considered with election
// 1. departmentFilter
// 2. officeFilter
// 3. skillFilter
// 4. neverMatchedFilter
// 5. numOfMembers
// 6. whether the user is already added to members

// getALLCandidates() have some sections
// 1. Building the base of the SQL query
// 2. Adding the 1 2 3 filters to the SQL query that search with limit and offset
// { 
    // loop until the number of members is equal to the number of members in the match group
    // 3. Get a rondom offset
    // 4. Execute the SQL query 
    // 5. filter the result of the SQL query by 4 5 6 filters
    // 6. some of them are passed, add the user to members
    // }
// 7. return the result

export const getAllCandidates = async (
  matchGroupConfig: MatchGroupConfig
): Promise<UserForFilter[]> => {
  // 1. Building the base of the SQL query
  let sqlQuery =  `SELECT user_id, user_name, office_id, user_icon_id FROM ( SELECT user.* FROM user   
    JOIN skill_member ON user.user_id = skill_member.user_id   
    JOIN skill ON skill_member.skill_id = skill.skill_id
    JOIN department_role_member ON department_role_member.user_id = user.user_id
    JOIN department ON department.department_id = department_role_member.department_id 
    limit 100 offset ?) as sample`

  // An array to hold the parameters of the SQL query

  // 範囲を制限したい
  const owner = await getUserForFilter(matchGroupConfig.ownerId);
  // Adding the filters to the SQL query

  let members: UserForFilter[] = [owner];

  while (members.length < matchGroupConfig.numOfMembers) {
    const offset = Math.floor(Math.random() * (300000 - 100));
    const candidates = await exeQuery(matchGroupConfig, owner, offset);
    while (candidates.length > 0)
    {
      const candidateIndex = Math.floor(Math.random() * candidates.length);
      const candidate = candidates[candidateIndex];
      if (
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
      candidates.splice(candidateIndex, 1);
    }
  }
  // We assume that there's a function convertToUserForFilter which can convert the raw SQL result to the UserForFilter type
  return members;
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

  // Add candidates to group members
  while (members.length < matchGroupConfig.numOfMembers) {
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

const isPassedMatchFilter = async (ownerId: string, candidateId: string) => {
  const userIdsBeforeMatched = await getUserIdsBeforeMatched(ownerId);
  return userIdsBeforeMatched.every(
    (userIdBeforeMatched) => userIdBeforeMatched !== candidateId
  );
};
