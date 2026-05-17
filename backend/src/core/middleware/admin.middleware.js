/**
 * Admin authorization middleware
 * Restricts access to admin-only endpoints
 */
export const authorizeAdmin = () => {
  return (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  };
};
