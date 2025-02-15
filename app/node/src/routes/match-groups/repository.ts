import { RowDataPacket } from "mysql2";
import pool from "../../util/mysql";
import { MatchGroup, MatchGroupDetail, User } from "../../model/types";
import { getUsersByUserIds } from "../users/repository";
import { convertToMatchGroupDetail } from "../../model/utils";

export const hasSkillNameRecord = async (
  skillName: string
): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM skill WHERE EXISTS (SELECT * FROM skill WHERE skill_name = ?)",
    [skillName]
  );
  return rows.length > 0;
};

export const getUserIdsBeforeMatched = async (
  userId: string
): Promise<string[]> => {
  const [matchGroupIdRows] = await pool.query<RowDataPacket[]>(
    "SELECT match_group_id FROM match_group_member WHERE user_id = ?",
    [userId]
  );
  if (matchGroupIdRows.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM match_group_member WHERE match_group_id IN (?)",
    [matchGroupIdRows]
  );

  return userIdRows.map((row) => row.user_id);
};

export const insertMatchGroup = async (matchGroupDetail: MatchGroupDetail) => {
  await pool.query<RowDataPacket[]>(
    "INSERT INTO match_group (match_group_id, match_group_name, description, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      matchGroupDetail.matchGroupId,
      matchGroupDetail.matchGroupName,
      matchGroupDetail.description,
      matchGroupDetail.status,
      matchGroupDetail.createdBy,
      matchGroupDetail.createdAt,
    ]
  );

  for (const member of matchGroupDetail.members) {
    await pool.query<RowDataPacket[]>(
      "INSERT INTO match_group_member (match_group_id, user_id) VALUES (?, ?)",
      [matchGroupDetail.matchGroupId, member.userId]
    );
  }
};

export const getMatchGroupDetailByMatchGroupId = async (
  matchGroupId: string,
  status?: string
): Promise<MatchGroupDetail | undefined> => {
  let query =
    "SELECT match_group_id, match_group_name, description, status, created_by, created_at FROM match_group WHERE match_group_id = ?";
  if (status === "open") {
    query += " AND status = 'open'";
  }
  const [matchGroup] = await pool.query<RowDataPacket[]>(query, [matchGroupId]);
  if (matchGroup.length === 0) {
    return;
  }

  const [matchGroupMemberIdRows] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM match_group_member WHERE match_group_id = ?",
    [matchGroupId]
  );
  const matchGroupMemberIds: string[] = matchGroupMemberIdRows.map(
    (row) => row.user_id
  );

  const searchedUsers = await getUsersByUserIds(matchGroupMemberIds);
  // SearchedUserからUser型に変換
  const members: User[] = searchedUsers.map((searchedUser) => {
    const { kana: _kana, entryDate: _entryDate, ...rest } = searchedUser;
    return rest;
  });
  matchGroup[0].members = members;

  return convertToMatchGroupDetail(matchGroup[0]);
};

export const getMatchGroupIdsByUserId = async (
  userId: string
): Promise<string[]> => {
  const [matchGroupIds] = await pool.query<RowDataPacket[]>(
    "SELECT match_group_id FROM match_group_member WHERE user_id = ?",
    [userId]
  );
  return matchGroupIds.map((row) => row.match_group_id);
};

export const getMatchGroupsByMatchGroupIds = async (
  matchGroupIds: string[],
  status: string
): Promise<MatchGroup[]> => {
  if (matchGroupIds.length === 0) {
    return [];
  }

  let query = `SELECT match_group_id, match_group_name, status, created_by, created_at
    FROM match_group WHERE match_group_id IN (?)`;
  if (status === "open") {
    query += " AND status = 'open'";
  }

  const [matchGroupRows] = await pool.query<RowDataPacket[]>(query, [
    matchGroupIds,
  ]);

  const [matchGroupMemberIdRows] = await pool.query<RowDataPacket[]>(
    "SELECT user_id, match_group_id FROM match_group_member WHERE match_group_id IN (?)",
    [matchGroupIds]
  );

  const memberIdsByGroupId = matchGroupMemberIdRows.reduce(
    (acc: { [key: string]: string[] }, row) => {
      if (!acc[row.match_group_id]) acc[row.match_group_id] = [];
      acc[row.match_group_id].push(row.user_id);
      return acc;
    },
    {}
  );

  const userIds: string[] = Object.values(memberIdsByGroupId).flat();
  const searchedUsers = await getUsersByUserIds(userIds);

  return matchGroupRows.map((matchGroupRow) => {
    // SearchedUserからUser型に変換
    matchGroupRow.members = memberIdsByGroupId[
      matchGroupRow.match_group_id
    ].map((userId) => {
      const user = searchedUsers.find((user) => user.userId === userId);
      if (!user) {
        throw new Error(`user not found. userId: ${userId}`);
      }
      const { kana: _kana, entryDate: _entryDate, ...rest } = user;
      return rest;
    });

    // descriptionを除外してMatchGroupオブジェクトを作成
    const { description: _description, ...matchGroup } =
      convertToMatchGroupDetail(matchGroupRow);

    return matchGroup;
  });
};
