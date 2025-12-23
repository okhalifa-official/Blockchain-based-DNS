# Blockchain-based DNS

**Author:** Omar Khalifa

[Background](./Documentation/background.md)
[Existing Solutions](./Documentation/related_work.md)

<details>
    <summary><b>Problem Statement</b></summary>
    <code>
    The Domain Name System (DNS) is the foundational service that maps human-readable domain names to IP addresses, enabling all internet communications. The DNS infrastructure has remained largely centralized, with a small number of root servers and authoritative entities controlling the majority of the namespace. This hierarchical structure introduces several long-standing vulnerabilities: single points of failure, susceptibility to cache poisoning, unauthorized certificate issuance, and the potential for governmental or operator-level censorship.
    </code>
</details>

<details>
    <summary><b>Objectives</b></summary>
    <code>
    Propose a decentralized DNS architecture that leverages blockchain-based smart contracts for domain ownership and record management while maintaining the interperobility with existing DNS ecosystem. We design and implement a proof-of-concept resolver capable of retrieving DNS records from blockchain-backed naming systems as well as performing recursive query on traditional DNS.
    </code>
</details>


### My Contribution
1- Provide blockchain-based DNS that integrates **smart-contract-controlled** domain records with recursive resolver functionality while maintaining the interoperability with existing DNS ecosystem.

2- Comperhensive analysis of prior decentralized naming systems **ENS**, **Handshake**, and **Blockchain-based DNS Storage Frameworks**.

3- Identify gaps in deployability, resolution performance, and data integrity guarantees by developing a PoC resolver capable of interacting with blockchain-backend name records and compare its performance and usability to ENS and Handshake

### Conclusion

This research demonstrates that a decentralized DNS system built on blockchain smart contracts is both technically feasible and operationally viable. By combining the immutability and transparency of blockchain with recursive DNS resolution capabilities, we have shown that it is possible to address key vulnerabilities in the traditional DNS infrastructure:

**Key Findings:**
- **Decentralization Achieved**: Smart contracts provide transparent, censorship-resistant domain management without reliance on centralized authorities
- **Interoperability Maintained**: The hybrid resolver successfully bridges blockchain-backed domains with traditional DNS queries, enabling seamless integration with existing internet infrastructure
- **Performance Acceptable**: Blockchain query response times are competitive with traditional DNS for domain lookups, with caching strategies further improving performance
- **Security Enhanced**: Cryptographic signatures and blockchain immutability provide stronger assurances of DNS record integrity compared to traditional DNSSEC

**Comparison with Alternatives:**
- **vs ENS**: Our solution provides full recursive resolver implementation and DNS ecosystem compatibility, which ENS lacks
- **vs Handshake**: We maintain compatibility with traditional DNS while offering smart contract-based record management
- **vs Namecoin**: Broader record type support and modern resolver architecture outperform legacy systems

**Proof-of-Concept Success:**
The implemented resolver demonstrates successful:
- Domain registration and management via smart contracts
- Record retrieval from blockchain with TTL support
- Recursive queries to traditional DNS for non-blockchain domains
- In-memory caching for improved performance
- Multi-record type support (A, AAAA, CNAME, TXT, MX, etc.)

---

### Future Work

**Short-term Improvements (6-12 months):**
1. **Production Hardening**
   - Security audit by professional firm
   - Fuzzing and stress testing
   - Rate limiting and DDoS protection
   - Enhanced error handling and recovery mechanisms

2. **Performance Optimization**
   - Implement distributed caching (Redis)
   - Optimize contract gas efficiency
   - Add query result batching
   - Implement DNS-over-HTTPS (DoH) endpoint

3. **Feature Expansion**
   - Domain expiration and renewal mechanism
   - Registration fee system with revenue distribution
   - Sub-domain support
   - DNSSEC integration for hybrid zones

**Medium-term Expansion (1-2 years):**
1. **Multi-chain Support**
   - Deploy to Layer 2 solutions (Arbitrum, Optimism, Polygon)
   - Cross-chain messaging for distributed resolution
   - Chain-agnostic domain identifiers

2. **Governance Framework**
   - Decentralized Autonomous Organization (DAO) for TLD management
   - Community voting on protocol upgrades
   - Transparent fee management

3. **Enterprise Integration**
   - Corporate domain registration systems
   - API gateway for third-party services
   - Bulk domain management tools
   - SLA guarantees and monitoring

**Long-term Vision (2+ years):**
1. **Adoption and Scale**
   - Integration with major browsers for .blockchain TLD resolution
   - Widespread adoption by Web3 communities
   - Plugin ecosystem for resolver extensions

2. **Advanced Features**
   - Machine learning-based threat detection
   - Privacy-preserving query protocols
   - Quantum-resistant cryptography preparation
   - Zero-knowledge proof verification for records

3. **Research Directions**
   - Impact analysis on DNS ecosystem
   - Incentive mechanism studies
   - Scalability limits investigation
   - Economic models for domain pricing

**Open Challenges:**
- Balancing decentralization with performance
- Ensuring backward compatibility as the protocol evolves
- Managing regulatory compliance across jurisdictions
- Preventing domain squatting and cybersquatting
- Achieving network effects for widespread adoption



### References

**Blockchain Based DNS and PKI Solutions**
Karaarslan, E., & Adiguzel, E. (2018). Blockchain based DNS and PKI solutions. IEEE Communications Standards Magazine, 2(3), 52-57.

**B-DNS A Secure and Efficient DNS Based on the Blockchain Technology**
Li, Z., Gao, S., Peng, Z., Guo, S., Yang, Y., & Xiao, B. (2021). B-DNS: A secure and efficient DNS based on the blockchain technology. IEEE Transactions on Network Science and Engineering, 8(2), 1674-1686.

**A Data Storage Method Based on Blockchain for Decentralization DNS**
Liu, J., Li, B., Chen, L., Hou, M., Xiang, F., & Wang, P. (2018, June). A data storage method based on blockchain for decentralization DNS. In 2018 IEEE Third International Conference on Data Science in Cyberspace (DSC) (pp. 189-196). IEEE.