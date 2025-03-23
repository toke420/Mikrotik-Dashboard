// Create a routers.js file
module.exports = [
  { 
    id: 1, 
    name: 'TMK-Home-RT01', 
    ip: process.env.ROUTER1_IP, 
    username: process.env.ROUTER1_USER, 
    password: process.env.ROUTER1_PASSWORD, 
    model: 'hAP ac2',
    clientName: 'TeekaY'
  },
  // Add other routers
];
