const LogModel = require('../models/LogModel');

const LogController = {
  async getAll(_req, res) {
    try {
      const logs = await LogModel.findAll();
      res.json(logs.reverse());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = LogController;
