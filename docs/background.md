## Background

### Domain Name System (DNS)

The Domain Name System is a hierarchical and decentralized naming system used on the Internet that translates human-readable domain names (like `example.com`) into Internet Protocol (IP) addresses (like `192.0.2.1`). 

**How DNS Works:**
1. User enters a domain name in their browser
2. Resolver queries the DNS hierarchy (root nameserver → TLD nameserver → authoritative nameserver)
3. IP address is returned and cached
4. Browser connects to the web server at that IP

**Current Architecture:**
- **Hierarchical**: Root servers → TLD servers → Authoritative servers
- **Centralized Control**: A small number of organizations control the root zone
- **Caching-Based**: Relies on TTL (Time-To-Live) for record freshness

**Vulnerabilities:**
- Single points of failure at root and TLD levels
- **Cache poisoning** attacks can redirect users to malicious IPs
- **DNS spoofing** through response forgery
- Governmental censorship and domain seizures
- Lack of transparency in domain management
- No cryptographic proof of ownership without DNSSEC

---

### Blockchain Technology

Blockchain is a distributed ledger technology that maintains a continuously growing list of records called blocks, linked using cryptography. Each block contains a cryptographic hash of the previous block, creating an immutable chain.

**Key Properties:**
- **Immutability**: Once data is recorded, it cannot be altered without invalidating the entire chain
- **Decentralization**: No single point of control; maintained by a network of nodes
- **Transparency**: All transactions are visible to network participants
- **Consensus**: Changes require agreement from the network (Proof of Work, Proof of Stake, etc.)

**Why Blockchain for DNS:**
- Eliminates centralized control
- Provides transparent, auditable domain ownership
- Enables censorship-resistant domain registration
- Cryptographic proof of record authenticity
- Automatic enforcement of rules via smart contracts

---

### Ethereum Naming System (ENS)

ENS is a decentralized naming protocol built on Ethereum that enables the registration and management of human-readable domain names pointing to Ethereum addresses and other resources.

**Features:**
- Domain registration via smart contracts
- Reverse resolution (address → name)
- Multi-chain support through CCIP-Read
- Subdomains and NFT integration
- Decentralized governance

**Limitations:**
- Primarily designed for Ethereum addresses, not general DNS records
- Requires external bridges for DNS compatibility
- Limited adoption beyond crypto ecosystem
- High gas fees for registration and updates
- Not a replacement for traditional DNS

---

### Namecoin

Namecoin is a peer-to-peer naming system based on Bitcoin's blockchain, creating an alternative root zone with a `.bit` top-level domain.

**Characteristics:**
- Merge-mined with Bitcoin for security
- Decentralized domain registration and management
- Namespace for arbitrary name-value pairs
- No censorship possible at protocol level

**Limitations:**
- Requires specialized software to resolve `.bit` domains
- Not compatible with standard DNS infrastructure
- Limited adoption due to specialized TLD
- Smaller network compared to Bitcoin
- Difficulty updating records quickly

---

### Handshake

Handshake is a decentralized alternative root zone protocol that aims to replace ICANN's root zone with a blockchain-based system.

**Key Features:**
- Decentralized TLD management via blockchain
- Proof-of-Work consensus for security
- Auctions for TLD ownership
- Compatible with existing DNS at the resolver level
- Community-driven governance

**Current Status:**
- Active mainnet since 2020
- Growing developer community
- Used primarily by crypto/Web3 communities
- Still requires explicit client configuration for resolution
- Limited mainstream adoption

---

### Smart Contracts

A smart contract is a self-executing program stored on a blockchain that automatically executes when predefined conditions are met.

**Solidity Smart Contracts (Ethereum):**
- Written in Solidity programming language
- Compiled to bytecode and deployed to the blockchain
- Execute deterministically on all nodes
- State changes are immutable and transparent
- Gas fees required for execution

**For DNS Applications:**
- Enforce domain ownership rules
- Automate record updates and expiration
- Create decentralized domain marketplaces
- Implement transparent domain transfer mechanisms
- Enable programmable DNS logic

**Example DNS Smart Contract Functions:**
```solidity
function registerDomain(string memory domain)  // Register a new domain
function setRecord(string memory domain, string recordType, string value)  // Update DNS record
function transferDomain(string memory domain, address newOwner)  // Change ownership
function deleteRecord(string memory domain, string recordType)  // Remove a record
```

---

<details>
    <summary><b>External Resources</b></summary>
    <ul>
    <li><a href="https://youtu.be/_7kbJOdAh-Q?si=yFazL7LqBFf1N-6X">Brad talks about the differences between blockchain domains and the traditional DNS.</a></li>
    <li><a href="https://youtu.be/4Q6g64XIs_U?si=Gpy0qfONWSlgHblY">What is blockchain dns and how does it work - Deep Dive Video</a></li>
    <li><a href="https://youtu.be/wMc0H22nyA4?si=OBaUy9HrIfccwwyt">TCP And The Three-Way Handshake Explained Follow-Along Lab</a></li>
    <li><a href="https://docs.ens.domains/registry/eth/">ENS Documentation</a></li>
    <li><a href="https://handshake.org">Handshake</a></li>
    <li><a href="https://github.com/namecoin/ncdns">Namecoin DNS(NCDNS)</a></li>
    <li><a href="https://www.namecoin.org">Namecoin</a></li>
    <li><a href="https://tools.ietf.org/html/rfc1035">RFC 1035 - Domain Names - Implementation and Specification</a></li>
    <li><a href="https://ethereum.org/en/whitepaper/">Ethereum Whitepaper</a></li>
    <li><a href="https://docs.soliditylang.org">Solidity Documentation</a></li>
    </ul>
</details>