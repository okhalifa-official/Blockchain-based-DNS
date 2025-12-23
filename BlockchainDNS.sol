// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title BlockchainDNS
 * @dev Decentralized DNS registry with support for multiple record types
 * @author omario2k5@gmail.com
 */
contract BlockchainDNS {
    
    // DNS Record structure
    struct DNSRecord {
        string recordType;
        string value;
        uint256 ttl;            // TTL in seconds
        uint256 createdAt;      // Creation timestamp
        uint256 lastUpdated;    // Last update timestamp
        bool exists;
    }

    
    // Domain ownership and records
    mapping(string => address) public domainOwners;
    mapping(string => mapping(string => DNSRecord)) public records; // domain => recordType => DNSRecord
    mapping(string => bool) public domainExists;
    mapping(string => string[]) public domainRecordTypes; // Track all record types for a domain
    
    // Events
    event DomainRegistered(string indexed domain, address indexed owner, uint256 timestamp);
    event RecordSet(string indexed domain, string recordType, string value, uint256 ttl);
    event RecordDeleted(string indexed domain, string recordType);
    event DomainTransferred(string indexed domain, address indexed from, address indexed to);
    event DomainReleased(string indexed domain, address indexed owner);
    
    // Modifiers
    modifier onlyDomainOwner(string memory domain) {
        require(domainOwners[domain] == msg.sender, "Not domain owner");
        _;
    }
    
    modifier domainNotRegistered(string memory domain) {
        require(!domainExists[domain], "Domain already registered");
        _;
    }
    
    modifier validDomain(string memory domain) {
        require(bytes(domain).length > 0, "Domain cannot be empty");
        require(bytes(domain).length <= 253, "Domain too long");
        _;
    }
    
    /**
     * @dev Register a new domain
     * @param domain The domain name to register (without TLD)
     */
    function registerDomain(string memory domain) 
        external 
        validDomain(domain)
        domainNotRegistered(domain)
    {
        domainOwners[domain] = msg.sender;
        domainExists[domain] = true;
        emit DomainRegistered(domain, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Set a DNS record for a domain
     * @param domain The domain name
     * @param recordType Type of DNS record (A, AAAA, CNAME, TXT, MX, etc.)
     * @param value The record value (IP, domain, text, etc.)
     * @param ttl Time to live in seconds
     */
    function setRecord(
        string memory domain,
        string memory recordType,
        string memory value,
        uint256 ttl
    ) 
        external 
        onlyDomainOwner(domain)
    {
        require(bytes(recordType).length > 0, "Record type cannot be empty");
        require(bytes(value).length > 0, "Value cannot be empty");
        require(ttl > 0, "TTL must be greater than 0");

        DNSRecord storage record = records[domain][recordType];

        // New record → set creation time
        if (!record.exists) {
            domainRecordTypes[domain].push(recordType);
            record.createdAt = block.timestamp;
            record.exists = true;
        }

        // Update fields
        record.recordType = recordType;
        record.value = value;
        record.ttl = ttl;
        record.lastUpdated = block.timestamp;

        emit RecordSet(domain, recordType, value, ttl);
    }

    
    /**
     * @dev Get a DNS record for a domain
     * @param domain The domain name
     * @param recordType Type of DNS record to retrieve
     * @return DNSRecord struct containing the record data
     */
    function getRecord(string memory domain, string memory recordType)
        external
        view
        returns (DNSRecord memory)
    {
        require(domainExists[domain], "Domain not registered");
        require(records[domain][recordType].exists, "Record does not exist");
        return records[domain][recordType];
    }
    
    /**
     * @dev Get all record types for a domain
     * @param domain The domain name
     * @return Array of record type strings
     */
    function getRecordTypes(string memory domain)
        external
        view
        returns (string[] memory)
    {
        require(domainExists[domain], "Domain not registered");
        return domainRecordTypes[domain];
    }
    
    /**
     * @dev Get all records for a domain
     * @param domain The domain name
     * @return Array of DNSRecord structs
     */
    function getAllRecords(string memory domain)
        external
        view
        returns (DNSRecord[] memory)
    {
        require(domainExists[domain], "Domain not registered");
        string[] memory recordTypes = domainRecordTypes[domain];
        DNSRecord[] memory allRecords = new DNSRecord[](recordTypes.length);
        
        for (uint i = 0; i < recordTypes.length; i++) {
            allRecords[i] = records[domain][recordTypes[i]];
        }
        
        return allRecords;
    }
    
    /**
     * @dev Delete a DNS record
     * @param domain The domain name
     * @param recordType Type of DNS record to delete
     */
    function deleteRecord(string memory domain, string memory recordType)
        external
        onlyDomainOwner(domain)
    {
        require(records[domain][recordType].exists, "Record does not exist");
        
        delete records[domain][recordType];
        
        // Remove from record types array
        string[] storage types = domainRecordTypes[domain];
        for (uint i = 0; i < types.length; i++) {
            if (keccak256(bytes(types[i])) == keccak256(bytes(recordType))) {
                types[i] = types[types.length - 1];
                types.pop();
                break;
            }
        }
        
        emit RecordDeleted(domain, recordType);
    }
    
    /**
     * @dev Transfer domain ownership
     * @param domain The domain name
     * @param newOwner Address of the new owner
     */
    function transferDomain(string memory domain, address newOwner)
        external
        onlyDomainOwner(domain)
    {
        require(newOwner != address(0), "Invalid new owner address");
        require(newOwner != msg.sender, "Already the owner");
        
        address oldOwner = domainOwners[domain];
        domainOwners[domain] = newOwner;
        
        emit DomainTransferred(domain, oldOwner, newOwner);
    }
    
    /**
     * @dev Release domain (delete all records and ownership)
     * @param domain The domain name
     */
    function releaseDomain(string memory domain)
        external
        onlyDomainOwner(domain)
    {
        // Delete all records
        string[] memory recordTypes = domainRecordTypes[domain];
        for (uint i = 0; i < recordTypes.length; i++) {
            delete records[domain][recordTypes[i]];
        }
        
        delete domainRecordTypes[domain];
        delete domainOwners[domain];
        delete domainExists[domain];
        
        emit DomainReleased(domain, msg.sender);
    }
    
    /**
     * @dev Check if a domain is registered
     * @param domain The domain name
     * @return bool indicating if domain exists
     */
    function isDomainRegistered(string memory domain)
        external
        view
        returns (bool)
    {
        return domainExists[domain];
    }
    
    /**
     * @dev Get domain owner
     * @param domain The domain name
     * @return Address of the domain owner
     */
    function getDomainOwner(string memory domain)
        external
        view
        returns (address)
    {
        require(domainExists[domain], "Domain not registered");
        return domainOwners[domain];
    }
    
    /**
     * @dev Check if a record exists
     * @param domain The domain name
     * @param recordType Type of DNS record
     * @return bool indicating if record exists
     */
    function recordExists(string memory domain, string memory recordType)
        external
        view
        returns (bool)
    {
        return records[domain][recordType].exists;
    }
    
    /**
     * @dev Batch set multiple records for a domain
     * @param domain The domain name
     * @param recordTypes Array of record types
     * @param values Array of record values
     * @param ttls Array of TTL values
     */
    function batchSetRecords(
        string memory domain,
        string[] memory recordTypes,
        string[] memory values,
        uint256[] memory ttls
    )
        external
        onlyDomainOwner(domain)
    {
        require(
            recordTypes.length == values.length && values.length == ttls.length,
            "Arrays length mismatch"
        );
        
        for (uint i = 0; i < recordTypes.length; i++) {
            require(bytes(recordTypes[i]).length > 0, "Record type cannot be empty");
            require(bytes(values[i]).length > 0, "Value cannot be empty");
            require(ttls[i] > 0, "TTL must be greater than 0");
            
            // Add record type to list if it's new
            DNSRecord storage record = records[domain][recordTypes[i]];

            if (!record.exists) {
                domainRecordTypes[domain].push(recordTypes[i]);
                record.createdAt = block.timestamp;
                record.exists = true;
            }

            record.recordType = recordTypes[i];
            record.value = values[i];
            record.ttl = ttls[i];
            record.lastUpdated = block.timestamp;
            
            emit RecordSet(domain, recordTypes[i], values[i], ttls[i]);
        }
    }
}
