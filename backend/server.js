// First, require all dependencies
const express = require('express');
const cors = require('cors');
const { RouterOSAPI } = require('node-routeros');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Console log to confirm environment variables are loaded
console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT || '3001 (default)');
console.log('ROUTER1_IP:', process.env.ROUTER1_IP || 'Not set');
console.log('ROUTER1_NAME:', process.env.ROUTER1_NAME || 'Not set');
console.log('ROUTER1_MODEL:', process.env.ROUTER1_MODEL || 'Not set');
console.log('ROUTER1_CLIENT:', process.env.ROUTER1_CLIENT || 'Not set');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Function to load router list from environment variables
function loadRoutersFromEnv() {
  const routers = [];
  let routerIndex = 1;
  
  // Keep checking for environment variables until no more are found
  while (process.env[`ROUTER${routerIndex}_IP`]) {
    routers.push({
      id: routerIndex,
      name: process.env[`ROUTER${routerIndex}_NAME`] || `Router-${routerIndex}`,
      ip: process.env[`ROUTER${routerIndex}_IP`],
      username: process.env[`ROUTER${routerIndex}_USER`] || 'admin',
      password: process.env[`ROUTER${routerIndex}_PASSWORD`] || '',
      model: process.env[`ROUTER${routerIndex}_MODEL`] || 'Unknown',
      clientName: process.env[`ROUTER${routerIndex}_CLIENT`] || 'Unknown Client'
    });
    
    routerIndex++;
  }
  
  // If no routers were found in env variables, log a warning
  if (routers.length === 0) {
    console.warn('No router configurations found in environment variables. Please check your .env file.');
  } else {
    console.log(`Loaded ${routers.length} router configurations from environment variables.`);
  }
  
  return routers;
}

// Load router configurations
const routerList = loadRoutersFromEnv();

// Get all routers
app.get('/api/routers', (req, res) => {
  // Return router info without sensitive data
  const safeRouters = routerList.map(router => ({
    id: router.id,
    name: router.name,
    ip: router.ip,
    model: router.model,
    clientName: router.clientName,
    status: 'unknown' // Will be updated with real status
  }));
  
  res.json(safeRouters);
});

// Get router status
app.get('/api/routers/status', async (req, res) => {
  try {
    const routerStatus = [];
    
    // For each router, check if it's online
    for (const router of routerList) {
      try {
        const connection = new RouterOSAPI({
          host: router.ip,
          user: router.username,
          password: router.password,
          timeout: 5000 // 5 second timeout
        });
        
        await connection.connect();
        
        // If connection successful, router is online
        const systemResource = await connection.write('/system/resource/print');
        const version = await connection.write('/system/package/update/print');
        
        routerStatus.push({
          id: router.id,
          status: 'online',
          version: systemResource[0]?.version || 'unknown',
          uptime: systemResource[0]?.uptime || 'unknown',
          cpuLoad: systemResource[0]?.['cpu-load'] || 0
        });
        
        connection.close();
      } catch (error) {
        // If connection fails, router is offline
        routerStatus.push({
          id: router.id,
          status: 'offline',
          error: error.message
        });
      }
    }
    
    res.json(routerStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all interfaces for all routers
app.get('/api/interfaces', async (req, res) => {
  try {
    const allInterfaces = [];
    
    for (const router of routerList) {
      try {
        const connection = new RouterOSAPI({
          host: router.ip,
          user: router.username,
          password: router.password,
          timeout: 5000
        });
        
        await connection.connect();
        
        // Get list of interfaces with their traffic counters
        const interfaces = await connection.write('/interface/print');
        
        // Debug: log first interface to see structure
        if (interfaces.length > 0) {
          console.log(`Sample interface data from router ${router.name}:`, 
            JSON.stringify(interfaces[0], null, 2));
        }
        
        // Get traffic data for each interface
        for (const iface of interfaces) {
          // Skip disabled interfaces
          if (iface.disabled === 'true') continue;
          
          // Get monitor traffic data for current rates
          const monitorCommand = [
            '=interface=' + iface.name,
            '=once='
          ];
          
          const trafficData = await connection.write('/interface/monitor-traffic', monitorCommand);
          
          // Add interface to the list with both total counters and current rates
          allInterfaces.push({
            id: `${router.id}-${iface.name}`,
            routerId: router.id,
            name: iface.name,
            type: iface.type || 'unknown',
            // Use traffic counters from /interface/print for totals
            rxBytes: formatBytes(parseInt(iface['rx-byte'] || 0)),
            txBytes: formatBytes(parseInt(iface['tx-byte'] || 0)),
            // Use monitor-traffic for current rates
            rxRate: formatBits(trafficData[0]?.['rx-bits-per-second'] || 0),
            txRate: formatBits(trafficData[0]?.['tx-bits-per-second'] || 0),
            status: iface.running === 'true' ? 'up' : 'down'
          });
        }
        
        connection.close();
      } catch (error) {
        console.error(`Error fetching interfaces for router ${router.name}:`, error.message);
        // Continue with next router
      }
    }
    
    res.json(allInterfaces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions to format data
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatBits(bits) {
  if (bits === 0) return '0 bps';
  
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
  const i = Math.floor(Math.log(bits) / Math.log(1000));
  
  return parseFloat((bits / Math.pow(1000, i)).toFixed(2)) + ' ' + sizes[i];
}

// Start the server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
