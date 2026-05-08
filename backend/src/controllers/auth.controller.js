import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService } from '../services/db.service.js';
import { config } from '../config/env.js';
import { activityService } from '../services/activity.service.js';

export const login = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    
    const userRes = await dbService.query('SELECT * FROM users WHERE LOWER(username) = $1 AND role = $2', [username.toLowerCase(), role]);
    const user = userRes.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      config.AUTH_SECRET,
      { expiresIn: `${config.TOKEN_TTL_HOURS}h` }
    );

    await activityService.log(user.id, user.name, 'Login', 'User logged in successfully', req.ip);

    res.cookie('AuthToken', token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: config.TOKEN_TTL_HOURS * 3600000
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        avatar: user.avatar || ""
      }
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { name, email, username, password, role } = req.body;
    
    const checkRes = await dbService.query('SELECT id FROM users WHERE LOWER(username) = $1', [username.toLowerCase()]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const id = await dbService.generateId('U', 'users');
    const user = {
      id,
      name: name.trim(),
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: bcrypt.hashSync(password, 10),
      role,
      avatar: ""
    };

    await dbService.query(
      'INSERT INTO users (id, name, username, email, password, role, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [user.id, user.name, user.username, user.email, user.password, user.role, user.avatar]
    );

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      config.AUTH_SECRET,
      { expiresIn: `${config.TOKEN_TTL_HOURS}h` }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        avatar: ""
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const userRes = await dbService.query('SELECT id, name, username, role, avatar FROM users WHERE id = $1', [req.user.sub]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({ user });
  } catch (error) {
    next(error);
  }
};
