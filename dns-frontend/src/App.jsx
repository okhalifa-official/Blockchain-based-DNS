import './App.css'
import React, { useState, useEffect, useRef } from 'react';
import { Server, Globe, Shield, AlertCircle, CheckCircle, Activity, Database, Search, Settings, Plus, Trash2, RefreshCw, Clock } from 'lucide-react';
import { ethers } from 'ethers';
import config from '../../config.js';

function App() {
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
  const [configState, setConfigState] = useState({
    rpcUrl: config.rpcUrl,
    contractAddress: config.contractAddress,
    walletKey: config.walletKey,
    configured: false
  });
  const [showConfig, setShowConfig] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [contract, setContract] = useState(null);
  const [signer, setSigner] = useState(null);
  const [knownDomains, setKnownDomains] = useState([]);
  const logsEndRef = useRef(null);

  const CONTRACT_ABI = [
    'function registerDomain(string domain)',
    'function setRecord(string domain, string recordType, string value, uint256 ttl)',
    'function getRecord(string domain, string recordType) view returns (tuple(string recordType, string value, uint256 ttl, uint256 lastUpdated, bool exists))',
    'function deleteRecord(string domain, string recordType)',
    'function isDomainRegistered(string domain) view returns (bool)',
    'function domainExists(string domain) returns (bool)',
    'function getDomainOwner(string domain) view returns (address)',
    'function transferDomain(string domain, address newOwner)',
    'function recordExists(string domain, string recordType) view returns (bool)'
  ];

  const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SOA', 'SRV'];

  useEffect(() => {
    addLog('Ethers.js loaded successfully', 'success');
  }, []);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), { timestamp, message, type }]);
  };

  const connectToBlockchain = async () => {
    try {
      addLog('Connecting to blockchain...', 'info');
      
      const provider = new ethers.JsonRpcProvider(configState.rpcUrl);
      
      const network = await provider.getNetwork();
      addLog(`Connected to network: ${network.name} (chainId: ${network.chainId})`, 'success');

      const code = await provider.getCode(configState.contractAddress);
      if (code === '0x') {
        addLog('Contract not found at this address!', 'error');
        return false;
      }
      addLog('Contract found at address', 'success');

      const contractInstance = new ethers.Contract(
        configState.contractAddress,
        CONTRACT_ABI,
        provider
      );
      
      if (configState.walletKey && configState.walletKey.length > 0) {
        try {
          const wallet = new ethers.Wallet(configState.walletKey, provider);
          const contractWithSigner = contractInstance.connect(wallet);
          setSigner(wallet);
          setContract(contractWithSigner);
          addLog(`Wallet connected: ${wallet.address.substring(0, 10)}...`, 'success');
        } catch (e) {
          addLog('Invalid wallet key, read-only mode enabled', 'error');
          setContract(contractInstance);
        }
      } else {
        setContract(contractInstance);
        addLog('Read-only mode (no wallet key provided)', 'info');
      }
      
      setConfigState(prev => ({ ...prev, configured: true }));
      setShowConfig(false);
      addLog('Blockchain connection established!', 'success');
      
      await loadAllBlockchainRecords(contractInstance);
      
      return true;
    } catch (error) {
      addLog(`Connection error: ${error.message}`, 'error');
      return false;
    }
  };

  const calculateRemainingTTL = (lastUpdated, ttl) => {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const createdAt = Number(lastUpdated);
    const elapsedSeconds = now - createdAt;
    const remainingTTL = Math.max(0, Number(ttl) - elapsedSeconds);
    
    return {
      remaining: remainingTTL,
      expired: remainingTTL === 0,
      elapsed: elapsedSeconds
    };
  };

  const loadAllBlockchainRecords = async (contractInstance) => {
    try {
      addLog('Loading all blockchain records...', 'info');
      const records = {};
      let foundCount = 0;
      
      for (const domain of knownDomains) {
        try {
          addLog(`Checking domain: ${domain}`, 'info');
          const isRegistered = await contractInstance.isDomainRegistered(domain);
          
          if (isRegistered) {
            addLog(`Domain ${domain} is registered, fetching owner...`, 'info');
            const owner = await contractInstance.getDomainOwner(domain);
            const domainRecords = [];
            
            for (const type of RECORD_TYPES) {
              try {
                const record = await contractInstance.getRecord(domain, type);

                if (record.exists) {
                  const ttlInfo = calculateRemainingTTL(record.lastUpdated, record.ttl);

                  domainRecords.push({
                    type: record.recordType,
                    value: record.value,
                    ttl: Number(record.ttl),
                    lastUpdated: Number(record.lastUpdated),
                    remainingTTL: ttlInfo.remaining,
                    expired: ttlInfo.expired
                  });

                  const status = ttlInfo.expired ? '(EXPIRED)' : `(${ttlInfo.remaining}s left)`;
                  addLog(
                    `Found ${record.recordType} record for ${domain}: ${record.value} ${status}`,
                    ttlInfo.expired ? 'error' : 'success'
                  );
                }
              } catch (e) {
                // Record doesn't exist
              }
            }
            
            if (domainRecords.length > 0) {
              records[domain] = {
                owner: owner.substring(0, 6) + '...' + owner.substring(38),
                fullOwner: owner,
                records: domainRecords
              };
              foundCount++;
            } else {
              addLog(`Domain ${domain} registered but has no records`, 'info');
            }
          }
        } catch (e) {
          addLog(`Error checking domain ${domain}: ${e.message}`, 'error');
        }
      }
      
      setBlockchainRecords(records);
      if (foundCount === 0) {
        addLog('No records found. Register domains to get started!', 'info');
      } else {
        addLog(`✓ Total domains loaded: ${foundCount}`, 'success');
      }
    } catch (error) {
      addLog(`Error loading records: ${error.message}`, 'error');
    }
  };

  const queryBlockchainForAllTypes = async (domain, contractInstance) => {
    const baseDomain = domain.replace(/\.(blockchain|eth|crypto)$/i, '').toLowerCase();
    const startTime = performance.now();
    
    try {
      addLog(`Querying blockchain for: ${baseDomain}`, 'info');
      const isRegistered = await contractInstance.isDomainRegistered(baseDomain);
      
      if (!isRegistered) {
        const responseTime = ((performance.now() - startTime) / 1000).toFixed(3);
        addLog(`Domain ${baseDomain} not registered (${responseTime}s)`, 'info');
        return null;
      }

      addLog(`Domain ${baseDomain} is registered, fetching records...`, 'info');
      setKnownDomains(prev => {
        if (!prev.includes(baseDomain)) {
          return [...prev, baseDomain];
        }
        return prev;
      });
      
      for (const type of RECORD_TYPES) {
        try {
          const record = await contractInstance.getRecord(baseDomain, type);
          if (record.exists) {
            const owner = await contractInstance.getDomainOwner(baseDomain);
            const responseTime = ((performance.now() - startTime) / 1000).toFixed(3);
            const ttlInfo = calculateRemainingTTL(record.lastUpdated, record.ttl);
            
            addLog(`Found ${type} record: ${record.value} (${responseTime}s)`, 'success');
            
            return {
              domain: baseDomain,
              responseTime: parseFloat(responseTime),
              record: {
                type: record.recordType,
                value: record.value,
                ttl: Number(record.ttl),
                lastUpdated: Number(record.lastUpdated),
                remainingTTL: ttlInfo.remaining,
                expired: ttlInfo.expired,
                owner: owner.substring(0, 6) + '...' + owner.substring(38)
              }
            };
          }
        } catch (e) {
          continue;
        }
      }
      
      const responseTime = ((performance.now() - startTime) / 1000).toFixed(3);
      addLog(`Domain ${baseDomain} registered but has no records (${responseTime}s)`, 'info');
    } catch (e) {
      const responseTime = ((performance.now() - startTime) / 1000).toFixed(3);
      addLog(`Error querying blockchain: ${e.message} (${responseTime}s)`, 'error');
    }
    return null;
  };

  const simulateRecursiveQuery = async (domain) => {
    const startTime = performance.now();
    try {
      const response = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
        {
          headers: {
            'Accept': 'application/dns-json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`DNS query failed: ${response.status}`);
      }
      
      const data = await response.json();
      const responseTime = ((performance.now() - startTime) / 1000).toFixed(3);
      
      if (data.Answer && data.Answer.length > 0) {
        const aRecord = data.Answer.find(record => record.type === 1);
        if (aRecord) {
          return {
            ip: aRecord.data,
            responseTime: parseFloat(responseTime)
          };
        }
      }
      
      throw new Error('No A record found for domain');
    } catch (error) {
      const responseTime = ((performance.now() - startTime) / 1000).toFixed(3);
      console.error('DNS lookup error:', error);
      throw error;
    }
  };

  const handleQuery = async (domain) => {
    if (!domain.trim()) return;
    if (!configState.configured) {
      addLog('Please configure blockchain connection first', 'error');
      return;
    }
    
    const overallStartTime = performance.now();
    setStats(prev => ({ ...prev, queries: prev.queries + 1 }));
    addLog(`Received query for: ${domain}`, 'info');

    const baseDomain = domain.split('.')[0];
    const tld = domain.split('.').slice(1).join('.');
    
    if (baseDomain.length === 0) {
      addLog('Invalid domain name', 'error');
      return;
    }

    if (tld === 'blockchain') {
      addLog('Domain is a blockchain domain, checking blockchain registry...', 'info');
      const blockchainResult = await queryBlockchainForAllTypes(baseDomain, contract);
    
      if (blockchainResult) {
        setStats(prev => ({ ...prev, blockchainHits: prev.blockchainHits + 1 }));
        addLog(`✓ Found on blockchain: ${blockchainResult.domain}`, 'success');
        addLog(`Type: ${blockchainResult.record.type}, Value: ${blockchainResult.record.value}`, 'info');
        
        setKnownDomains(prev => {
          if (!prev.includes(baseDomain)) {
            return [...prev, baseDomain];
          }
          return prev;
        });

        blockchainRecords[blockchainResult.domain] = {
          owner: blockchainResult.record.owner,
          records: [blockchainResult.record]
        };

        setQueryResult({
          domain: blockchainResult.domain,
          source: 'blockchain',
          responseTime: blockchainResult.responseTime,
          record: blockchainResult.record
        });
      } else {
        addLog('Not found on blockchain', 'info');
      }
      return;
    } else {
      addLog('Checking cache...', 'info');
      if (dnsCache[domain.toLowerCase()]) {
        const cached = dnsCache[domain.toLowerCase()];
        if (Date.now() < cached.expires) {
          const responseTime = ((performance.now() - overallStartTime) / 1000).toFixed(3);
          setStats(prev => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
          addLog(`✓ Cache hit for ${baseDomain} (${responseTime}s)`, 'success');
          setQueryResult({
            domain,
            source: 'cache',
            responseTime: parseFloat(responseTime),
            record: cached.record
          });
          return;
        }
      }

      setStats(prev => ({ ...prev, recursiveQueries: prev.recursiveQueries + 1 }));
      addLog(`→ Performing recursive DNS query for ${domain}`, 'info');
      
      try {
        const result = await simulateRecursiveQuery(domain);
        const record = { type: 'A', value: result.ip, ttl: 3600 };
        
        setDnsCache(prev => ({
          ...prev,
          [domain.toLowerCase()]: {
            record,
            expires: Date.now() + 3600000
          }
        }));
        
        addLog(`✓ Resolved ${domain} to ${result.ip} via recursive DNS (${result.responseTime}s)`, 'success');
        setQueryResult({
          domain,
          source: 'recursive',
          responseTime: result.responseTime,
          record
        });
      } catch (error) {
        const responseTime = ((performance.now() - overallStartTime) / 1000).toFixed(3);
        addLog(`✗ Failed to resolve ${domain} (${responseTime}s)`, 'error');
        setQueryResult(null);
      }
    }
  };

  const registerDomain = async (domainName) => {
    setShowRegisterModal(false);
    if (!signer) {
      addLog('Wallet not connected. Cannot register domain.', 'error');
      return;
    }

    try {
      addLog(`Registering domain: ${domainName}...`, 'info');
      const tx = await contract.registerDomain(domainName);
      addLog('Transaction submitted, waiting for confirmation...', 'info');
      await tx.wait();
      addLog(`✓ Domain registered: ${domainName}`, 'success');
      
      setKnownDomains(prev => {
        if (!prev.includes(domainName)) {
          return [...prev, domainName];
        }
        return prev;
      });
      
      await loadAllBlockchainRecords(contract);
    } catch (error) {
      addLog(`Error registering domain: ${error.message}`, 'error');
    }
  };

  const addRecord = async (domain, recordType, value, ttl) => {
    setShowAddRecordModal(false);
    if (!signer) {
      addLog('Wallet not connected. Cannot add record.', 'error');
      return;
    }

    try {
      addLog(`Adding ${recordType} record for ${domain}...`, 'info');
      const tx = await contract.setRecord(domain, recordType, value, ttl);
      addLog('Transaction submitted, waiting for confirmation...', 'info');
      await tx.wait();
      addLog(`✓ Record added: ${domain} ${recordType} ${value}`, 'success');
      
      await loadAllBlockchainRecords(contract);
    } catch (error) {
      addLog(`Error adding record: ${error.message}`, 'error');
    }
  };

  const deleteRecord = async (domain, recordType) => {
    if (!signer) {
      addLog('Wallet not connected. Cannot delete record.', 'error');
      return;
    }

    if (!window.confirm(`Delete ${recordType} record for ${domain}?`)) {
      return;
    }

    try {
      addLog(`Deleting ${recordType} record for ${domain}...`, 'info');
      const tx = await contract.deleteRecord(domain, recordType);
      addLog('Transaction submitted, waiting for confirmation...', 'info');
      await tx.wait();
      addLog(`✓ Record deleted: ${domain} ${recordType}`, 'success');
      
      await loadAllBlockchainRecords(contract);
    } catch (error) {
      addLog(`Error deleting record: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    if (serverRunning && configState.configured && contract) {
      const interval = setInterval(() => {
        const domains = ['api.service.com', 'cdn.example.com', 'test.blockchain', 'google.com'];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        handleQuery(randomDomain);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [serverRunning, configState.configured, contract]);

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
                  value={configState.rpcUrl}
                  onChange={(e) => setConfigState(prev => ({ ...prev, rpcUrl: e.target.value }))}
                  placeholder="https://sepolia.infura.io/v3/YOUR_KEY"
                  className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-2">Contract Address</label>
                <input
                  type="text"
                  value={configState.contractAddress}
                  onChange={(e) => setConfigState(prev => ({ ...prev, contractAddress: e.target.value }))}
                  placeholder="0xYOUR_CONTRACT_ADDRESS"
                  className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-2">Wallet Private Key (Optional - for write operations)</label>
                <input
                  type="password"
                  value={configState.walletKey}
                  onChange={(e) => setConfigState(prev => ({ ...prev, walletKey: e.target.value }))}
                  placeholder="0x... (leave empty for read-only)"
                  className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">⚠️ Never share your private key. Only use testnets!</p>
              </div>
              <button
                onClick={connectToBlockchain}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-150"
              >
                Connect and Load
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <Server className="text-green-400" size={32} />
                <h2 className="text-2xl font-bold text-white">DNS Resolver Status</h2>
              </div>
              <div className="flex gap-2">
                {configState.configured && (
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition duration-150"
                  >
                    <Settings size={20} />
                  </button>
                )}
                <button
                  onClick={() => setServerRunning(prev => !prev)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition duration-150 ${
                    serverRunning
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  disabled={!configState.configured}
                >
                  {serverRunning ? 'Stop' : 'Start'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
              <StatCard icon={Activity} title="Total Queries" value={stats.queries} color="text-blue-400" />
              <StatCard icon={Database} title="Cache Hits" value={stats.cacheHits} color="text-yellow-400" />
              <StatCard icon={Globe} title="Recursive" value={stats.recursiveQueries} color="text-purple-400" />
              <StatCard icon={Shield} title="Blockchain" value={stats.blockchainHits} color="text-green-400" />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <Search className="text-white" size={24} />
              <h3 className="text-xl font-semibold text-white">DNS Query</h3>
            </div>
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuery(queryInput)}
                placeholder="Enter any domain name"
                className="flex-grow bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={() => handleQuery(queryInput)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150"
                disabled={!configState.configured}
              >
                Resolve
              </button>
            </div>

            {queryResult && (
              <div className="bg-slate-700 p-4 rounded-lg border border-slate-600 mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-semibold text-white">Result for: {queryResult.domain}</h4>
                  <div className="flex items-center gap-1 text-slate-300 text-sm">
                    <Clock size={16} />
                    <span>{queryResult.responseTime}s</span>
                  </div>
                </div>
                <p className="text-slate-300 mb-2">
                  <span className={`font-mono text-sm px-2 py-1 rounded mr-2 ${
                    queryResult.source === 'blockchain' ? 'bg-purple-600' :
                    queryResult.source === 'cache' ? 'bg-orange-600' : 'bg-green-600'
                  }`}>
                    {queryResult.source.toUpperCase()}
                  </span>
                  <span className="font-bold text-blue-400">{queryResult.record.type}</span>: {queryResult.record.value}
                </p>
                {queryResult.record.owner && (
                  <p className="text-sm text-slate-400">Owner: {queryResult.record.owner}</p>
                )}
                {queryResult.record.remainingTTL !== undefined && (
                  <div className="mt-2 pt-2 border-t border-slate-600">
                    {queryResult.record.expired ? (
                      <p className="text-sm text-red-400 font-semibold flex items-center gap-2">
                        <AlertCircle size={16} />
                        ⚠️ RECORD EXPIRED
                      </p>
                    ) : (
                      <p className="text-sm text-green-400 flex items-center gap-2">
                        <CheckCircle size={16} />
                        TTL: {queryResult.record.remainingTTL}s remaining (expires in {Math.floor(queryResult.record.remainingTTL / 60)}m {queryResult.record.remainingTTL % 60}s)
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Original TTL: {queryResult.record.ttl}s | Last updated: {new Date(queryResult.record.lastUpdated * 1000).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {signer && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition duration-150 flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Register Domain
                </button>
                <button
                  onClick={() => setShowAddRecordModal(true)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-150 flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add Record
                </button>
                <button
                  onClick={() => loadAllBlockchainRecords(contract)}
                  className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition duration-150"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="text-yellow-400" size={32} />
              <h2 className="text-2xl font-bold text-white">Logs</h2>
            </div>
            <div className="h-96 overflow-y-auto bg-slate-900 p-4 rounded-lg border border-slate-700 font-mono text-sm">
              {logs.map((log, index) => (
                <LogEntry key={index} log={log} />
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        <div className="mt-6 bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-pink-400" size={32} />
            <h2 className="text-2xl font-bold text-white">Blockchain Registry ({Object.keys(blockchainRecords).length} domains)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(blockchainRecords).map(([domain, data]) => (
              <DomainCard 
                key={domain} 
                domain={domain} 
                data={data} 
                onDelete={deleteRecord}
                canDelete={!!signer}
              />
            ))}
            {Object.keys(blockchainRecords).length === 0 && (
              <p className="text-slate-400 col-span-full text-center py-8">
                No domains registered yet. {signer ? 'Click "Register Domain" to get started!' : 'Connect a wallet to register domains.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Register Domain Modal */}
      {showRegisterModal && (
        <Modal onClose={() => setShowRegisterModal(false)}>
          <RegisterDomainForm onSubmit={registerDomain} onCancel={() => setShowRegisterModal(false)} />
        </Modal>
      )}

      {/* Add Record Modal */}
      {showAddRecordModal && (
        <Modal onClose={() => setShowAddRecordModal(false)}>
          <AddRecordForm 
            onSubmit={addRecord} 
            onCancel={() => setShowAddRecordModal(false)}
            recordTypes={RECORD_TYPES}
          />
        </Modal>
      )}
    </div>
  );
}

const StatCard = ({ icon: Icon, title, value, color }) => (
  <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
    <Icon className={color} size={24} />
    <p className="text-white text-2xl font-bold mt-1">{value}</p>
    <p className="text-slate-400 text-xs uppercase tracking-wider">{title}</p>
  </div>
);

const LogEntry = ({ log }) => {
  let color = 'text-slate-300';
  let Icon = Activity;

  switch (log.type) {
    case 'error':
      color = 'text-red-400';
      Icon = AlertCircle;
      break;
    case 'success':
      color = 'text-green-400';
      Icon = CheckCircle;
      break;
    case 'info':
    default:
      color = 'text-blue-400';
      Icon = Activity;
      break;
  }

  return (
    <div className="flex items-start space-x-2 py-1 border-b border-slate-800 last:border-b-0">
      <span className="text-slate-500 flex-shrink-0 text-xs">[{log.timestamp}]</span>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
      <span className={`flex-grow text-xs ${color}`}>{log.message}</span>
    </div>
  );
};

const DomainCard = ({ domain, data, onDelete, canDelete }) => (
  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
    <div className="flex justify-between items-start mb-2">
      <h4 className="text-lg font-bold text-white">{domain}</h4>
      <Shield className="text-purple-400" size={20} />
    </div>
    <p className="text-xs text-slate-400 mb-3">Owner: {data.owner}</p>
    <div className="space-y-2">
      {data.records.map((record, idx) => (
        <div key={idx} className="bg-slate-800 p-2 rounded flex justify-between items-center">
          <div className="flex-grow">
            <span className="text-blue-400 font-bold text-sm">{record.type}</span>
            <p className="text-slate-300 text-xs font-mono break-all">{record.value}</p>
            <p className="text-slate-500 text-xs">TTL: {record.ttl}s</p>
          </div>
          {canDelete && (
            <button
              onClick={() => onDelete(domain, record.type)}
              className="ml-2 p-1 bg-red-600 hover:bg-red-700 rounded transition"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

const RegisterDomainForm = ({ onSubmit, onCancel }) => {
  const [domain, setDomain] = useState('');

  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-4">Register New Domain</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-slate-300 mb-2">Domain Name</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="mysite"
            className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-slate-400 mt-1">Without .blockchain extension</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => domain && onSubmit(domain)}
            disabled={!domain}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
          >
            Register
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const AddRecordForm = ({ onSubmit, onCancel, recordTypes }) => {
  const [domain, setDomain] = useState('');
  const [recordType, setRecordType] = useState('A');
  const [value, setValue] = useState('');
  const [ttl, setTtl] = useState('3600');

  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-4">Add DNS Record</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-slate-300 mb-2">Domain Name</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="mysite"
            className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-300 mb-2">Record Type</label>
          <select
            value={recordType}
            onChange={(e) => setRecordType(e.target.value)}
            className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          >
            {recordTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-300 mb-2">Value</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={recordType === 'A' ? '192.168.1.1' : recordType === 'CNAME' ? 'example.com' : 'Record value'}
            className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-300 mb-2">TTL (seconds)</label>
          <input
            type="number"
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
            placeholder="3600"
            className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => domain && value && ttl && onSubmit(domain, recordType, value, parseInt(ttl))}
            disabled={!domain || !value || !ttl}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
          >
            Add Record
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;