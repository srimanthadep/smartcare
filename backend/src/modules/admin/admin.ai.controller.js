import { dbService } from '../../core/db/db.service.js';

export const getAIAnalytics = async (req, res, next) => {
  try {
    const [totalRes, todayRes, failedRes, toolsRes, costRes, avgTimeRes, recentRes] = await Promise.all([
      dbService.query('SELECT COUNT(*) FROM ai_usage_logs'),
      dbService.query(`SELECT COUNT(*) FROM ai_usage_logs WHERE created_at > NOW() - INTERVAL '24 hours'`),
      dbService.query('SELECT COUNT(*) FROM ai_usage_logs WHERE success = FALSE'),
      dbService.query(`SELECT tool, COUNT(*) as count, SUM(tokens_used) as tokens, SUM(estimated_cost) as cost FROM ai_usage_logs GROUP BY tool ORDER BY count DESC`),
      dbService.query('SELECT COALESCE(SUM(estimated_cost), 0) as total, COALESCE(SUM(tokens_used), 0) as tokens FROM ai_usage_logs'),
      dbService.query('SELECT COALESCE(AVG(response_time_ms), 0) as avg_time FROM ai_usage_logs WHERE success = TRUE'),
      dbService.query('SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 20'),
    ]);
    const dailyRes = await dbService.query(
      `SELECT DATE(created_at) as day, COUNT(*) as requests, SUM(tokens_used) as tokens
       FROM ai_usage_logs WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY day`
    );
    res.json({
      totalRequests: parseInt(totalRes.rows[0].count),
      requestsToday: parseInt(todayRes.rows[0].count),
      failedRequests: parseInt(failedRes.rows[0].count),
      totalTokens: parseInt(costRes.rows[0].tokens),
      totalCost: Number(costRes.rows[0].total),
      avgResponseTime: Math.round(Number(avgTimeRes.rows[0].avg_time)),
      toolBreakdown: toolsRes.rows.map(r => ({ tool: r.tool, count: parseInt(r.count), tokens: parseInt(r.tokens), cost: Number(r.cost) })),
      dailyTrend: dailyRes.rows.map(r => ({ day: r.day, requests: parseInt(r.requests), tokens: parseInt(r.tokens) })),
      recentRequests: recentRes.rows.map(r => ({
        id: r.id, userId: r.user_id, userName: r.user_name, tool: r.tool,
        tokensUsed: r.tokens_used, estimatedCost: Number(r.estimated_cost),
        responseTimeMs: r.response_time_ms, success: r.success,
        errorMessage: r.error_message, createdAt: r.created_at,
      })),
    });
  } catch (error) { next(error); }
};
