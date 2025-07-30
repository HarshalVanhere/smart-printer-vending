const express = require('express');
const { v4: uuidv4 } = require('uuid');
const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com';
const mqttClient = mqtt.connect(MQTT_BROKER);

const jobs = {}; // jobId: { status, fileId, printerId, email }

// POST /job { printerId, fileId, email }
router.post('/job', (req, res) => {
  const { printerId, fileId, email } = req.body;
  if (!printerId || !fileId || !email) return res.status(400).json({ error: 'Missing fields' });
  const jobId = uuidv4();
  jobs[jobId] = { status: 'pending', fileId, printerId, email };
  // Publish MQTT command
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${fileId}`;
  mqttClient.publish(`printer/${printerId}/commands`, JSON.stringify({
    job_id: jobId,
    file_url: fileUrl,
    user_id: email
  }));
  res.json({ jobId });
});

// GET /job/:jobId
router.get('/job/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json({ status: job.status });
});

// POST /status { job_id, status }
router.post('/status', (req, res) => {
  const { job_id, status } = req.body;
  if (!jobs[job_id]) return res.status(404).json({ error: 'Job not found' });
  jobs[job_id].status = status;
  // Delete file if printed
  if (status === 'success') {
    const filePath = path.join(__dirname, '../uploads', jobs[job_id].fileId);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  res.json({ success: true });
});

module.exports = router;
module.exports.jobs = jobs; 