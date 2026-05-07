import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService } from '../services/db.service.js';
import { config } from '../config/env.js';
import { activityService } from '../services/activity.service.js';

export const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const db = await dbService.read();
    
    const user = db.users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.role === role
    );

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
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
        email: user.email,
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
    const { name, email, password, role } = req.body;
    const db = await dbService.read();

    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = {
      id: dbService.generateId('U', db.users.map(u => u.id)),
      name: name.trim(),
      email: email.toLowerCase(),
      password: bcrypt.hashSync(password, 10),
      role,
      avatar: ""
    };

    db.users.push(user);
    await dbService.write(db);

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      config.AUTH_SECRET,
      { expiresIn: `${config.TOKEN_TTL_HOURS}h` }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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
    const db = await dbService.read();
    const user = db.users.find(u => u.id === req.user.sub);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || ""
      }
    });
  } catch (error) {
    next(error);
  }
};
