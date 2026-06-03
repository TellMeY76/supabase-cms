import Link from "next/link";
import { deleteUserAction, updateUserRoleAction } from "@/app/(admin)/admin/actions";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { requireAdminRole } from "@/lib/auth";
import { listAdminUsers } from "@/lib/admin-data";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase";
import type { UserRole } from "@global-trade/core";

const roles: UserRole[] = ["owner", "admin", "editor", "sales", "viewer"];

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [{ error, success }, session, users] = await Promise.all([
    searchParams,
    requireAdminRole(["owner", "admin"]),
    listAdminUsers()
  ]);
  const hasServiceRole = isSupabaseServiceRoleConfigured();

  return (
    <div>
      <div className="payload-page-header">
        <div>
          <h1>Users</h1>
          <p>Create users, assign roles, and remove accounts.</p>
        </div>
        <div className="payload-page-actions">
          <RefreshButton />
          <Link className="payload-button" href="/admin/users/new">
            New User
          </Link>
        </div>
      </div>

      {!hasServiceRole && (
        <div className="payload-alert payload-alert--warning">
          <strong>Service role key missing.</strong>
          <span>Create and delete are disabled until SUPABASE_SERVICE_ROLE_KEY is set on the server.</span>
        </div>
      )}
      {error && <div className="payload-alert payload-alert--danger">{error}</div>}
      {success && <div className="payload-alert payload-alert--success">{success}</div>}

      <div className="payload-table-wrap">
        <table className="payload-table payload-table--users">
          <thead>
            <tr>
              <th>User</th>
              <th>Name</th>
              <th>Role</th>
              <th>Created</th>
              <th>Last sign in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === session.user.id;
              const canManageThisUser = session.profile.role === "owner" || user.role !== "owner";
              const roleOptions = session.profile.role === "owner" ? roles : roles.filter((role) => role !== "owner");
              const roleSelectDisabled = !canManageThisUser || isSelf;
              const canDelete = hasServiceRole && user.hasAuthUser && canManageThisUser && !isSelf;

              return (
                <tr key={user.id}>
                  <td>
                    <div className="payload-user-cell">
                      <strong>{user.email || "No email"}</strong>
                      <span>{user.id}</span>
                    </div>
                  </td>
                  <td>
                    <form action={updateUserRoleAction} className="payload-inline-form" id={`user-${user.id}`}>
                      <input name="id" type="hidden" value={user.id} />
                      {roleSelectDisabled && <input name="role" type="hidden" value={user.role} />}
                      <input
                        aria-label={`Name for ${user.email}`}
                        disabled={!canManageThisUser}
                        name="fullName"
                        defaultValue={user.fullName ?? ""}
                        placeholder="Full name"
                      />
                    </form>
                  </td>
                  <td>
                    <select
                      aria-label={`Role for ${user.email}`}
                      defaultValue={user.role}
                      disabled={roleSelectDisabled}
                      form={`user-${user.id}`}
                      name="role"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>{user.lastSignInAt ? formatDate(user.lastSignInAt) : "Never"}</td>
                  <td>
                    <div className="payload-table-actions">
                      <button className="payload-button payload-button--small" disabled={!canManageThisUser} form={`user-${user.id}`} type="submit">
                        Save
                      </button>
                      <form action={deleteUserAction}>
                        <input name="id" type="hidden" value={user.id} />
                        <button
                          className="payload-button payload-button--danger payload-button--small"
                          disabled={!canDelete}
                          title={deleteTitle({ hasServiceRole, hasAuthUser: user.hasAuthUser, isSelf, canManageThisUser })}
                          type="submit"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td className="payload-empty-cell" colSpan={6}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function deleteTitle({
  hasServiceRole,
  hasAuthUser,
  isSelf,
  canManageThisUser
}: {
  hasServiceRole: boolean;
  hasAuthUser: boolean;
  isSelf: boolean;
  canManageThisUser: boolean;
}) {
  if (!hasServiceRole) return "SUPABASE_SERVICE_ROLE_KEY is required.";
  if (!hasAuthUser) return "Auth user data is unavailable.";
  if (isSelf) return "You cannot delete your own account.";
  if (!canManageThisUser) return "Only owners can delete owner accounts.";
  return "Delete user";
}
