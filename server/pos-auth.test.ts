import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("posAuth", () => {
  it("loginWithPin rejects invalid PIN with UNAUTHORIZED", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.posAuth.loginWithPin({ branchId: 1, pin: "0000" })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("loginWithEmployeeCode rejects invalid credentials", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.posAuth.loginWithEmployeeCode({
        employeeCode: "INVALID",
        password: "wrong",
      })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
