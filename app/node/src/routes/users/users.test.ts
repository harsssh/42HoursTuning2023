import express from "express";
import request from "supertest";
import { execSync } from "child_process";
import { app } from "../../app";
import { getFileByFileId } from "../files/repository";
import { getUsers, getUserByUserId } from "./repository";
import {
  mockUsersList,
  mockLoginUser,
  mockFileRecord,
  mockBuffer,
  mockFile,
  mockSearchedUsers,
} from "../../model/mock";
import { getUsersByKeyword } from "./usecase";
import { Target } from "../../model/types";

jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

jest.mock("../files/repository", () => ({
  getFileByFileId: jest.fn(),
}));

jest.mock("./repository", () => ({
  getUsers: jest.fn(),
  getUserByUserId: jest.fn(),
}));

jest.mock("./usecase", () => ({
  getUsersByKeyword: jest.fn(),
}));

jest.mock("../../middleware/auth", () => ({
  checkAuthMiddleware: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction
  ) => {
    req.headers["X-DA-USER-ID"] = mockLoginUser.userId;
    next();
  },
}));

describe("GET /api/v1/users/user-icon/{userIconId}", () => {
  const userIconId = "userIconId";

  test("OK", async () => {
    const mockGetFileByFileId = getFileByFileId as jest.Mock;
    mockGetFileByFileId.mockReturnValue(mockFileRecord);

    const mockExecSync = execSync as jest.Mock;
    mockExecSync.mockReturnValue(mockBuffer);

    const res = await request(app).get(`/api/v1/users/user-icon/${userIconId}`);
    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual(mockFile);
    expect(mockGetFileByFileId).toHaveBeenCalledWith(userIconId);
    expect(mockExecSync).toHaveBeenCalledWith(
      `convert ${mockFileRecord.path} -resize 500x500! PNG:-`,
      { shell: "/bin/bash" }
    );
  });

  test("NG: user icon not found", async () => {
    const mockGetFileByUserId = getFileByFileId as jest.Mock;
    mockGetFileByUserId.mockReturnValue(undefined);

    const res = await request(app).get(`/api/v1/users/user-icon/${userIconId}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      message:
        "指定されたユーザーアイコンIDのユーザーアイコン画像が見つかりません。",
    });
    expect(mockGetFileByUserId).toHaveBeenCalledWith(userIconId);
  });

  test("NG: unexpected error occurred", async () => {
    const mockGetFileByUserId = getFileByFileId as jest.Mock;
    mockGetFileByUserId.mockImplementation(() => {
      throw new Error();
    });

    const res = await request(app).get(`/api/v1/users/user-icon/${userIconId}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      message: "Internal Server Error",
    });
    expect(mockGetFileByUserId).toHaveBeenCalledWith(userIconId);
  });
});

describe("GET /api/v1/users", () => {
  test("OK", async () => {
    const limit = 20;
    const offset = 0;

    const mockGetUsers = getUsers as jest.Mock;
    mockGetUsers.mockReturnValue(mockUsersList);

    const res = await request(app).get("/api/v1/users").query({
      limit: limit,
      offset: offset,
    });

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual(mockUsersList);
    expect(mockGetUsers).toHaveBeenCalledWith(limit, offset);
  });

  test("OK: limit and offset not specified", async () => {
    const mockGetUsers = getUsers as jest.Mock;
    mockGetUsers.mockReturnValue(mockUsersList);

    const res = await request(app).get("/api/v1/users");

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual(mockUsersList);
    expect(mockGetUsers).toHaveBeenCalledWith(20, 0);
  });

  test("OK: limit and offset not number", async () => {
    const limit = true;
    const offset = "string";

    const mockGetUsers = getUsers as jest.Mock;
    mockGetUsers.mockReturnValue(mockUsersList);

    const res = await request(app).get("/api/v1/users").query({
      limit: limit,
      offset: offset,
    });

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual(mockUsersList);
    expect(mockGetUsers).toHaveBeenCalledWith(20, 0);
  });

  test("OK: limit grater than 100 and offset less than 0", async () => {
    const limit = 999;
    const offset = -999;

    const mockGetUsers = getUsers as jest.Mock;
    mockGetUsers.mockReturnValue(mockUsersList);

    const res = await request(app).get("/api/v1/users").query({
      limit: limit,
      offset: offset,
    });

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual(mockUsersList);
    expect(mockGetUsers).toHaveBeenCalledWith(20, 0);
  });

  test("NG: unexpected error occurred", async () => {
    const mockGetUsers = getUsers as jest.Mock;
    mockGetUsers.mockImplementation(() => {
      throw new Error();
    });

    const res = await request(app).get("/api/v1/users");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
    expect(mockGetUsers).toHaveBeenCalledWith(20, 0);
  });
});

describe("GET /api/v1/users/search", () => {
  const targets: Target[] = [
    "userName",
    "kana",
    "mail",
    "department",
    "role",
    "office",
    "skill",
    "goal",
  ];
  test("OK: offset 0, limit 20", async () => {
    const mockGetUsersByKeyword = getUsersByKeyword as jest.Mock;
    mockGetUsersByKeyword.mockReturnValue(mockSearchedUsers);

    const res = await request(app).get("/api/v1/users/search").query({
      q: "test",
    });

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual(mockUsersList);
    expect(mockGetUsersByKeyword).toHaveBeenCalledWith("test", targets);
  });

  test("OK: offset 0, limit 1", async () => {
    const mockGetUsersByKeyword = getUsersByKeyword as jest.Mock;
    mockGetUsersByKeyword.mockReturnValue(mockSearchedUsers);

    const res = await request(app).get("/api/v1/users/search").query({
      q: "test",
      limit: 1,
    });

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual([mockUsersList[0]]);
    expect(mockGetUsersByKeyword).toHaveBeenCalledWith("test", targets);
  });

  test("OK: offset 1, limit 20", async () => {
    const mockGetUsersByKeyword = getUsersByKeyword as jest.Mock;
    mockGetUsersByKeyword.mockReturnValue(mockSearchedUsers);

    const res = await request(app).get("/api/v1/users/search").query({
      q: "test",
      offset: 1,
    });

    const [, ...expected] = mockUsersList;

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual(expected);
    expect(mockGetUsersByKeyword).toHaveBeenCalledWith("test", targets);
  });

  test("OK: no user found", async () => {
    const mockGetUsersByKeyword = getUsersByKeyword as jest.Mock;
    mockGetUsersByKeyword.mockReturnValue([]);

    const res = await request(app).get("/api/v1/users/search").query({
      q: "test",
    });

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual([]);
    expect(mockGetUsersByKeyword).toHaveBeenCalledWith("test", targets);
  });

  test("OK: return unique list", async () => {
    const mockGetUsersByKeyword = getUsersByKeyword as jest.Mock;
    mockGetUsersByKeyword.mockReturnValue([
      ...mockSearchedUsers,
      ...mockSearchedUsers,
    ]);

    const res = await request(app).get("/api/v1/users/search").query({
      q: "test",
    });

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual(mockUsersList);
    expect(mockGetUsersByKeyword).toHaveBeenCalledWith("test", targets);
  });

  test("NG: query not specified", async () => {
    const res = await request(app).get("/api/v1/users/search");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "検索キーワードを指定してください。" });
  });

  test("NG: query specified more than one", async () => {
    const res = await request(app)
      .get("/api/v1/users/search")
      .query({
        q: ["test", "hello"],
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: "検索キーワードは1つのみ指定してください。",
    });
  });

  test("NG: query too short", async () => {
    const res = await request(app).get("/api/v1/users/search").query({
      q: "t",
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: "検索キーワードは2文字以上50文字以下で指定してください。",
    });
  });

  test("NG: query too long", async () => {
    const res = await request(app)
      .get("/api/v1/users/search")
      .query({
        q: "t".repeat(51),
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: "検索キーワードは2文字以上50文字以下で指定してください。",
    });
  });

  test("NG: invalid target specified", async () => {
    const res = await request(app).get("/api/v1/users/search").query({
      q: "test",
      target: "invalid",
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "不正なtargetが指定されています。" });
  });

  test("NG: unexpected error occurred", async () => {
    const mockGetUsersByKeyword = getUsersByKeyword as jest.Mock;
    mockGetUsersByKeyword.mockImplementation(() => {
      throw new Error();
    });

    const res = await request(app).get("/api/v1/users/search").query({
      q: "test",
    });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
    expect(mockGetUsersByKeyword).toHaveBeenCalledWith("test", targets);
  });
});

describe("GET /api/v1/users/login-user", () => {
  test("OK", async () => {
    const mockGetUserByUserId = getUserByUserId as jest.Mock;
    mockGetUserByUserId.mockReturnValue(mockLoginUser);

    const res = await request(app).get("/api/v1/users/login-user");

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual(mockLoginUser);
    expect(mockGetUserByUserId).toHaveBeenCalledWith(mockLoginUser.userId);
  });

  test("NG: session user not exist", async () => {
    const mockGetUserByUserId = getUserByUserId as jest.Mock;
    mockGetUserByUserId.mockReturnValue(undefined);

    const res = await request(app).get("/api/v1/users/login-user");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "ユーザーが見つかりませんでした。" });
    expect(mockGetUserByUserId).toHaveBeenCalledWith(mockLoginUser.userId);
  });

  test("NG: unexpected error occurred", async () => {
    const mockGetUserByUserId = getUserByUserId as jest.Mock;
    mockGetUserByUserId.mockImplementation(() => {
      throw new Error();
    });

    const res = await request(app).get("/api/v1/users/login-user");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
    expect(mockGetUserByUserId).toHaveBeenCalledWith(mockLoginUser.userId);
  });
});
