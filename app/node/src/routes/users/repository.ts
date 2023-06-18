import { RowDataPacket } from "mysql2";
import pool from "../../util/mysql";
import { SearchedUser, User, UserForFilter } from "../../model/types";
import {
  convertToSearchedUser,
  convertToUserForFilter,
  convertToUsers,
} from "../../model/utils";

export const getUserIdByMailAndPassword = async (
  mail: string,
  hashPassword: string
): Promise<string | undefined> => {
  const [user] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM user WHERE mail = ? AND password = ?",
    [mail, hashPassword]
  );
  if (user.length === 0) {
    return;
  }

  return user[0].user_id;
};

export const getUsers = async (
  limit: number,
  offset: number
): Promise<User[]> => {
  const query = `
    SELECT 
      user.user_id, 
      user.user_name, 
      user.office_id, 
      user.user_icon_id,
      office.office_name,
      file.file_name 
    FROM 
      user 
    LEFT JOIN 
      office ON user.office_id = office.office_id 
    LEFT JOIN 
      file ON user.user_icon_id = file.file_id 
    ORDER BY 
      user.entry_date ASC, user.kana ASC 
    LIMIT ? OFFSET ?
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query, [limit, offset]);

  return convertToUsers(rows);
};

export const getUserByUserId = async (
  userId: string
): Promise<User | undefined> => {
  const [user] = await pool.query<RowDataPacket[]>(
    "SELECT user_id, user_name, office_id, user_icon_id FROM user WHERE user_id = ?",
    [userId]
  );
  if (user.length === 0) {
    return;
  }

  const [office] = await pool.query<RowDataPacket[]>(
    `SELECT office_name FROM office WHERE office_id = ?`,
    [user[0].office_id]
  );
  const [file] = await pool.query<RowDataPacket[]>(
    `SELECT file_name FROM file WHERE file_id = ?`,
    [user[0].user_icon_id]
  );

  return {
    userId: user[0].user_id,
    userName: user[0].user_name,
    userIcon: {
      fileId: user[0].user_icon_id,
      fileName: file[0].file_name,
    },
    officeName: office[0].office_name,
  };
};

export const getUsersByUserIds = async (
  userIds: string[]
): Promise<SearchedUser[]> => {
  if (userIds.length === 0) {
    return [];
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user.user_id, user.user_name, user.kana, user.entry_date, user.user_icon_id, file.file_name, office.office_name
     FROM user
     LEFT JOIN office ON user.office_id = office.office_id 
     LEFT JOIN file ON user.user_icon_id = file.file_id 
     WHERE user_id IN (?)`,
    [userIds]
  );

  return convertToSearchedUser(rows);
};

export const getUsersByUserName = async (
  userName: string
): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE MATCH (user_name) AGAINST (? IN BOOLEAN MODE)`,
    [`*${userName}*`]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByKana = async (kana: string): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE MATCH (kana) AGAINST (? IN BOOLEAN MODE)`,
    [`*${kana}*`]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByMail = async (mail: string): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE MATCH(mail) AGAINST (? IN BOOLEAN MODE)`,
    [`*${mail}*`]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByDepartmentName = async (
  departmentName: string
): Promise<SearchedUser[]> => {
  const [departmentIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT department_id FROM department WHERE MATCH (department_name) AGAINST (? IN BOOLEAN MODE) AND active = true`,
    [`*${departmentName}*`]
  );
  const departmentIds: string[] = departmentIdRows.map(
    (row) => row.department_id
  );
  if (departmentIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM department_role_member WHERE department_id IN (?) AND belong = true`,
    [departmentIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByRoleName = async (
  roleName: string
): Promise<SearchedUser[]> => {
  const [roleIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT role_id FROM role WHERE MATCH (role_name) AGAINST (? IN BOOLEAN MODE) AND active = true`,
    [`*${roleName}*`]
  );
  const roleIds: string[] = roleIdRows.map((row) => row.role_id);
  if (roleIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM department_role_member WHERE role_id IN (?) AND belong = true`,
    [roleIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByOfficeName = async (
  officeName: string
): Promise<SearchedUser[]> => {
  const [officeIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT office_id FROM office WHERE MATCH (office_name) AGAINST (? IN BOOLEAN MODE)`,
    [`*${officeName}*`]
  );
  const officeIds: string[] = officeIdRows.map((row) => row.office_id);
  if (officeIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE office_id IN (?)`,
    [officeIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersBySkillName = async (
  skillName: string
): Promise<SearchedUser[]> => {
  const [skillIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT skill_id FROM skill WHERE skill_name LIKE ?`,
    [`%${skillName}%`]
  );
  const skillIds: string[] = skillIdRows.map((row) => row.skill_id);
  if (skillIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM skill_member WHERE skill_id IN (?)`,
    [skillIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByGoal = async (goal: string): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE MATCH (goal) AGAINST (? IN BOOLEAN MODE)`,
    [`*${goal}*`]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUserForFilter = async (
    userId?: string
): Promise<UserForFilter> => {
  let userRows: RowDataPacket[];

  if (!userId) {
    [userRows] = await pool.query<RowDataPacket[]>(
        `
      SELECT 
        u.user_id, u.user_name, u.office_id, u.user_icon_id,
        o.office_name, f.file_name, 
        d.department_name,
        GROUP_CONCAT(s.skill_name) as skill_names
      FROM 
        user u 
      LEFT JOIN 
        office o ON u.office_id = o.office_id
      LEFT JOIN 
        file f ON u.user_icon_id = f.file_id
      LEFT JOIN 
        department_role_member drm ON u.user_id = drm.user_id AND drm.belong = true
      LEFT JOIN 
        department d ON drm.department_id = d.department_id
      LEFT JOIN 
        skill_member sm ON u.user_id = sm.user_id
      LEFT JOIN 
        skill s ON sm.skill_id = s.skill_id
      GROUP BY 
        u.user_id, u.user_name, u.office_id, u.user_icon_id, o.office_name, f.file_name, d.department_name
      ORDER BY 
        RAND() LIMIT 1
      `
    );
  } else {
    [userRows] = await pool.query<RowDataPacket[]>(
        `
      SELECT 
        u.user_id, u.user_name, u.office_id, u.user_icon_id,
        o.office_name, f.file_name, 
        d.department_name,
        GROUP_CONCAT(s.skill_name) as skill_names
      FROM 
        user u 
      LEFT JOIN 
        office o ON u.office_id = o.office_id
      LEFT JOIN 
        file f ON u.user_icon_id = f.file_id
      LEFT JOIN 
        department_role_member drm ON u.user_id = drm.user_id AND drm.belong = true
      LEFT JOIN 
        department d ON drm.department_id = d.department_id
      LEFT JOIN 
        skill_member sm ON u.user_id = sm.user_id
      LEFT JOIN 
        skill s ON sm.skill_id = s.skill_id
      WHERE 
        u.user_id = ?
      GROUP BY 
        u.user_id, u.user_name, u.office_id, u.user_icon_id, o.office_name, f.file_name, d.department_name
      `,
        [userId]
    );
  }

  const user = userRows[0];
  user.skill_names = user.skill_names ? user.skill_names.split(',') : [];

  return convertToUserForFilter(user);
}

