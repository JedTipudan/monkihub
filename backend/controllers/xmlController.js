const { getRawXml, transformXslt } = require('../services/xmlService');

const XmlController = {
  async getRaw(req, res) {
    try {
      const { file } = req.params;
      const allowed = ['messages.xml', 'tasks.xml', 'logs.xml'];
      if (!allowed.includes(file)) return res.status(400).json({ error: 'Invalid file' });
      const xml = await getRawXml(file);
      res.set('Content-Type', 'application/xml').send(xml);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async transform(req, res) {
    try {
      const { file } = req.params;
      const allowed = ['messages', 'tasks', 'logs'];
      if (!allowed.includes(file)) return res.status(400).json({ error: 'Invalid file' });
      const html = await transformXslt(`${file}.xml`, `${file}.xslt`);
      res.set('Content-Type', 'text/html').send(html);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = XmlController;
