const express = require('express');
const { v4: uuidv4 } = require('uuid');
const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('./auth');
const router = express.Router();

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com';
let mqttClient;

// Initialize MQTT with proper error handling
try {
  mqttClient = mqtt.connect(MQTT_BROKER);
  
  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
  });
  
  mqttClient.on('error', (error) => {
    console.error('MQTT connection error:', error);
  });
  
  mqttClient.on('reconnect', () => {
    console.log('Reconnecting to MQTT broker');
  });
} catch (error) {
  console.error('Failed to initialize MQTT client:', error);
}

const jobs = {}; // jobId: { status, fileId, printerId, prn, createdAt }

// POST /job { printerId, fileId } - prn comes from JWT
router.post('/job', authenticateToken, (req, res) => {
  try {
    const { printerId, fileId } = req.body;
    const prn = req.user.prn; // Get from authenticated user
    
    if (!printerId || !fileId) {
      return res.status(400).json({ error: 'printerId and fileId are required' });
    }
    
    // Validate printerId format
    if (typeof printerId !== 'string' || printerId.length < 3) {
      return res.status(400).json({ error: 'Invalid printerId' });
    }
    
    // Check if file exists
    const filePath = path.join(__dirname, '../uploads', fileId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const jobId = uuidv4();
    jobs[jobId] = { 
      status: 'pending', 
      fileId, 
      printerId, 
      prn,
      createdAt: new Date().toISOString()
    };
    
    // Publish MQTT command with error handling
    if (mqttClient && mqttClient.connected) {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${fileId}`;
      const command = {
        job_id: jobId,
        file_url: fileUrl,
        user_prn: prn,
        timestamp: new Date().toISOString()
      };
      
      mqttClient.publish(`printer/${printerId}/commands`, JSON.stringify(command), (error) => {
        if (error) {
          console.error('Failed to publish MQTT message:', error);
          jobs[jobId].status = 'failed';
        }
      });
    } else {
      console.error('MQTT client not connected');
      jobs[jobId].status = 'failed';
      return res.status(503).json({ error: 'Print service unavailable' });
    }
    
    res.json({ jobId, status: jobs[jobId].status });
  } catch (error) {
    console.error('Error creating print job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /job/:jobId
router.get('/job/:jobId', authenticateToken, (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobs[jobId];
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Users can only see their own jobs
    if (job.prn !== req.user.prn) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ 
      jobId,
      status: job.status,
      createdAt: job.createdAt,
      printerId: job.printerId
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /jobs - Get all jobs for authenticated user
router.get('/jobs', authenticateToken, (req, res) => {
  try {
    const userJobs = Object.entries(jobs)
      .filter(([_, job]) => job.prn === req.user.prn)
      .map(([jobId, job]) => ({
        jobId,
        status: job.status,
        createdAt: job.createdAt,
        printerId: job.printerId
      }));
    
    res.json({ jobs: userJobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /status - For printers to update job status
router.post('/status', (req, res) => {
  try {
    const { job_id, status } = req.body;
    
    if (!job_id || !status) {
      return res.status(400).json({ error: 'job_id and status are required' });
    }
    
    if (!jobs[job_id]) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const validStatuses = ['pending', 'printing', 'success', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    jobs[job_id].status = status;
    jobs[job_id].updatedAt = new Date().toISOString();
    
    // Delete file if printed successfully or failed
    if (status === 'success' || status === 'failed') {
      try {
        const filePath = path.join(__dirname, '../uploads', jobs[job_id].fileId);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`File deleted: ${jobs[job_id].fileId}`);
        }
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Don't fail the request if file deletion fails
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
module.exports.jobs = jobs;