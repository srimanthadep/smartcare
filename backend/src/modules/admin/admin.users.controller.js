import bcrypt from 'bcryptjs';
import { dbService } from '../../core/db/db.service.js';
import { logAudit } from './audit.service.js';

// ── List Users ────────────────────────────────────────────────────────────────
export const listUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Whitelist sort columns
    const allowedSorts = ['name', 'username', 'email', 'role', 'status', 'created_at', 'last_login_at'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let where = 'WHERE is_deleted = FALSE';
    const params = [];
    let paramIdx = 1;

    if (search) {
      where += ` AND (LOWER(name) LIKE $${paramIdx} OR LOWER(username) LIKE $${paramIdx} OR LOWER(email) LIKE $${paramIdx})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIdx++;
    }
    if (role) {
      where += ` AND role = $${paramIdx}`;
      params.push(role);
      paramIdx++;
    }
    if (status) {
      where += ` AND status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    const [usersRes, countRes] = await Promise.all([
      dbService.query(
        `SELECT id, name, username, email, role, avatar, avatar_url, status, last_login_at, created_at
         FROM users ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limitNum, offset]
      ),
      dbService.query(`SELECT COUNT(*) FROM users ${where}`, params),
    ]);

    // Get active session counts per user
    const userIds = usersRes.rows.map(u => u.id);
    let sessionCounts = {};
    if (userIds.length > 0) {
      const sessRes = await dbService.query(
        `SELECT user_id, COUNT(*) as count FROM user_sessions WHERE is_active = TRUE AND user_id = ANY($1) GROUP BY user_id`,
        [userIds]
      );
      sessionCounts = Object.fromEntries(sessRes.rows.map(r => [r.user_id, parseInt(r.count)]));
    }

    const users = usersRes.rows.map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      avatar: u.avatar || u.avatar_url || '',
      status: u.status || 'active',
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
      activeSessions: sessionCounts[u.id] || 0,
    }));

    res.json({
      users,
      total: parseInt(countRes.rows[0].count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    next(error);
  }
};

// ── Create User ───────────────────────────────────────────────────────────────
export const createUser = async (req, res, next) => {
  try {
    const { name, email, username, password, role } = req.body;

    if (!name || !username || !password || !role) {
      return res.status(400).json({ message: 'Name, username, password, and role are required' });
    }

    const allowedRoles = ['admin', 'doctor', 'receptionist'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${allowedRoles.join(', ')}` });
    }

    const checkRes = await dbService.query('SELECT id FROM users WHERE LOWER(username) = $1 AND is_deleted = FALSE', [username.toLowerCase()]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const id = await dbService.generateId('U', 'users');
    const hashedPassword = bcrypt.hashSync(password, 10);

    await dbService.query(
      `INSERT INTO users (id, name, username, email, password, role, avatar, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, name.trim(), username.toLowerCase(), (email || '').toLowerCase(), hashedPassword, role, '', 'active']
    );

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: 'USER_CREATED', entityType: 'user', entityId: id,
      newData: { name, username, role, email },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ message: 'User created successfully', user: { id, name, username, email, role, status: 'active' } });
  } catch (error) {
    next(error);
  }
};

// ── Update User ───────────────────────────────────────────────────────────────
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const oldRes = await dbService.query('SELECT * FROM users WHERE id = $1 AND is_deleted = FALSE', [id]);
    if (oldRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const oldUser = oldRes.rows[0];
    await dbService.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3',
      [name, email, id]
    );

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: 'USER_UPDATED', entityType: 'user', entityId: id,
      oldData: { name: oldUser.name, email: oldUser.email },
      newData: { name: name || oldUser.name, email: email || oldUser.email },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

// ── Change Role ───────────────────────────────────────────────────────────────
export const changeRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['admin', 'doctor', 'receptionist'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${allowedRoles.join(', ')}` });
    }

    const oldRes = await dbService.query('SELECT role, name FROM users WHERE id = $1 AND is_deleted = FALSE', [id]);
    if (oldRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    await dbService.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: 'USER_ROLE_CHANGED', entityType: 'user', entityId: id,
      oldData: { role: oldRes.rows[0].role },
      newData: { role },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: `Role changed to ${role}` });
  } catch (error) {
    next(error);
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const userRes = await dbService.query('SELECT id FROM users WHERE id = $1 AND is_deleted = FALSE', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await dbService.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: 'USER_PASSWORD_RESET', entityType: 'user', entityId: id,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

// ── Change Status (Suspend/Activate) ──────────────────────────────────────────
export const changeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Status must be active or suspended' });
    }

    const oldRes = await dbService.query('SELECT status, name FROM users WHERE id = $1 AND is_deleted = FALSE', [id]);
    if (oldRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    await dbService.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);

    // If suspending, invalidate all sessions
    if (status === 'suspended') {
      await dbService.query('UPDATE user_sessions SET is_active = FALSE, expired_at = NOW() WHERE user_id = $1', [id]);
    }

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: status === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      entityType: 'user', entityId: id,
      oldData: { status: oldRes.rows[0].status },
      newData: { status },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: `User ${status === 'suspended' ? 'suspended' : 'activated'} successfully` });
  } catch (error) {
    next(error);
  }
};

// ── Soft Delete User ──────────────────────────────────────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Prevent self-deletion
    if (id === req.user.sub) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const userRes = await dbService.query('SELECT name FROM users WHERE id = $1 AND is_deleted = FALSE', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    await dbService.query(
      'UPDATE users SET is_deleted = TRUE, deleted_by = $1, deleted_at = NOW(), delete_reason = $2 WHERE id = $3',
      [req.user.sub, reason || null, id]
    );

    // Invalidate sessions
    await dbService.query('UPDATE user_sessions SET is_active = FALSE, expired_at = NOW() WHERE user_id = $1', [id]);

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: 'USER_DELETED', entityType: 'user', entityId: id,
      metadata: { reason: reason || 'No reason provided', userName: userRes.rows[0].name },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ── Restore Deleted User ─────────────────────────────────────────────────────
export const restoreUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const userRes = await dbService.query('SELECT name FROM users WHERE id = $1 AND is_deleted = TRUE', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'Deleted user not found' });

    await dbService.query(
      'UPDATE users SET is_deleted = FALSE, deleted_by = NULL, deleted_at = NULL, delete_reason = NULL, status = $1 WHERE id = $2',
      ['active', id]
    );

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: 'USER_RESTORED', entityType: 'user', entityId: id,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'User restored successfully' });
  } catch (error) {
    next(error);
  }
};

// ── Force Logout All Sessions ─────────────────────────────────────────────────
export const forceLogout = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await dbService.query(
      'UPDATE user_sessions SET is_active = FALSE, expired_at = NOW() WHERE user_id = $1 AND is_active = TRUE',
      [id]
    );

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: 'USER_FORCE_LOGOUT', entityType: 'user', entityId: id,
      metadata: { sessionsRevoked: result.rowCount },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: `${result.rowCount} session(s) revoked` });
  } catch (error) {
    next(error);
  }
};
