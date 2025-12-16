import express from 'express';
import upload from '../utils/cloudinaryConfig.js'; // Lưu ý: phải có .js ở cuối

const router = express.Router();

router.post('/', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.status(200).json({
      message: 'Upload successful',
      imageUrl: req.file.path, 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;