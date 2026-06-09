import { TRPCError } from "@trpc/server";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { staff, staffBranches } from "../../drizzle/schema";
import { hashPassword, hashPin } from "../lib/auth";
import { generateEmployeeCode, logAudit } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure, superAdminProcedure } from "../_core/trpc";

const StaffInput = z.object({
  employeeCode: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  firstNameThai: z.string().optional(),
  lastNameThai: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(["super_admin", "staff_admin", "staff"]).optional(),
  primaryBranchId: z.number().int().optional(),
  employmentType: z.enum(["full-time", "part-time", "contract"]).optional(),
  hireDate: z.string().optional(),
  status: z.enum(["active", "inactive", "terminated"]).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  password: z.string().min(6).optional(),
  pin: z.string().length(4).optional(),
});

export const staffRouter = router({
  list: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      role: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      let rows = await db.select({
        id: staff.id,
        employeeCode: staff.employeeCode,
        firstName: staff.firstName,
        lastName: staff.lastName,
        firstNameThai: staff.firstNameThai,
        lastNameThai: staff.lastNameThai,
        email: staff.email,
        phone: staff.phone,
        avatar: staff.avatar,
        role: staff.role,
        primaryBranchId: staff.primaryBranchId,
        employmentType: staff.employmentType,
        hireDate: staff.hireDate,
        status: staff.status,
        lastLoginAt: staff.lastLoginAt,
        createdAt: staff.createdAt,
      }).from(staff);

      if (input?.status) rows = rows.filter((s) => s.status === input.status);
      if (input?.role) rows = rows.filter((s) => s.role === input.role);
      if (input?.branchId && ctx.staff.role !== "super_admin") {
        const branchStaff = await db.select({ staffId: staffBranches.staffId })
          .from(staffBranches).where(eq(staffBranches.branchId, input.branchId));
        const ids = branchStaff.map((b) => b.staffId);
        rows = rows.filter((s) => ids.includes(s.id));
      }

      return rows;
    }),

  getById: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [member] = await db.select({
        id: staff.id,
        employeeCode: staff.employeeCode,
        firstName: staff.firstName,
        lastName: staff.lastName,
        firstNameThai: staff.firstNameThai,
        lastNameThai: staff.lastNameThai,
        email: staff.email,
        phone: staff.phone,
        avatar: staff.avatar,
        role: staff.role,
        primaryBranchId: staff.primaryBranchId,
        employmentType: staff.employmentType,
        hireDate: staff.hireDate,
        status: staff.status,
        emergencyContactName: staff.emergencyContactName,
        emergencyContactPhone: staff.emergencyContactPhone,
        lastLoginAt: staff.lastLoginAt,
        createdAt: staff.createdAt,
      }).from(staff).where(eq(staff.id, input.id)).limit(1);

      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const branches = await db.select().from(staffBranches)
        .where(eq(staffBranches.staffId, input.id));

      return { ...member, branchIds: branches.map((b) => b.branchId) };
    }),

  create: staffAdminProcedure
    .input(StaffInput.required({ firstName: true }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const allStaff = await db.select({ id: staff.id }).from(staff);
      const code = input.employeeCode || generateEmployeeCode(allStaff.length);

      const [result] = await db.insert(staff).values({
        employeeCode: code,
        firstName: input.firstName,
        lastName: input.lastName,
        firstNameThai: input.firstNameThai,
        lastNameThai: input.lastNameThai,
        email: input.email,
        phone: input.phone,
        role: input.role ?? "staff",
        primaryBranchId: input.primaryBranchId,
        employmentType: input.employmentType ?? "full-time",
        hireDate: input.hireDate as any,
        status: "active",
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        passwordHash: input.password ? hashPassword(input.password) : undefined,
        pinHash: input.pin ? hashPin(input.pin) : undefined,
      });

      const id = (result as any).insertId as number;

      if (input.primaryBranchId) {
        await db.insert(staffBranches).values({
          staffId: id,
          branchId: input.primaryBranchId,
          isPrimary: true,
        }).onDuplicateKeyUpdate({ set: { isPrimary: true } });
      }

      const [created] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "staff", entityId: id, afterData: created });
      // Return PIN in plaintext so admin can share it with the new staff
      return { ...created, generatedPin: input.pin || null };
    }),

  update: staffAdminProcedure
    .input(z.object({ id: z.number().int() }).merge(StaffInput))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, password, pin, ...data } = input;

      const updateData: Record<string, unknown> = { ...data };
      if (password) updateData.passwordHash = hashPassword(password);
      if (pin) updateData.pinHash = hashPin(pin);

      await db.update(staff).set(updateData as any).where(eq(staff.id, id));
      const [updated] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "update", entity: "staff", entityId: id });
      return updated;
    }),

  archive: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(staff).set({ status: "inactive" }).where(eq(staff.id, input.id));
      await logAudit({ staff: ctx.staff, action: "archive", entity: "staff", entityId: input.id });
      return { success: true };
    }),

  resetPin: staffAdminProcedure
    .input(z.object({ id: z.number().int(), newPin: z.string().length(4) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(staff).set({ pinHash: hashPin(input.newPin) }).where(eq(staff.id, input.id));
      await logAudit({ staff: ctx.staff, action: "reset_pin", entity: "staff", entityId: input.id });
      return { success: true, newPin: input.newPin };
    }),

  // Return hasPin status for getById
  getByIdWithPinStatus: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [member] = await db.select({
        id: staff.id,
        pinHash: staff.pinHash,
      }).from(staff).where(eq(staff.id, input.id)).limit(1);
      return { hasPin: !!member?.pinHash };
    }),

  resetPassword: staffAdminProcedure
    .input(z.object({ id: z.number().int(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(staff).set({ passwordHash: hashPassword(input.newPassword) }).where(eq(staff.id, input.id));
      return { success: true };
    }),

  assignToBranches: staffAdminProcedure
    .input(z.object({ staffId: z.number().int(), branchIds: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Remove existing and re-add
      await db.delete(staffBranches).where(eq(staffBranches.staffId, input.staffId));
      if (input.branchIds.length > 0) {
        await db.insert(staffBranches).values(
          input.branchIds.map((branchId, i) => ({
            staffId: input.staffId,
            branchId,
            isPrimary: i === 0,
          }))
        );
      }
      return { success: true };
    }),

  changeRole: superAdminProcedure
    .input(z.object({ id: z.number().int(), role: z.enum(["super_admin", "staff_admin", "staff"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(staff).set({ role: input.role }).where(eq(staff.id, input.id));
      const [updated] = await db.select().from(staff).where(eq(staff.id, input.id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "change_role", entity: "staff", entityId: input.id });
      return updated;
    }),

  // Staff can view their own profile
  getMyProfile: staffProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [me] = await db.select({
      id: staff.id,
      employeeCode: staff.employeeCode,
      firstName: staff.firstName,
      lastName: staff.lastName,
      firstNameThai: staff.firstNameThai,
      lastNameThai: staff.lastNameThai,
      email: staff.email,
      phone: staff.phone,
      avatar: staff.avatar,
      role: staff.role,
      primaryBranchId: staff.primaryBranchId,
      employmentType: staff.employmentType,
      hireDate: staff.hireDate,
      status: staff.status,
      pinHash: staff.pinHash,
    }).from(staff).where(eq(staff.id, ctx.staff.staffId)).limit(1);
    if (!me) throw new TRPCError({ code: "NOT_FOUND" });
    const branches = await db.select().from(staffBranches)
      .where(eq(staffBranches.staffId, ctx.staff.staffId));
    return {
      ...me,
      pinHash: undefined,
      hasPin: !!me.pinHash,
      branchIds: branches.map((b) => b.branchId),
    };
  }),

  // Staff can view their own PIN (last 4 digits masked)
  getMyPin: staffProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [me] = await db.select({ pinHash: staff.pinHash }).from(staff)
      .where(eq(staff.id, ctx.staff.staffId)).limit(1);
    return { hasPin: !!me?.pinHash };
  }),

  // Set own PIN
  setMyPin: staffProcedure
    .input(z.object({ newPin: z.string().length(4) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(staff).set({ pinHash: hashPin(input.newPin) }).where(eq(staff.id, ctx.staff.staffId));
      return { success: true };
    }),
});
