const router = require('express').Router();
const XmlController = require('../controllers/xmlController');
const { authenticate } = require('../middleware/auth');

router.get('/raw/:file', authenticate, XmlController.getRaw);
router.get('/transform/:file', authenticate, XmlController.transform);

module.exports = router;
