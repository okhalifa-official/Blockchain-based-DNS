import React, { useState, useEffect, useRef } from 'react';
import { Server, Globe, Shield, AlertCircle, CheckCircle, Activity, Database, Search, Settings } from 'lucide-react';

const BlockchainDNSServer = () => {
  const [serverRunning, setServerRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    queries: 0,
    blockchainHits: 0,
    recursiveQueries: 0,
    cacheHits: 0
  });
  const [blockchainRecords, setBlockchainRecords] = useState({});
  const [dnsCache, setDnsCache] = useState({});
  const [queryInput, setQueryInput] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [config, setConfig] = useState({
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
    contractAddress: '0xYOUR_CONTRACT_ADDRESS',
    configured: false
  });
  const [showConfig, setShowConfig] = useState(true);
  const [ethers, setEthers] = useState(null);
  const [contract, setContract] = useState(null);
  const logsEndRef = useRef(null);

  const CONTRACT_ABI = [
    'function getRecord(string domain, string recordType) view returns (tuple(string recordType, string value, uint256 ttl, uint256 lastUpdated, bool exists))',
    'function isDomainRegistered(string domain) view returns (bool)',
    'function getDomainOwner(string domain) view returns (address)'
  ];

  useEffect(() => {
    // Load ethers.js
    const script = document.createElement('script');
    script.src = 'https://cdn.ethers.io/lib/ethers-5.2.umd.min.js';
    script.async = true;
    script.onload = () => {
      setEthers(window.ethers);
      addLog('Ethers.js loaded successfully', 'success');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), { timestamp, message, type }]);
  };

  const connectToBlockchain = async () => {
    if (!ethers) {
      addLog('Ethers.js not loaded yet', 'error');
      return false;
    }

    try {
      addLog('Connecting to blockchain...', 'info');
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      
      // Test connection
      const network = await provider.getNetwork();
      addLog(`Connected to network: ${network.name} (chainId: ${network.chainId})`, 'success');

      // Check if contract exists
      const code = await provider.getCode(config.contractAddress);
      if (code === '0x') {
        addLog('Contract not found at this address!', 'error');
        return false;
      }
      addLog('Contract found at address', 'success');

      // Create contract instance
      const contractInstance = new ethers.Contract(
        config.contractAddress,
        CONTRACT_ABI,
        provider
      );
      
      setContract(contractInstance);
      setConfig(prev => ({ ...prev, configured: true }));
      setShowConfig(false);
      addLog('Blockchain connection established!', 'success');
      
      // Load some initial records
      await loadInitialRecords(contractInstance);
      
      return true;
    } catch (error) {
      addLog(`Connection error: ${error.message}`, 'error');
      return false;
    }
  };

  const loadInitialRecords = async (contractInstance) => {
    try {
      addLog('Loading blockchain records...', 'info');
      const testDomains = ['example', 'test', 'mysite', 'wallet', 'dapp'];
      const records = {};
      
      for (const domain of testDomains) {
        try {
          const isRegistered = await contractInstance.isDomainRegistered(domain);
          if (isRegistered) {
            const recordTypes = ['A', 'CNAME', 'TXT'];
            for (const type of recordTypes) {
              try {
                const record = await contractInstance.getRecord(domain, type);
                if (record.exists) {
                  const owner = await contractInstance.getDomainOwner(domain);
                  records[`${domain}.blockchain`] = {
                    type: record.recordType,
                    value: record.value,
                    ttl: record.ttl.toNumber(),
                    owner: owner.substring(0, 6) + '...' + owner.substring(38)
                  };
                  addLog(`Loaded record: ${domain}.blockchain (${type})`, 'success');
                  break; // Only load first found record type
                }
              } catch (e) {
                // Record doesn't exist, continue
              }
            }
          }
        } catch (e) {
          // Domain not registered, continue
        }
      }
      
      setBlockchainRecords(records);
      if (Object.keys(records).length === 0) {
        addLog('No records found on blockchain. Register domains in Remix!', 'info');
      }
    } catch (error) {
      addLog(`Error loading records: ${error.message}`, 'error');
    }
  };

  const simulateRecursiveQuery = async (domain) => {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    const commonDomains = {
      'google.com': '142.250.185.46',
      'github.com': '140.82.121.4',
      'cloudflare.com': '104.16.132.229',
      'example.com': '93.184.216.34'
    };
    
    return commonDomains[domain.toLowerCase()] || `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  };

  const handleQuery = async (domain) => {
    if (!domain.trim()) return;
    if (!config.configured) {
      addLog('Please configure blockchain connection first', 'error');
      return;
    }
    
    setStats(prev => ({ ...prev, queries: prev.queries + 1 }));
    addLog(`Received query for: ${domain}`, 'info');

    // Check blockchain records first
    if (domain.endsWith('.blockchain')) {
      try {
        const baseDomain = domain.replace('.blockchain', '');
        addLog(`Querying blockchain for ${baseDomain}...`, 'info');
        
        const isRegistered = await contract.isDomainRegistered(baseDomain);
        
        if (isRegistered) {
          // Try common record types
          const recordTypes = ['A', 'AAAA', 'CNAME', 'TXT'];
          for (const type of recordTypes) {
            try {
              const record = await contract.getRecord(baseDomain, type);
              if (record.exists) {
                const owner = await contract.getDomainOwner(baseDomain);
                setStats(prev => ({ ...prev, blockchainHits: prev.blockchainHits + 1 }));
                addLog(`✓ Blockchain record found for ${domain}`, 'success');
                addLog(`Owner: ${owner}, Type: ${record.recordType}, Value: ${record.value}`, 'info');
                
                setQueryResult({
                  domain,
                  source: 'blockchain',
                  record: {
                    type: record.recordType,
                    value: record.value,
                    ttl: record.ttl.toNumber(),
                    owner: owner.substring(0, 6) + '...' + owner.substring(38)
                  }
                });
                return;
              }
            } catch (e) {
              // Record type doesn't exist, try next
            }
          }
          addLog(`Domain registered but no records found`, 'error');
          setQueryResult(null);
          return;
        } else {
          addLog(`Domain not registered on blockchain`, 'error');
          setQueryResult(null);
          return;
        }
      } catch (error) {
        addLog(`Blockchain query error: ${error.message}`, 'error');
        setQueryResult(null);
        return;
      }
    }

    // Check cache
    if (dnsCache[domain.toLowerCase()]) {
      const cached = dnsCache[domain.toLowerCase()];
      if (Date.now() < cached.expires) {
        setStats(prev => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
        addLog(`✓ Cache hit for ${domain}`, 'success');
        setQueryResult({
          domain,
          source: 'cache',
          record: cached.record
        });
        return;
      }
    }

    // Perform recursive query
    setStats(prev => ({ ...prev, recursiveQueries: prev.recursiveQueries + 1 }));
    addLog(`→ Performing recursive query for ${domain}`, 'info');
    
    try {
      const ip = await simulateRecursiveQuery(domain);
      const record = { type: 'A', value: ip, ttl: 3600 };
      
      // Cache the result
      setDnsCache(prev => ({
        ...prev,
        [domain.toLowerCase()]: {
          record,
          expires: Date.now() + 3600000
        }
      }));
      
      addLog(`✓ Resolved ${domain} to ${ip}`, 'success');
      setQueryResult({
        domain,
        source: 'recursive',
        record
      });
    } catch (error) {
      addLog(`✗ Failed to resolve ${domain}`, 'error');
      setQueryResult(null);
    }
  };

  useEffect(() => {
    if (serverRunning && config.configured) {
      const interval = setInterval(() => {
        const domains = ['api.service.com', 'cdn.example.com', 'test.blockchain'];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        handleQuery(randomDomain);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [serverRunning, config.configured]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {showConfig && (
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl border-2 border-blue-500 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="text-blue-400" size={32} />
              <h2 className="text-2xl font-bold text-white">Blockchain Configuration</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-2">RPC URL (Infura/Alchemy)</label>
                <input
                  type="text"
                  value={config.rpcUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, rpcUrl: e.target.value }))}
                  placeholder="https://sepolia.infura.io/v3/YOUR_KEY"
                  className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-2">Contract Address</label>
                <input
                  type="text"
                  value={config.contractAddress}
                  onChange={(e) => setConfig(prev => ({ ...prev, contractAddress: e.target.value }))}
                  placeholder="0x..."
                  className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                />
              </div>
              <button
                onClick={connectToBlockchain}
                disabled={!ethers}
                className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-all"
              >
                {ethers ? 'Connect to Blockchain' : 'Loading...'}
              </button>
              <p className="text-slate-400 text-sm">
                Enter your Infura/Alchemy RPC URL and deployed contract address from Remix.
              </p>
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Globe className="text-blue-400" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-white">Blockchain DNS Server</h1>
                <p className="text-slate-400 text-sm">
                  {config.configured ? `Connected to ${config.contractAddress.substring(0, 10)}...` : 'Not connected'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {config.configured && (
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                >
                  <Settings size={20} />
                </button>
              )}
              <button
                onClick={() => {
                  if (!config.configured) {
                    addLog('Please configure blockchain connection first', 'error');
                    return;
                  }
                  setServerRunning(!serverRunning);
                  addLog(serverRunning ? 'DNS server stopped' : 'DNS server started on UDP:53', serverRunning ? 'info' : 'success');
                }}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  serverRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {serverRunning ? 'Stop Server' : 'Start Server'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="text-blue-400" size={20} />
                <span className="text-slate-300 text-sm">Total Queries</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats.queries}</div>
            </div>
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="text-purple-400" size={20} />
                <span className="text-slate-300 text-sm">Blockchain Hits</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats.blockchainHits}</div>
            </div>
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Server className="text-green-400" size={20} />
                <span className="text-slate-300 text-sm">Recursive</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats.recursiveQueries}</div>
            </div>
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="text-orange-400" size={20} />
                <span className="text-slate-300 text-sm">Cache Hits</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats.cacheHits}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="text-blue-400" size={24} />
              <h2 className="text-xl font-bold text-white">DNS Query Interface</h2>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuery(queryInput)}
                placeholder="Enter domain name..."
                className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={() => handleQuery(queryInput)}
                disabled={!config.configured}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-all"
              >
                Query
              </button>
            </div>
            <div className="space-y-2 mb-4">
              <p className="text-slate-400 text-sm">Try these queries:</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setQueryInput('example.blockchain')} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded text-sm hover:bg-purple-500/30">
                  example.blockchain
                </button>
                <button onClick={() => setQueryInput('google.com')} className="px-3 py-1 bg-green-500/20 text-green-300 rounded text-sm hover:bg-green-500/30">
                  google.com
                </button>
              </div>
            </div>
            {queryResult && (
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-white font-semibold">Query Result</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Domain:</span>
                    <span className="text-white font-mono">{queryResult.domain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Source:</span>
                    <span className={`font-semibold ${
                      queryResult.source === 'blockchain' ? 'text-purple-400' :
                      queryResult.source === 'cache' ? 'text-orange-400' : 'text-green-400'
                    }`}>{queryResult.source.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type:</span>
                    <span className="text-white">{queryResult.record.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Value:</span>
                    <span className="text-white font-mono">{queryResult.record.value}</span>
                  </div>
                  {queryResult.record.owner && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Owner:</span>
                      <span className="text-purple-400 font-mono text-xs">{queryResult.record.owner}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-purple-400" size={24} />
              <h2 className="text-xl font-bold text-white">Blockchain Records</h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.keys(blockchainRecords).length === 0 ? (
                <div className="text-slate-400 text-center py-8 text-sm">
                  No records loaded yet.<br/>
                  Configure connection and register domains in Remix!
                </div>
              ) : (
                Object.entries(blockchainRecords).map(([domain, record]) => (
                  <div key={domain} className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-white font-semibold">{domain}</span>
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        {record.type}
                      </span>
                    </div>
                    <div className="text-sm text-slate-300 font-mono">{record.value}</div>
                    <div className="text-xs text-slate-500 mt-1">Owner: {record.owner}</div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => contract && loadInitialRecords(contract)}
              disabled={!config.configured}
              className="w-full mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-all"
            >
              Refresh Records
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-green-400" size={24} />
            <h2 className="text-xl font-bold text-white">Server Logs</h2>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-8">No logs yet. Configure and start the server.</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">
                  <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                  <span className={
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'error' ? 'text-red-400' : 'text-slate-300'
                  }>{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainDNSServer;