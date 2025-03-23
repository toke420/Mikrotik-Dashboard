import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, ArrowUpDown, Download, Settings, Filter } from 'lucide-react';

// API URL - change this to match your backend server location
const API_URL = 'http://localhost:3001/api';

export default function MikrotikDashboard() {
  const [activeTab, setActiveTab] = useState('interfaces');
  const [routers, setRouters] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedRouterId, setSelectedRouterId] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('All Clients');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [interfaceStatusFilter, setInterfaceStatusFilter] = useState('All Statuses');
  const [selectedInterfaces, setSelectedInterfaces] = useState([]);
  const [isFilteringInterfaces, setIsFilteringInterfaces] = useState(false);
  
  // Function to fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch routers
      const routersResponse = await fetch(`${API_URL}/routers`);
      const routersData = await routersResponse.json();
      
      // Fetch router status and merge with router data
      const statusResponse = await fetch(`${API_URL}/routers/status`);
      const statusData = await statusResponse.json();
      
      // Combine router info with status
      const routersWithStatus = routersData.map(router => {
        const status = statusData.find(s => s.id === router.id) || { status: 'unknown' };
        return { ...router, ...status };
      });
      
      setRouters(routersWithStatus);
      
      // Fetch interfaces
      const interfacesResponse = await fetch(`${API_URL}/interfaces`);
      const interfacesData = await interfacesResponse.json();
      setInterfaces(interfacesData);
      
      setLastUpdated(new Date());
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data. Please check your connection to the API server.");
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);
  
  // Set up polling for real-time updates (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(interval); // Clean up on unmount
  }, []);
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchData();
  };
  
  // Handle router details click
  const handleRouterDetails = (routerId) => {
    setSelectedRouterId(routerId);
    setActiveTab('interfaces');
    setSelectedInterfaces([]);
    setIsFilteringInterfaces(false);
  };
  
  // Handle interface selection
  const handleInterfaceSelect = (interfaceId) => {
    setSelectedInterfaces(prev => {
      if (prev.includes(interfaceId)) {
        // If already selected, remove it
        return prev.filter(id => id !== interfaceId);
      } else {
        // If not selected, add it
        return [...prev, interfaceId];
      }
    });
  };
  
  // Handle apply interface filter
  const handleApplyInterfaceFilter = () => {
    setIsFilteringInterfaces(selectedInterfaces.length > 0);
  };
  
  // Handle clear interface filter
  const handleClearInterfaceFilter = () => {
    setSelectedInterfaces([]);
    setIsFilteringInterfaces(false);
  };
  
  // Get unique client names for filter dropdown
  const clientNames = [...new Set(routers.map(router => router.clientName))];
  
  // Filtered interfaces
  const filteredInterfaces = interfaces.filter(iface => {
    const router = routers.find(r => r.id === iface.routerId);
    
    // Skip if no matching router
    if (!router) return false;
    
    // Filter by selected router if one is selected
    if (selectedRouterId !== null && iface.routerId !== selectedRouterId) {
      return false;
    }
    
    // Filter by selected interfaces if filtering is active
    if (isFilteringInterfaces && !selectedInterfaces.includes(iface.id)) {
      return false;
    }
    
    // Search term filter
    const matchesSearch = 
      iface.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      router.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      router.ip.includes(searchTerm);
    
    // Client filter
    const matchesClient = 
      clientFilter === 'All Clients' || 
      router.clientName === clientFilter;
    
    // Status filter
    const matchesStatus = 
      statusFilter === 'All Statuses' || 
      (statusFilter === 'Online' && iface.status === 'up') ||
      (statusFilter === 'Offline' && iface.status === 'down');
      
    // Interface status filter
    const matchesInterfaceStatus = 
      interfaceStatusFilter === 'All Statuses' ||
      (interfaceStatusFilter === 'Up' && iface.status === 'up') ||
      (interfaceStatusFilter === 'Down' && iface.status === 'down');
    
    return matchesSearch && matchesClient && matchesStatus && matchesInterfaceStatus;
  });
  
  // Filtered routers
  const filteredRouters = routers.filter(router => {
    // Search term filter
    const matchesSearch = 
      router.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      router.ip.includes(searchTerm);
    
    // Client filter
    const matchesClient = 
      clientFilter === 'All Clients' || 
      router.clientName === clientFilter;
    
    // Status filter
    const matchesStatus = 
      statusFilter === 'All Statuses' || 
      (statusFilter === 'Online' && router.status === 'online') ||
      (statusFilter === 'Offline' && router.status === 'offline');
    
    return matchesSearch && matchesClient && matchesStatus;
  });

  // Reset interface-specific filters when switching to router tab
  useEffect(() => {
    if (activeTab === 'routers') {
      setInterfaceStatusFilter('All Statuses');
      setSelectedInterfaces([]);
      setIsFilteringInterfaces(false);
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-green-700 text-white p-4 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Mikrotik Router Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button 
              className="flex items-center p-2 bg-green-600 rounded hover:bg-green-500"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={18} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button className="p-2 bg-green-600 rounded hover:bg-green-500">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto p-4 flex-grow">
        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {/* Search and filters */}
        <div className="bg-white p-4 rounded shadow mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-grow max-w-md">
              <input
                type="text"
                placeholder="Search routers or interfaces..."
                className="w-full pl-10 pr-4 py-2 border rounded"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            <div className="flex space-x-4">
              <select 
                className="border rounded p-2"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              >
                <option>All Clients</option>
                {clientNames.map(name => (
                  <option key={name}>{name}</option>
                ))}
              </select>
              <select 
                className="border rounded p-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All Statuses</option>
                <option>Online</option>
                <option>Offline</option>
              </select>
              <button className="flex items-center p-2 bg-gray-200 rounded hover:bg-gray-300">
                <Download size={18} className="mr-1" />
                Export
              </button>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b mb-6">
          <nav className="flex">
            <button 
              onClick={() => setActiveTab('routers')}
              className={`px-4 py-2 font-medium ${activeTab === 'routers' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
            >
              Routers
            </button>
            <button 
              onClick={() => setActiveTab('interfaces')}
              className={`px-4 py-2 font-medium ${activeTab === 'interfaces' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
            >
              Interfaces
            </button>
          </nav>
        </div>
        
        {/* Interface-specific filters - only shown when interface tab is active */}
        {activeTab === 'interfaces' && (
          <div className="bg-white p-4 rounded shadow mb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="font-medium text-gray-700">Interface Status:</div>
                <select 
                  className="border rounded p-2"
                  value={interfaceStatusFilter}
                  onChange={(e) => setInterfaceStatusFilter(e.target.value)}
                >
                  <option>All Statuses</option>
                  <option>Up</option>
                  <option>Down</option>
                </select>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleApplyInterfaceFilter}
                  disabled={selectedInterfaces.length === 0}
                  className={`flex items-center p-2 rounded ${selectedInterfaces.length === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-500'}`}
                >
                  <Filter size={18} className="mr-1" />
                  Filter Selected ({selectedInterfaces.length})
                </button>
                
                {isFilteringInterfaces && (
                  <button 
                    onClick={handleClearInterfaceFilter}
                    className="p-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Loading indicator */}
        {loading && activeTab === 'interfaces' && interfaces.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600 mb-2"></div>
            <p className="text-gray-500">Loading interface data...</p>
          </div>
        )}
        
        {loading && activeTab === 'routers' && routers.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600 mb-2"></div>
            <p className="text-gray-500">Loading router data...</p>
          </div>
        )}
        
        {/* Show "Selected Router" indicator when a router is selected */}
        {selectedRouterId !== null && activeTab === 'interfaces' && (
          <div className="mb-4 bg-green-50 p-2 rounded flex justify-between items-center">
            <span className="text-green-800">
              Showing interfaces for: {routers.find(r => r.id === selectedRouterId)?.name || 'Selected Router'}
            </span>
            <button 
              onClick={() => setSelectedRouterId(null)} 
              className="text-green-600 hover:text-green-800 text-sm underline"
            >
              Show All Interfaces
            </button>
          </div>
        )}
        
        {/* Interface table */}
        {activeTab === 'interfaces' && !loading && (
          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Select</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Router</th>
                  <th className="px-3 py-3">Interface</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">
                    <div className="flex items-center">
                      RX Rate
                      <ArrowUpDown size={14} className="ml-1" />
                    </div>
                  </th>
                  <th className="px-3 py-3">
                    <div className="flex items-center">
                      TX Rate
                      <ArrowUpDown size={14} className="ml-1" />
                    </div>
                  </th>
                  <th className="px-3 py-3">Total RX</th>
                  <th className="px-3 py-3">Total TX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInterfaces.map(iface => {
                  const router = routers.find(r => r.id === iface.routerId);
                  const isSelected = selectedInterfaces.includes(iface.id);
                  
                  return (
                    <tr key={iface.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-green-50' : ''}`}>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleInterfaceSelect(iface.id)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap font-medium">{router?.clientName}</td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${router?.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          {router?.name}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">{iface.name}</td>
                      <td className="px-3 py-4 whitespace-nowrap">{iface.type}</td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${iface.status === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {iface.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">{iface.rxRate}</td>
                      <td className="px-3 py-4 whitespace-nowrap">{iface.txRate}</td>
                      <td className="px-3 py-4 whitespace-nowrap">{iface.rxBytes}</td>
                      <td className="px-3 py-4 whitespace-nowrap">{iface.txBytes}</td>
                    </tr>
                  );
                })}
                {filteredInterfaces.length === 0 && (
                  <tr>
                    <td colSpan="10" className="px-6 py-4 text-center text-gray-500">
                      No interfaces found matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Router table */}
        {activeTab === 'routers' && !loading && (
          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Router Name</th>
                  <th className="px-6 py-3">IP Address</th>
                  <th className="px-6 py-3">Model</th>
                  <th className="px-6 py-3">RouterOS</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRouters.map(router => (
                  <tr key={router.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{router.clientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{router.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{router.ip}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{router.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap">v{router.version || '?'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${router.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {router.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => handleRouterDetails(router.id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRouters.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      No routers found matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white p-4 border-t">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          Mikrotik Router Dashboard • Last Updated: {lastUpdated.toLocaleString()}
        </div>
      </footer>
    </div>
  );
}
