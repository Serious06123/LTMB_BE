import express from 'express';
import { 
  findPlace, 
  autocomplete, 
  geocode, 
  placeDetail, 
  direction ,
  reverseGeocode
} from '../controllers/mapController.js';

const router = express.Router();

// Định nghĩa các endpoint
// Lưu ý: ở server.js ta sẽ mount router này vào đường dẫn gốc '/api'
// nên ở đây chỉ cần khai báo phần đuôi.

router.get('/place/find', findPlace);
router.get('/place/autocomplete', autocomplete);
router.get('/geocode', geocode);
router.get('/place/detail', placeDetail);
router.get('/direction', direction);
router.get('/geocode/reverse', reverseGeocode);

export default router;