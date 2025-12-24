## Existing Solutions

**DNSSec**
<br>
Introduces cryptographic signatures to authenticate DNS records and mitigate cache-poisining attacks.

> ! DNSSec adoption remains limited, and it doesn't address the fundamental issue of centralized authority at the root level.

**Resolver-side mitigations (source port randomization, increased transaction-ID entropy, heuristics for validating responses)**
<br>
Can reduce certain spoofing vectors.

> ! They don't eliminate single points of failure or prevent intentional censorship.

**DecDNS**
<br>
Construct multiple parallel nodes that store root file information on a blockchain. The system uses hash-based storage mechanism.

> ! Doesn't implement a full resolver pipeline or address real-time resolution resolver. Only focuses on Zone file storage and synchronization

**B-DNS**
<br>
Leverages hierarchical multi-chain structure to decentralize TLD management and domain record updates. Incorprates **Smart Contracts** to enforce ownership and update rules and uses **Blockchain consensus** to secure changes to DNS data.

> ! It remains conceptual. No operational resolver implementation. No resolver performance evaluation, latency, or deployability. Interoperability with legacy DNS is not addressed.

**Namecoin**
<br>
Stores **.bit** domain registrations directly on its blockchain.

> ! Restricted adoption due to the absence of compatibility with the DNS Hierarchy and reliance on specialized TLD.

**Ethereum Naming System (ENS)**
<br>
Provides human-readable names mapped to **Ethereum** addresses and resources via **smart contracts**.

> ! Requires external bridges for DNS compatibility.

**Handshake**
<br>
Decentralized alternative root zone where ownership of TLDs is secured through blockchain.

> ! Doesn't integrate with existing recursive resolvers. Deployment complexity and lack of widespread recursive support.
