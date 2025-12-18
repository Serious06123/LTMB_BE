import express from 'express';
import crypto from 'crypto';
import Order from '../models/Order.js';

const router = express.Router();

// GET /vnpay-return
router.get('/return', async (req, res) => {
  try {
    const vnpData = { ...req.query };
    const vnpSecureHash = vnpData.vnp_SecureHash;
    delete vnpData.vnp_SecureHash;

    const VNP_SECRET = process.env.VNP_HASH_SECRET || process.env.VNP_SECRET || '';
    if (!VNP_SECRET) {
      console.error('VNP_SECRET not set');
      return res.status(500).send('Server misconfigured');
    }

    // build signData
    const sorted = Object.keys(vnpData).sort().reduce((r, k) => { r[k] = vnpData[k]; return r; }, {});
    const signData = Object.keys(sorted).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(sorted[k])}`).join('&');
    const hmac = crypto.createHmac('sha512', VNP_SECRET);
    const secureHash = hmac.update(signData).digest('hex');

    if (secureHash !== vnpSecureHash) {
      console.warn('Invalid VNPAY signature');
      return res.send('<html><body><h1>Invalid signature</h1></body></html>');
    }

    const responseCode = vnpData.vnp_ResponseCode;
    const orderId = vnpData.vnp_TxnRef;

    if (!orderId) {
      return res.send('<html><body><h1>Missing order reference</h1></body></html>');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.send('<html><body><h1>Order not found</h1></body></html>');
    }

    if (responseCode === '00') {
      order.paymentStatus = 'paid';
      order.status = 'preparing';
      await order.save();
      // You can redirect to a web success page or deep-link back to app
      return res.send('<html><body><h1>Payment success</h1><script>setTimeout(()=>window.close(),1500)</script></body></html>');
    } else {
      order.paymentStatus = 'failed';
      await order.save();
      return res.send('<html><body><h1>Payment failed</h1></body></html>');
    }
  } catch (err) {
    console.error('VNPAY return error', err);
    return res.status(500).send('Server error');
  }
});

export default router;
