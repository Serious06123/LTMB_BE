import express from 'express';
import Message from '../models/Message.js';
import Order from '../models/Order.js';

const router = express.Router();

// GET /api/messages/:orderId?limit=50&offset=0
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const limit = parseInt(req.query.limit || '50', 10);
    const offset = parseInt(req.query.offset || '0', 10);

    const messages = await Message.find({ orderId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('senderId', 'name avatar');

    return res.json({ success: true, messages });
  } catch (err) {
    console.error('GET messages error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/messages/mark-read  { orderId }
router.post('/mark-read', async (req, res) => {
  try {
    const { orderId, userId } = req.body;
    if (!orderId || !userId) return res.status(400).json({ success: false, error: 'Missing params' });

    await Message.updateMany({ orderId, receiverId: userId, isRead: false }, { isRead: true });
    return res.json({ success: true });
  } catch (err) {
    console.error('mark-read error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
